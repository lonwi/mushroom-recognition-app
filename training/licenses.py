"""Accept only CC0 and CC-BY media licenses.

NC, ND, SA, all-rights-reserved, and missing licenses are rejected.
The decision uses the media item's own license string. A CC-BY record
must not launder a photo whose media license is stricter or absent.
"""

from __future__ import annotations

import ipaddress
import re
import socket
import unicodedata
import urllib.parse

_REJECT_TOKENS = (
    "by-nc",
    "by-sa",
    "by-nd",
    "noncommercial",
    "non-commercial",
    "sharealike",
    "share-alike",
    "all rights reserved",
    "all-rights-reserved",
)

_CC_URL = re.compile(
    r"creativecommons\.org/(publicdomain/zero|licenses/[a-z0-9-]+)/(\d+\.\d+)",
    re.IGNORECASE,
)

# Attribution text stored from GBIF. Long enough for a collector list or a
# source URL, short enough that a record cannot dump megabytes into the journal.
_ATTRIBUTION_LIMIT = 2048
_SHARED_ADDRESS_SPACE = ipaddress.ip_network("100.64.0.0/10")


class UnsafeMediaUrl(ValueError):
    """A media URL that must not be fetched."""


def _clean_attribution(value: object, *, limit: int = _ATTRIBUTION_LIMIT) -> str:
    """Drop control and format characters, then cap the length."""
    if value is None:
        return ""
    text = value if isinstance(value, str) else str(value)
    kept: list[str] = []
    for char in text:
        category = unicodedata.category(char)
        if category in ("Cc", "Cf"):
            continue
        kept.append(char)
    cleaned = "".join(kept).strip()
    if len(cleaned) > limit:
        return cleaned[:limit]
    return cleaned


def _blocked_address(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True for addresses that are not public unicast destinations."""
    mapped = getattr(address, "ipv4_mapped", None)
    if mapped is not None:
        address = mapped
    if (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    ):
        return True
    return address.version == 4 and address in _SHARED_ADDRESS_SPACE


def validate_media_url(url: str) -> None:
    """Allow only http(s) URLs whose resolved addresses are public.

    DNS failure is raised as ``socket.gaierror`` so a download can retry it.
    A confirmed private, loopback, link-local, reserved, multicast, or
    unspecified address is ``UnsafeMediaUrl`` and is not retried.
    """
    if not isinstance(url, str) or not url or len(url) > 8192:
        raise UnsafeMediaUrl("media URL must be an http(s) URL")
    if any(unicodedata.category(char) in ("Cc", "Cf") for char in url):
        raise UnsafeMediaUrl("media URL contains a control character")
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise UnsafeMediaUrl("media URL scheme must be http or https")
    host = parsed.hostname
    if not host:
        raise UnsafeMediaUrl("media URL must include a host")
    try:
        port = parsed.port
    except ValueError as error:
        raise UnsafeMediaUrl("media URL has an invalid port") from error
    try:
        infos = socket.getaddrinfo(host, port or 0, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise
    if not infos:
        raise UnsafeMediaUrl(f"media URL host did not resolve: {host}")
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            raise UnsafeMediaUrl(f"media URL host did not resolve: {host}")
        literal = str(sockaddr[0]).split("%", 1)[0]
        try:
            address = ipaddress.ip_address(literal)
        except ValueError as error:
            raise UnsafeMediaUrl(f"media URL host did not resolve: {host}") from error
        if _blocked_address(address):
            raise UnsafeMediaUrl("media URL resolved to a non-public address")


def normalize_cc_license(raw: str | None) -> str | None:
    """Return 'cc0-1.0' or 'cc-by-4.0' style ids, or None when the photo is unusable."""
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if not text:
        return None
    if any(token in text for token in _REJECT_TOKENS):
        return None
    match = _CC_URL.search(text)
    if not match:
        return None
    kind, version = match.group(1).lower(), match.group(2)
    if kind == "publicdomain/zero":
        return f"cc0-{version}"
    code = kind.split("/", 1)[1]
    if code != "by":
        return None
    return f"cc-by-{version}"


def accepted_media_records(occurrence: dict) -> list[dict]:
    """Yield GBIF media entries whose own license is CC0 or CC-BY."""
    accepted: list[dict] = []
    occurrence_key = occurrence.get("key")
    for index, media in enumerate(occurrence.get("media") or []):
        if media.get("type") not in (None, "StillImage"):
            continue
        identifier = media.get("identifier")
        if not isinstance(identifier, str) or not identifier:
            continue
        try:
            validate_media_url(identifier)
        except UnsafeMediaUrl:
            continue
        except socket.gaierror:
            # Unresolved is not a private address. The download retries DNS.
            pass
        normalized = normalize_cc_license(media.get("license"))
        if normalized is None:
            continue
        accepted.append(
            {
                "occurrence_key": occurrence_key,
                "media_index": index,
                "image_url": identifier,
                "license": _clean_attribution(media.get("license")),
                "license_normalized": normalized,
                "creator": _clean_attribution(
                    media.get("creator")
                    or media.get("rightsHolder")
                    or occurrence.get("rightsHolder")
                    or occurrence.get("recordedBy")
                    or ""
                ),
                "rights_holder": _clean_attribution(
                    media.get("rightsHolder") or occurrence.get("rightsHolder") or ""
                ),
                "source_url": _clean_attribution(
                    media.get("references") or occurrence.get("references") or ""
                ),
                "gbif_occurrence": _clean_attribution(
                    f"https://www.gbif.org/occurrence/{occurrence_key}"
                ),
                "scientific_name": _clean_attribution(occurrence.get("scientificName") or ""),
                "country": _clean_attribution(occurrence.get("country") or ""),
                "dataset": _clean_attribution(
                    occurrence.get("datasetName") or occurrence.get("datasetKey") or ""
                ),
                "recorded_by": _clean_attribution(occurrence.get("recordedBy") or ""),
                "decimal_latitude": occurrence.get("decimalLatitude"),
                "decimal_longitude": occurrence.get("decimalLongitude"),
                "event_date": _clean_attribution(occurrence.get("eventDate") or ""),
            }
        )
    return accepted
