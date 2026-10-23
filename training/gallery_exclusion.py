"""Atlas gallery photos must not land in the test split.

The checked-in list stores each gallery image URL and, for iNaturalist,
the observation id. A training row matches when:

* its image URL is that file, including another iNaturalist host for the
  same photo id (GBIF often mirrors the bytes);
* its ``mo_observation_id`` is a listed Mushroom Observer id or the same
  digits as a listed iNaturalist observation;
* a field on the row references that iNaturalist observation.

Matching rows stay in train or val. ``prepare_data`` passes this predicate
into the split. Thresholds and ship gates are unchanged.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

EXCLUSION_PATH = Path(__file__).resolve().parent / "gallery_exclusion.json"

_INAT_PHOTO = re.compile(
    r"(?:static\.inaturalist\.org|inaturalist-open-data\.s3\.amazonaws\.com|inaturalist\.org)/photos/(\d+)",
    re.IGNORECASE,
)
_INAT_OBS = re.compile(r"inaturalist\.org/observations/(\d+)", re.IGNORECASE)
_MO_OBS = re.compile(
    r"mushroomobserver\.org/(?:observations/|observer/show_observation/)(\d+)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class GalleryExclusion:
    image_urls: frozenset[str]
    photo_ids: frozenset[str]
    inat_ids: frozenset[str]
    mo_ids: frozenset[str]


def canonical_url(url: str) -> str:
    text = url.strip().split("#", 1)[0].split("?", 1)[0]
    if text.endswith("/"):
        text = text[:-1]
    parts = urlsplit(text)
    if not parts.scheme or not parts.netloc:
        return text
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, "", ""))


def load_gallery_exclusion(path: Path | None = None) -> GalleryExclusion:
    file = path or EXCLUSION_PATH
    payload = json.loads(file.read_text(encoding="utf-8"))
    photos = payload.get("photos")
    if not isinstance(photos, list) or not photos:
        raise ValueError(f"{file} has no gallery photos")
    image_urls: set[str] = set()
    photo_ids: set[str] = set()
    inat_ids: set[str] = set()
    mo_ids: set[str] = set()
    for row in photos:
        if not isinstance(row, dict):
            raise ValueError(f"{file} photo rows must be objects")
        image_url = row.get("image_url")
        if not isinstance(image_url, str) or not image_url.strip():
            raise ValueError(f"{file} photo is missing image_url")
        image_urls.add(canonical_url(image_url))
        photo_ids.update(_INAT_PHOTO.findall(image_url))
        inat_photo = row.get("inaturalist_photo_url")
        if isinstance(inat_photo, str) and inat_photo.strip():
            image_urls.add(canonical_url(inat_photo))
            photo_ids.update(_INAT_PHOTO.findall(inat_photo))
        inat = row.get("inaturalist_observation_id")
        if isinstance(inat, str) and inat.strip():
            inat_ids.add(inat.strip())
        mo = row.get("mo_observation_id")
        if isinstance(mo, str) and mo.strip():
            mo_ids.add(mo.strip())
    return GalleryExclusion(
        image_urls=frozenset(image_urls),
        photo_ids=frozenset(photo_ids),
        inat_ids=frozenset(inat_ids),
        mo_ids=frozenset(mo_ids),
    )


def _image_match(value: object, exclusion: GalleryExclusion) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    if canonical_url(value) in exclusion.image_urls:
        return True
    return any(photo_id in exclusion.photo_ids for photo_id in _INAT_PHOTO.findall(value))


def _mentions_inaturalist(record: dict) -> bool:
    for value in record.values():
        if isinstance(value, str) and "inaturalist" in value.casefold():
            return True
    return False


def _observation_ids(record: dict, exclusion: GalleryExclusion) -> set[str]:
    found: set[str] = set()
    for value in record.values():
        if not isinstance(value, str):
            continue
        found.update(item for item in _INAT_OBS.findall(value) if item in exclusion.inat_ids)
        found.update(item for item in _MO_OBS.findall(value) if item in exclusion.mo_ids)
    explicit = record.get("inaturalist_observation_id")
    if explicit is not None and not isinstance(explicit, bool):
        text = str(explicit).strip()
        if text in exclusion.inat_ids:
            found.add(text)
    catalog = record.get("catalogNumber")
    if catalog is not None and not isinstance(catalog, bool) and _mentions_inaturalist(record):
        text = str(catalog).strip()
        if text in exclusion.inat_ids:
            found.add(text)
    return found


def record_matches_gallery(record: dict, exclusion: GalleryExclusion) -> bool:
    """True when this training row is a gallery photo or the same observation."""
    for key in ("image_url", "identifier"):
        if _image_match(record.get(key), exclusion):
            return True
    mo = record.get("mo_observation_id")
    if mo is not None and not isinstance(mo, bool):
        text = str(mo).strip()
        if text and (text in exclusion.mo_ids or text in exclusion.inat_ids):
            return True
    return bool(_observation_ids(record, exclusion))


_LOADED: GalleryExclusion | None = None


def gallery_test_blocked(record: dict) -> bool:
    """Predicate for ``split_by_observation`` using the checked-in list."""
    global _LOADED
    if _LOADED is None:
        _LOADED = load_gallery_exclusion()
    return record_matches_gallery(record, _LOADED)
