"""Checks for GBIF media URLs.

Listing uses :func:`validate_media_url_syntax` only: scheme, host, and port
80 or 443. No DNS. The public-address check runs when a photo is downloaded,
so a resolver that answers public names with non-public addresses shows up
as failed attempts instead of a smaller cached licence pool.

Hardening limitation: the address check and the TCP connection are not the
same lookup. ``urllib`` resolves the host again, and an HTTP or HTTPS proxy
in the environment can connect to a different address than the one that was
checked. A DNS change between the check and the socket, or a proxy, can
bypass this. The validated IP is not pinned, and the original Host and SNI
are left for urllib to send on its own connection.
"""

from __future__ import annotations

import ipaddress
import socket
import unicodedata
import urllib.parse

from licenses import accepted_media_records

# Attribution text stored from GBIF. Long enough for a collector list or a
# source URL, short enough that a record cannot dump megabytes into the journal.
_ATTRIBUTION_LIMIT = 2048
_SHARED_ADDRESS_SPACE = ipaddress.ip_network("100.64.0.0/10")
_ATTRIBUTION_FIELDS = (
    "license",
    "creator",
    "rights_holder",
    "source_url",
    "gbif_occurrence",
    "scientific_name",
    "country",
    "dataset",
    "recorded_by",
    "event_date",
)


class UnsafeMediaUrl(ValueError):
    """A media URL that must not be fetched."""


def clean_attribution(value: object, *, limit: int = _ATTRIBUTION_LIMIT) -> str:
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


def validate_media_url_syntax(url: str) -> None:
    """Allow only http(s) URLs on port 80 or 443. Does not resolve the host."""
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
    if port is not None and port not in (80, 443):
        raise UnsafeMediaUrl("media URL port must be 80 or 443")


def force_https_url(url: str) -> str:
    """Rewrite an http URL to https. Other schemes are left unchanged.

    Port 80 and an explicit port 443 are dropped so the result is https on
    the default port. A non-http URL is not rewritten into something fetchable.
    """
    if not isinstance(url, str):
        return url
    text = url.strip()
    if text.startswith("//"):
        text = "https:" + text
    parts = urllib.parse.urlsplit(text)
    scheme = parts.scheme.lower()
    if scheme == "https":
        if parts.scheme == "https":
            return text
        return urllib.parse.urlunsplit(("https", parts.netloc, parts.path, parts.query, parts.fragment))
    if scheme != "http":
        return text
    host = parts.hostname
    if not host:
        return text
    try:
        port = parts.port
    except ValueError:
        return text
    if ":" in host:
        host = f"[{host}]"
    auth = ""
    if parts.username:
        auth = parts.username
        if parts.password:
            auth += f":{parts.password}"
        auth += "@"
    if port in (None, 80, 443):
        netloc = f"{auth}{host}"
    else:
        netloc = f"{auth}{host}:{port}"
    return urllib.parse.urlunsplit(("https", netloc, parts.path, parts.query, parts.fragment))


def validate_media_url(url: str) -> None:
    """Syntax check, then reject a host that resolves to a non-public address.

    DNS failure is raised as ``socket.gaierror`` so a download can retry it.
    A confirmed private, loopback, link-local, reserved, multicast, or
    unspecified address is ``UnsafeMediaUrl`` and is not retried.

    See the module docstring: urllib resolves again after this returns, and
    a proxy is not covered.
    """
    validate_media_url_syntax(url)
    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname
    port = parsed.port
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


def listed_media_records(occurrence: dict) -> list[dict]:
    """Licensed rows whose URL is syntactically fetchable, with cleaned attribution.

    Private addresses are not decided here. That check is at download time.
    """
    accepted: list[dict] = []
    for row in accepted_media_records(occurrence):
        identifier = row.get("image_url")
        try:
            validate_media_url_syntax(identifier if isinstance(identifier, str) else "")
        except UnsafeMediaUrl:
            continue
        cleaned = dict(row)
        for field in _ATTRIBUTION_FIELDS:
            if field in cleaned:
                cleaned[field] = clean_attribution(cleaned[field])
        accepted.append(cleaned)
    return accepted
