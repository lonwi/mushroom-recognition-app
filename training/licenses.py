"""Accept only CC0 and CC-BY media licenses.

NC, ND, SA, all-rights-reserved, and missing licenses are rejected.
The decision uses the media item's own license string. A CC-BY record
must not launder a photo whose media license is stricter or absent.
"""

from __future__ import annotations

import re

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
        if not identifier:
            continue
        normalized = normalize_cc_license(media.get("license"))
        if normalized is None:
            continue
        accepted.append(
            {
                "occurrence_key": occurrence_key,
                "media_index": index,
                "image_url": identifier,
                "license": media.get("license"),
                "license_normalized": normalized,
                "creator": (
                    media.get("creator")
                    or media.get("rightsHolder")
                    or occurrence.get("rightsHolder")
                    or occurrence.get("recordedBy")
                    or ""
                ),
                "rights_holder": media.get("rightsHolder") or occurrence.get("rightsHolder") or "",
                "source_url": media.get("references") or occurrence.get("references") or "",
                "gbif_occurrence": f"https://www.gbif.org/occurrence/{occurrence_key}",
                "scientific_name": occurrence.get("scientificName") or "",
                "country": occurrence.get("country") or "",
                "dataset": occurrence.get("datasetName") or occurrence.get("datasetKey") or "",
            }
        )
    return accepted
