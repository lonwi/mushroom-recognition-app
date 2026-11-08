"""Atlas gallery photos must not land in the test split.

The checked-in list stores each gallery image URL and, for iNaturalist,
the observation id. CSV exports of the atlas gallery (``image_url``,
``source_url``, ``mo_observation_id``) are accepted the same way. A training
row matches when:

* its image URL is that file, including another iNaturalist host for the
  same photo id (GBIF often mirrors the bytes);
* its ``mo_observation_id`` is a listed Mushroom Observer id or the same
  digits as a listed iNaturalist observation;
* a field on the row references that iNaturalist observation, including the
  observation number parsed from ``source_url``.

Matching rows stay in train or val. After the split, a match that is still
in test raises ``GalleryLeakError`` and the pipeline stops. Thresholds and
ship gates are unchanged.
"""

from __future__ import annotations

import csv
import json
import os
import re
from collections.abc import Mapping
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


class GalleryLeakError(RuntimeError):
    """A test-split row matches an atlas gallery photo. The run stops."""


def merge_gallery_exclusions(*parts: GalleryExclusion) -> GalleryExclusion:
    if not parts:
        raise ValueError("no gallery exclusions to merge")
    return GalleryExclusion(
        image_urls=frozenset().union(*(part.image_urls for part in parts)),
        photo_ids=frozenset().union(*(part.photo_ids for part in parts)),
        inat_ids=frozenset().union(*(part.inat_ids for part in parts)),
        mo_ids=frozenset().union(*(part.mo_ids for part in parts)),
    )


def _require_https(url: str, label: str, source: Path) -> None:
    if not url.lower().startswith("https://"):
        raise ValueError(f"{source} {label} must be an https URL, got {url!r}")


def load_gallery_csv(path: Path) -> GalleryExclusion:
    """Load atlas gallery rows. ``image_url`` and ``source_url`` must be https.

    ``mo_observation_id`` and the iNaturalist observation number in
    ``source_url`` are recorded so a training row of the same observation
    matches even when the bytes live at another URL.
    """
    file = Path(path)
    if not file.is_file():
        raise ValueError(f"gallery CSV not found: {file}")
    with file.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        if "image_url" not in fieldnames:
            raise ValueError(f"{file} gallery CSV needs an image_url column")
        rows = [row for row in reader if any((value or "").strip() for value in row.values())]
    if not rows:
        raise ValueError(f"{file} gallery CSV has no photos")
    image_urls: set[str] = set()
    photo_ids: set[str] = set()
    inat_ids: set[str] = set()
    mo_ids: set[str] = set()
    for row in rows:
        image_url = (row.get("image_url") or "").strip()
        if not image_url:
            raise ValueError(f"{file} photo is missing image_url")
        _require_https(image_url, "image_url", file)
        image_urls.add(canonical_url(image_url))
        photo_ids.update(_INAT_PHOTO.findall(image_url))
        source = (row.get("source_url") or "").strip()
        if source:
            _require_https(source, "source_url", file)
            inat_ids.update(_INAT_OBS.findall(source))
            mo_ids.update(_MO_OBS.findall(source))
        explicit = (row.get("inaturalist_observation_id") or "").strip()
        if explicit:
            inat_ids.add(explicit)
        mo = (row.get("mo_observation_id") or "").strip()
        if mo and mo.casefold() not in {"none", "null"}:
            mo_ids.add(mo)
    return GalleryExclusion(
        image_urls=frozenset(image_urls),
        photo_ids=frozenset(photo_ids),
        inat_ids=frozenset(inat_ids),
        mo_ids=frozenset(mo_ids),
    )


def gallery_csv_paths(
    cli_paths: list[str] | None = None,
    config_path: str | None = None,
    environ: Mapping[str, str] | None = None,
) -> list[Path]:
    """CSV paths from a JSON config, ``GRZYBOBRANIE_GALLERY_CSV``, and the CLI.

    Config entries are relative to the config file. The environment variable
    is ``os.pathsep``-separated. A path that does not exist is an error.
    """
    env = os.environ if environ is None else environ
    paths: list[Path] = []
    if config_path:
        config = Path(config_path)
        if not config.is_file():
            raise ValueError(f"gallery config not found: {config}")
        payload = json.loads(config.read_text(encoding="utf-8"))
        raw = payload.get("gallery_csvs") if isinstance(payload, dict) else None
        if not isinstance(raw, list):
            raise ValueError(f"{config} needs a gallery_csvs list")
        for item in raw:
            candidate = Path(str(item))
            if not candidate.is_absolute():
                candidate = config.parent / candidate
            paths.append(candidate)
    raw_env = env.get("GRZYBOBRANIE_GALLERY_CSV") or ""
    if raw_env.strip():
        for item in raw_env.split(os.pathsep):
            if item.strip():
                paths.append(Path(item.strip()).expanduser())
    for item in cli_paths or []:
        if str(item).strip():
            paths.append(Path(str(item).strip()).expanduser())
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise ValueError("gallery CSV not found: " + ", ".join(missing))
    return paths


def load_pipeline_exclusion(csv_paths: list[Path] | None = None, json_path: Path | None = None) -> GalleryExclusion:
    """Checked-in gallery list plus any CSV paths passed on the CLI or in config."""
    parts = [load_gallery_exclusion(json_path)]
    for path in csv_paths or []:
        parts.append(load_gallery_csv(path))
    return merge_gallery_exclusions(*parts)


def assert_gallery_absent_from_test(splits: dict[str, list[dict]], exclusion: GalleryExclusion) -> None:
    """Fail the run when any test row is an atlas gallery photo."""
    leaks = [row for row in splits.get("test") or [] if record_matches_gallery(row, exclusion)]
    if not leaks:
        return
    examples = []
    for row in leaks[:5]:
        examples.append(str(row.get("image_url") or row.get("source_url") or row.get("mo_observation_id") or ""))
    raise GalleryLeakError(
        f"Gallery exclusion failed: {len(leaks)} test image(s) match the atlas gallery "
        f"and the pipeline stops. Examples: {examples}"
    )
