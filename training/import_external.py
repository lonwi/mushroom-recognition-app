"""Import external per-species photo CSVs into the training dataset format.

The GBIF fetch in ``fetch_gbif.py`` still accepts only CC0 and CC-BY media
URLs. This script is the separate path for tabular lists (iNaturalist, GBIF,
Wikimedia Commons, Danish Fungi 2020). It does not download images.

    python training/import_external.py /path/to/zdjecia --output training/data/external.jsonl

``usage`` is ``publishable`` for versioned CC0 and CC BY, and ``training_only``
for versioned CC BY-NC and for DF20. Every photo row needs an https
``license_url`` that names the same license as the text. An empty URL, an
``http://`` URL, or a URL for a different license drops the row, including
when the text already says ``CC BY 4.0``. A versionless ``CC BY`` with no
``license_url`` is rejected. NC-ND, NC-SA, BY-SA, ND, and unknown licenses
are rejected. The normalized id is matched in full (``cc-by-4.0``), never by
prefix. The same photo from two sources keeps the stricter license, so CC
BY-NC beats CC BY and the row stays training-only. Every kept row has an
author credit. ``is_publishable`` is the check for the atlas gallery,
``site/``, and comparison photos. CC BY-NC and DF20 fail it. The ship-gate
file is a separate decision and still lists training-only rows.

``_niezweryfikowane`` files set ``unverified``. ``prepare_data.py`` skips
those rows, so they are not mixed into train, val, or test.

``--max-per-collector`` limits how many photos one observer or author can
contribute to one class. Observation and photo ids are kept so a later
split can group by observer and deduplicate by id.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from manifest import ROOT, load_manifest
from url_safety import force_https_url

DATA_DIR = ROOT / "training" / "data"
DEFAULT_OUTPUT = DATA_DIR / "external.jsonl"
DEFAULT_REPORT = DATA_DIR / "external_report.json"
DEFAULT_MAX_PER_COLLECTOR = 30

# Names the photo tables use for a taxon the manifest stores under the accepted name.
_SPECIES_ALIASES = {
    "inocybe erubescens": "Inosperma erubescens",
    "inocybe patouillardii": "Inosperma erubescens",
    "boletus subtomentosus": "Xerocomus subtomentosus",
    "boletus badius": "Xerocomus badius",
}

_CC_URL = re.compile(
    r"creativecommons\.org/(publicdomain/zero|licenses/([a-z0-9-]+))/(\d+\.\d+)",
    re.IGNORECASE,
)
_VERSION = re.compile(r"(\d+\.\d+)")
_HTTP_URL = re.compile(r"https?://\S+", re.IGNORECASE)
# Longest code first. Equality is the whole token list, so "by-sa" is not "by".
_CODE_PHRASES = (
    ("by-nc-nd", ("by", "nc", "nd")),
    ("by-nc-sa", ("by", "nc", "sa")),
    ("by-nd", ("by", "nd")),
    ("by-sa", ("by", "sa")),
    ("by-nc", ("by", "nc")),
    ("by", ("by",)),
    ("nc", ("nc",)),
    ("nd", ("nd",)),
    ("sa", ("sa",)),
)
_SKIP_TOKENS = {
    "cc",
    "creative",
    "commons",
    "license",
    "licence",
    "international",
    "unported",
    "legalcode",
    "deed",
}
_KNOWN_TOKENS = {"by", "nc", "nd", "sa", "zero", "public", "domain", "publicdomain", "cc0"}
# Whole ids only. CC BY-SA is absent on purpose: add ``cc-by-sa-<version>``
# here with ``training_only`` if the owner later allows it. Do not prefix-match.
_EXACT_LICENSE_USAGE = {
    "cc0-1.0": "publishable",
    "cc-by-1.0": "publishable",
    "cc-by-2.0": "publishable",
    "cc-by-2.5": "publishable",
    "cc-by-3.0": "publishable",
    "cc-by-4.0": "publishable",
    "cc-by-nc-1.0": "training_only",
    "cc-by-nc-2.0": "training_only",
    "cc-by-nc-2.5": "training_only",
    "cc-by-nc-3.0": "training_only",
    "cc-by-nc-4.0": "training_only",
}
_GBIF_OCCURRENCE = re.compile(r"gbif\.org/occurrence/(\d+)", re.IGNORECASE)
_INAT_OBSERVATION = re.compile(r"inaturalist\.org/observations/(\d+)", re.IGNORECASE)
_INAT_PHOTO = re.compile(r"/photos/(\d+)", re.IGNORECASE)
_UNVERIFIED_CONFIDENCE = {"gbif_not_validated", "commons_category"}
_PHOTO_FIELDS = (
    "species",
    "image_url",
    "author",
    "license",
    "source_url",
    "mo_observation_id",
    "id_confidence",
    "inat_photo_id",
    "inat_observation_id",
    "commons_file",
    "inat_observer",
)


def parse_textual_license(raw: str | None, license_url: str | None = None) -> dict | None:
    """Parse a photo license cell, optionally completed by ``license_url``.

    Returns ``license_normalized`` and ``usage`` (``publishable`` or
    ``training_only``). The id is an exact key such as ``cc-by-4.0``.
    ``cc-by-sa-4.0`` is not ``cc-by-4.0``, and ``cc-by-nc-sa-4.0`` is not
    ``cc-by-nc-4.0``. An empty or unknown cell is None and is never read as
    CC BY, even when ``license_url`` points at CC BY. A versionless ``CC BY``
    or ``CC BY-NC`` takes the version from ``license_url`` when that URL is
    the same license. If neither side has a version, the row is rejected.
    CC0 without a version is ``cc0-1.0``, the only CC0 version. This does not
    change the GBIF URL filter.
    """
    if raw is None or not str(raw).strip():
        return None
    code, version = _code_from_text(str(raw))
    if code is None:
        return None
    if license_url is not None and str(license_url).strip():
        url_code, url_version = _code_from_text(str(license_url))
        if url_code is not None and url_code != code:
            return None
        if url_version and version and url_version != version:
            return None
        if url_code is not None:
            version = version or url_version
    if code == "cc0":
        if version not in (None, "1.0"):
            return None
        license_id = "cc0-1.0"
    elif not version:
        return None
    else:
        license_id = f"cc-{code}-{version}"
    usage = _EXACT_LICENSE_USAGE.get(license_id)
    if usage is None:
        return None
    return {"license_normalized": license_id, "usage": usage}


def _https_license_url(license_url: str) -> bool:
    return urlsplit(license_url).scheme.lower() == "https"


def photo_license_decision(license_text: str, license_url: str) -> tuple[dict | None, str]:
    """Accept a photo only when ``license_url`` is https and matches the text.

    An empty URL and an ``http://`` URL are rejected even if the text already
    contains a version. A URL whose license code or version disagrees with
    the text is ``license_url_mismatch``. Empty or unknown text stays
    ``license`` and is never promoted by the URL.
    """
    text = license_text.strip()
    url = license_url.strip()
    if not text:
        return None, "license"
    if not url:
        return None, "license_url_empty"
    if not _https_license_url(url):
        return None, "license_url_not_https"
    text_code, text_version = _code_from_text(text)
    url_code, url_version = _code_from_text(url)
    if text_code is None:
        return None, "license"
    if url_code is None or url_code != text_code:
        return None, "license_url_mismatch"
    if text_version and url_version and text_version != url_version:
        return None, "license_url_mismatch"
    if text_version and not url_version:
        return None, "license_url_mismatch"
    decision = parse_textual_license(text, url)
    if decision is None:
        return None, "license"
    return decision, ""


def _from_url_match(match: re.Match) -> tuple[str | None, str]:
    kind = match.group(1).lower()
    version = match.group(3)
    if kind == "publicdomain/zero":
        return "cc0", version
    code = (match.group(2) or "").lower()
    return (code or None), version


def _code_from_text(raw: str) -> tuple[str | None, str | None]:
    """License code and version from prose or a Creative Commons URL.

    The code is the whole phrase (``by-nc-sa``, not a prefix of it).
    """
    text = raw.strip().lower().replace("–", "-").replace("—", "-")
    if not text:
        return None, None
    url_match = _CC_URL.search(text)
    url_code: str | None = None
    url_version: str | None = None
    if url_match:
        url_code, url_version = _from_url_match(url_match)
    prose = _HTTP_URL.sub(" ", text)
    token_code, token_version = _code_from_tokens(prose)
    if token_code and url_code and token_code != url_code:
        return None, None
    if token_version and url_version and token_version != url_version:
        return None, None
    return token_code or url_code, token_version or url_version


def _code_from_tokens(text: str) -> tuple[str | None, str | None]:
    if not text.strip():
        return None, None
    version_match = _VERSION.search(text)
    version = version_match.group(1) if version_match else None
    body = text.replace(version, " ") if version else text
    raw_tokens = [token for token in re.split(r"[^a-z0-9]+", body) if token]
    mapped: list[str] = []
    index = 0
    while index < len(raw_tokens):
        token = raw_tokens[index]
        if token in _SKIP_TOKENS:
            index += 1
            continue
        if token == "non" and index + 1 < len(raw_tokens) and raw_tokens[index + 1].startswith("commercial"):
            mapped.append("nc")
            index += 2
            continue
        if token in {"noncommercial", "noncommercialuse"}:
            mapped.append("nc")
            index += 1
            continue
        if token == "attribution":
            mapped.append("by")
            index += 1
            continue
        if token in {"noderivs", "noderivatives", "noderivative"}:
            mapped.append("nd")
            index += 1
            continue
        if token == "sharealike":
            mapped.append("sa")
            index += 1
            continue
        if token == "share" and index + 1 < len(raw_tokens) and raw_tokens[index + 1] == "alike":
            mapped.append("sa")
            index += 2
            continue
        mapped.append(token)
        index += 1
    if any(token not in _KNOWN_TOKENS for token in mapped):
        return None, None
    if "cc0" in mapped or ("zero" in mapped and "public" in mapped and "domain" in mapped):
        return "cc0", version
    if not re.search(r"\bcc\b", text) and "creativecommons" not in text and "cc0" not in mapped:
        return None, None
    core = tuple(token for token in mapped if token in {"by", "nc", "nd", "sa"})
    for name, phrase in _CODE_PHRASES:
        if core == phrase:
            return name, version
    return None, None


def exact_license_usage(license_id: object) -> str | None:
    """``publishable`` or ``training_only`` when ``license_id`` is an exact known id."""
    if not isinstance(license_id, str):
        return None
    return _EXACT_LICENSE_USAGE.get(license_id)


def training_eligible(row: dict, *, publishable_only: bool = False) -> bool:
    """False for unverified rows, and for training-only rows when asked.

    ``publishable_only`` is the one switch that drops CC BY-NC and DF20
    together (``usage == "training_only"``).
    """
    if row.get("unverified") is True:
        return False
    if publishable_only and row.get("usage") == "training_only":
        return False
    return True


def is_publishable(row: dict) -> bool:
    """True for a credited, verified, versioned CC0 or CC BY row.

    Atlas gallery photos, ``site/`` pages, and comparison photos (issue #65)
    must use this. The license id has to be an exact publishable key such as
    ``cc-by-4.0`` or ``cc0-1.0``, the row has to be verified, and the image
    URL has to be https. CC BY-NC and DF20 stay training-only. The attribution
    gate in ``evaluate.py`` is unchanged and still rejects a release model
    that contains ``training_only`` rows.
    """
    if not isinstance(row, dict):
        return False
    if row.get("unverified") is True:
        return False
    if row.get("usage") != "publishable":
        return False
    if _EXACT_LICENSE_USAGE.get(row.get("license_normalized")) != "publishable":
        return False
    creator = row.get("creator") or row.get("author")
    if not isinstance(creator, str) or not creator.strip():
        return False
    image_url = str(row.get("image_url") or "")
    if urlsplit(image_url).scheme != "https":
        return False
    license_url = str(row.get("license_url") or "")
    if not _https_license_url(license_url):
        return False
    url_code, url_version = _code_from_text(license_url)
    if not url_code or not url_version:
        return False
    if url_code == "cc0":
        url_id = "cc0-1.0" if url_version == "1.0" else ""
    else:
        url_id = f"cc-{url_code}-{url_version}"
    if url_id != row.get("license_normalized"):
        return False
    return True


def published_rows(rows: list[dict]) -> list[dict]:
    """Rows that may be shown outside the training set."""
    return [row for row in rows if is_publishable(row)]


def rows_for_atlas_gallery(rows: list[dict]) -> list[dict]:
    """Atlas gallery. CC BY-NC and DF20 stay out."""
    return published_rows(rows)


def rows_for_site(rows: list[dict]) -> list[dict]:
    """Pages under ``site/``. CC BY-NC and DF20 stay out."""
    return published_rows(rows)


def rows_for_comparison(rows: list[dict]) -> list[dict]:
    """Comparison photos for issue #65. CC BY-NC and DF20 stay out."""
    return published_rows(rows)


def _name_key(name: str) -> str:
    return " ".join(name.casefold().split())


def species_index(manifest: dict | None = None) -> dict[str, dict]:
    """Scientific name to class id, taxon, and whether the taxon is held out."""
    manifest = manifest or load_manifest()
    index: dict[str, dict] = {}
    for item in manifest["classes"]:
        if item["id"] in ("unknown_mushroom", "not_a_mushroom"):
            continue
        toxic = item.get("safety_tag") == "toxic"
        for name in item.get("gbif_names") or []:
            index.setdefault(
                _name_key(str(name)),
                {
                    "class_id": item["id"],
                    "taxon_name": str(name),
                    "held_out_taxon": False,
                    "toxic": toxic,
                    "probe": False,
                    "genus_relation": "",
                },
            )
    for item in manifest["classes"]:
        if item["id"] not in ("unknown_mushroom", "not_a_mushroom"):
            continue
        for taxon in (item.get("sampling") or {}).get("taxa") or []:
            name = str(taxon.get("name") or "")
            if not name:
                continue
            index.setdefault(
                _name_key(name),
                {
                    "class_id": item["id"],
                    "taxon_name": name,
                    "held_out_taxon": bool(taxon.get("held_out")),
                    "toxic": bool(taxon.get("toxic")),
                    "probe": False,
                    "genus_relation": taxon.get("relation") or "",
                },
            )
    probes = manifest.get("toxic_probes") or {}
    probe_class = str(probes.get("class_id") or "unknown_mushroom")
    for taxon in probes.get("taxa") or []:
        name = str(taxon.get("name") or "")
        if not name:
            continue
        index.setdefault(
            _name_key(name),
            {
                "class_id": probe_class,
                "taxon_name": name,
                "held_out_taxon": True,
                "toxic": bool(taxon.get("toxic", True)),
                "probe": True,
                "genus_relation": taxon.get("relation") or "",
            },
        )
    return index


def resolve_species(name: str, index: dict[str, dict]) -> dict | None:
    key = _name_key(name)
    found = index.get(key)
    if found is not None:
        return found
    alias = _SPECIES_ALIASES.get(key)
    if not alias:
        return None
    return index.get(_name_key(alias))


def canonical_image_url(url: str) -> str:
    """https URL without query or fragment, for joins and duplicate detection."""
    if not url or not str(url).strip():
        return ""
    text = force_https_url(str(url).strip())
    parts = urlsplit(text)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return text
    path = parts.path[:-1] if len(parts.path) > 1 and parts.path.endswith("/") else parts.path
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, "", ""))


def _cell(row: dict, key: str) -> str:
    value = row.get(key)
    if value is None:
        return ""
    return str(value).strip()


def _read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for row in reader:
            if not isinstance(row, dict):
                continue
            rows.append({key: value for key, value in row.items() if key is not None})
        return rows


def _is_df20(path: Path, fieldnames: set[str]) -> bool:
    if path.parent.name == "df20":
        return True
    return "df20_image_path" in fieldnames or ("observationID" in fieldnames and "licence_note" in fieldnames)


def _photo_files(root: Path) -> tuple[list[Path], list[Path]]:
    """Photo CSVs and meta CSVs. Summaries and a superseded v1 file are omitted."""
    candidates = [path for path in root.rglob("*.csv") if path.is_file()]
    stems = {path.stem for path in candidates}
    photos: list[Path] = []
    metas: list[Path] = []
    for path in candidates:
        name = path.name
        if name.startswith("_") or "grupa_toksyczna" in name:
            continue
        if name.endswith("_meta.csv"):
            metas.append(path)
            continue
        if path.stem.endswith("_v2"):
            pass
        elif f"{path.stem}_v2" in stems:
            continue
        photos.append(path)
    return photos, metas


def _file_sort_key(path: Path) -> tuple:
    stem = path.stem
    unverified = 1 if "_niezweryfikowane" in stem else 0
    df20 = 1 if path.parent.name == "df20" else 0
    by_nc = 1 if "_by_nc" in stem else 0
    return (unverified, df20, by_nc, str(path).replace("\\", "/"))


def _unverified_file(path: Path) -> bool:
    return "_niezweryfikowane" in path.stem


def _blank_ids() -> dict:
    return {
        "inat_observer": "",
        "inat_photo_id": "",
        "inat_observation_id": "",
        "inaturalist_observation_id": "",
        "mo_observation_id": "",
        "commons_file": "",
        "gbif_id": "",
        "df20_observation_id": "",
        "df20_image_id": "",
        "df20_image_path": "",
        "photo_id": "",
    }


def _fill_ids_from_urls(ids: dict, image_url: str, source_url: str) -> None:
    if not ids["inat_photo_id"]:
        match = _INAT_PHOTO.search(image_url)
        if match:
            ids["inat_photo_id"] = match.group(1)
    if not ids["inat_observation_id"]:
        match = _INAT_OBSERVATION.search(source_url) or _INAT_OBSERVATION.search(image_url)
        if match:
            ids["inat_observation_id"] = match.group(1)
    ids["inaturalist_observation_id"] = ids["inat_observation_id"]
    if not ids["gbif_id"]:
        match = _GBIF_OCCURRENCE.search(source_url)
        if match:
            ids["gbif_id"] = match.group(1)
    ids["photo_id"] = ids["inat_photo_id"] or ids["commons_file"] or ids["df20_image_id"]


def _occurrence_key(ids: dict, image_key: str, order: int) -> str:
    if ids["inat_observation_id"]:
        return f"inat:{ids['inat_observation_id']}"
    if ids["mo_observation_id"]:
        return f"mo:{ids['mo_observation_id']}"
    if ids["df20_observation_id"]:
        return f"df20:{ids['df20_observation_id']}"
    if ids["gbif_id"]:
        return f"gbif:{ids['gbif_id']}"
    if ids["photo_id"]:
        return f"photo:{ids['photo_id']}"
    if image_key:
        return f"photo:{image_key}"
    return f"photo:{order}"


def _collector_key(observer: str, author: str) -> str:
    if observer:
        return "inat:" + " ".join(observer.casefold().split())
    if author:
        return "author:" + " ".join(author.casefold().split())
    return ""


def _dataset_name(ids: dict, source_url: str, image_url: str, *, df20: bool) -> str:
    if df20:
        return "df20"
    if ids["commons_file"] or "wikimedia.org" in image_url.lower() or "commons.wikimedia.org" in source_url.lower():
        return "commons"
    if ids["gbif_id"] or "gbif.org" in source_url.lower():
        return "gbif"
    if ids["inat_photo_id"] or ids["inat_observation_id"] or "inaturalist.org" in source_url.lower():
        return "inat"
    return "external"


def _located(value: str) -> str:
    return " ".join(value.split())


def _row_from_photo(
    raw: dict,
    *,
    path: Path,
    order: int,
    index: dict[str, dict],
    unverified_file: bool,
) -> tuple[dict | None, str]:
    species = _cell(raw, "species")
    target = resolve_species(species, index) if species else None
    if target is None:
        return None, "unmapped"
    license_text = _cell(raw, "license")
    license_url = _cell(raw, "license_url")
    decision, reason = photo_license_decision(license_text, license_url)
    if decision is None:
        return None, reason
    author = _located(_cell(raw, "author"))
    if not author:
        return None, "author"
    image_url = force_https_url(_cell(raw, "image_url"))
    if urlsplit(image_url).scheme != "https":
        return None, "url"
    source_url = force_https_url(_cell(raw, "source_url"))
    if source_url and urlsplit(source_url).scheme != "https":
        return None, "url"
    stored_license_url = license_url
    confidence = _cell(raw, "id_confidence")
    unverified = unverified_file or confidence in _UNVERIFIED_CONFIDENCE
    ids = _blank_ids()
    ids["inat_observer"] = _cell(raw, "inat_observer")
    ids["inat_photo_id"] = _cell(raw, "inat_photo_id")
    ids["inat_observation_id"] = _cell(raw, "inat_observation_id")
    ids["mo_observation_id"] = _cell(raw, "mo_observation_id")
    ids["commons_file"] = _cell(raw, "commons_file")
    _fill_ids_from_urls(ids, image_url, source_url)
    image_key = canonical_image_url(image_url)
    occurrence_key = _occurrence_key(ids, image_key, order)
    recorded_by = ids["inat_observer"] or author
    row = {
        "source": _dataset_name(ids, source_url, image_url, df20=False),
        "class_id": target["class_id"],
        "taxon_name": target["taxon_name"],
        "queried_name": target["taxon_name"],
        "species": species,
        "held_out_taxon": target["held_out_taxon"],
        "toxic": target["toxic"],
        "probe": target["probe"],
        "genus_relation": target["genus_relation"],
        "image_url": image_url,
        "source_url": source_url,
        "creator": author,
        "author": author,
        "license": license_text,
        "license_url": stored_license_url,
        "license_normalized": decision["license_normalized"],
        "usage": decision["usage"],
        "unverified": unverified,
        "id_confidence": confidence,
        "recorded_by": recorded_by,
        "collector_key": _collector_key(ids["inat_observer"], author),
        "occurrence_key": occurrence_key,
        "observation_id": occurrence_key.split(":", 1)[-1],
        "downloaded": False,
        "file": "",
        "decimal_latitude": None,
        "decimal_longitude": None,
        "event_date": "",
        "country": "",
        "_order": order,
        "_image_key": image_key,
    }
    row.update(ids)
    return row, ""


def _row_from_df20(raw: dict, *, order: int, index: dict[str, dict]) -> tuple[dict | None, str]:
    species = _cell(raw, "species") or _cell(raw, "df20_name_used")
    target = resolve_species(species, index) if species else None
    if target is None:
        used = _cell(raw, "df20_name_used")
        target = resolve_species(used, index) if used and used != species else None
    if target is None:
        return None, "unmapped"
    author = _located(_cell(raw, "photographer_rightsHolder") or _cell(raw, "author"))
    if not author:
        return None, "author"
    note = _cell(raw, "licence_note") or "DF20 training-only; no per-image licence"
    ids = _blank_ids()
    ids["df20_observation_id"] = _cell(raw, "observationID")
    ids["gbif_id"] = _cell(raw, "gbifID")
    ids["df20_image_id"] = _cell(raw, "ImageUniqueID")
    ids["df20_image_path"] = _cell(raw, "df20_image_path")
    _fill_ids_from_urls(ids, "", "")
    occurrence_key = _occurrence_key(ids, "", order)
    row = {
        "source": "df20",
        "class_id": target["class_id"],
        "taxon_name": target["taxon_name"],
        "queried_name": target["taxon_name"],
        "species": species,
        "held_out_taxon": target["held_out_taxon"],
        "toxic": target["toxic"],
        "probe": target["probe"],
        "genus_relation": target["genus_relation"],
        "image_url": "",
        "source_url": "",
        "creator": author,
        "author": author,
        "license": note,
        "license_normalized": "df20",
        "usage": "training_only",
        "unverified": False,
        "id_confidence": "",
        "recorded_by": author,
        "collector_key": _collector_key("", author),
        "occurrence_key": occurrence_key,
        "observation_id": ids["df20_observation_id"] or occurrence_key.split(":", 1)[-1],
        "downloaded": False,
        "file": "",
        "decimal_latitude": None,
        "decimal_longitude": None,
        "event_date": _cell(raw, "date"),
        "country": _cell(raw, "countryCode"),
        "df20_original_split": _cell(raw, "original_split"),
        "df24_split": _cell(raw, "df24_split"),
        "_order": order,
        "_image_key": "",
    }
    row.update(ids)
    return row, ""


def _identity(row: dict) -> str:
    if row.get("inat_photo_id"):
        return f"inat-photo:{row['inat_photo_id']}"
    if row.get("commons_file"):
        return f"commons:{row['commons_file']}"
    if row.get("df20_image_id"):
        return f"df20:{row['df20_image_id']}"
    if row.get("_image_key"):
        return f"url:{row['_image_key']}"
    return f"row:{row['_order']}"


def _label_text(row: dict) -> str:
    class_id = str(row.get("class_id") or "")
    taxon = str(row.get("taxon_name") or row.get("species") or "")
    if taxon:
        return f"{class_id} ({taxon})"
    return class_id


def _conflict_keys(row: dict) -> list[tuple[str, str]]:
    """Photo and observation ids that must not carry two species labels."""
    keys: list[tuple[str, str]] = []
    if row.get("inat_photo_id"):
        keys.append(("photo", f"inat-photo:{row['inat_photo_id']}"))
    if row.get("commons_file"):
        keys.append(("photo", f"commons:{row['commons_file']}"))
    if row.get("df20_image_id"):
        keys.append(("photo", f"df20-image:{row['df20_image_id']}"))
    if row.get("_image_key"):
        keys.append(("photo", f"url:{row['_image_key']}"))
    if row.get("inat_observation_id"):
        keys.append(("observation", f"inat-obs:{row['inat_observation_id']}"))
    if row.get("mo_observation_id"):
        keys.append(("observation", f"mo:{row['mo_observation_id']}"))
    if row.get("df20_observation_id"):
        keys.append(("observation", f"df20-obs:{row['df20_observation_id']}"))
    elif row.get("gbif_id") and not row.get("inat_observation_id"):
        keys.append(("observation", f"gbif:{row['gbif_id']}"))
    return keys


def _photo_keys(row: dict) -> list[str]:
    """Ids that mean one image, including the same file on two hosts."""
    keys: list[str] = []
    if row.get("inat_photo_id"):
        keys.append(f"inat-photo:{row['inat_photo_id']}")
    if row.get("commons_file"):
        keys.append(f"commons:{row['commons_file']}")
    if row.get("df20_image_id"):
        keys.append(f"df20-image:{row['df20_image_id']}")
    if row.get("_image_key"):
        keys.append(f"url:{row['_image_key']}")
    if not keys:
        keys.append(f"row:{row.get('_order')}")
    return keys


def _license_strictness(row: dict) -> int:
    """Higher is stricter. CC BY-NC and DF20 outrank a publishable CC BY or CC0."""
    if row.get("usage") == "training_only":
        return 2
    if row.get("usage") == "publishable":
        return 1
    return 0


def dedupe_rows(rows: list[dict]) -> tuple[list[dict], int, int, int, list[dict]]:
    """Drop label conflicts, then keep the stricter license of one photo.

    File order must not pick the species. When one photo id or one observation
    id is tied to two species, every row of that id is removed and the report
    lists the id with both labels. The same image under two licenses keeps the
    stricter one: CC BY-NC beats CC BY, so the kept row is training-only.
    Equal licenses keep the earliest row.
    """
    labels_by_key: dict[tuple[str, str], set[str]] = {}
    for row in rows:
        label = _label_text(row)
        for key in _conflict_keys(row):
            labels_by_key.setdefault(key, set()).add(label)
    conflict_keys = {key for key, labels in labels_by_key.items() if len(labels) > 1}
    conflicts = [
        {"kind": kind, "id": ident, "labels": sorted(labels_by_key[(kind, ident)])}
        for kind, ident in sorted(conflict_keys)
    ]
    surviving = [row for row in rows if not any(key in conflict_keys for key in _conflict_keys(row))]
    parent = list(range(len(surviving)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    owner: dict[str, int] = {}
    for index, row in enumerate(surviving):
        for key in _photo_keys(row):
            previous = owner.get(key)
            if previous is None:
                owner[key] = index
            else:
                union(index, previous)
    groups: dict[int, list[dict]] = {}
    for index, row in enumerate(surviving):
        groups.setdefault(find(index), []).append(row)
    kept: list[dict] = []
    duplicate_dropped = 0
    looser_dropped = 0
    extra_conflicts = 0
    for group in groups.values():
        labels = {_label_text(row) for row in group}
        if len(labels) > 1:
            extra_conflicts += len(group)
            conflicts.append(
                {
                    "kind": "photo",
                    "id": _photo_keys(group[0])[0],
                    "labels": sorted(labels),
                }
            )
            continue
        ranked = sorted(
            group,
            key=lambda row: (-_license_strictness(row), int(row.get("_order") or 0)),
        )
        winner = ranked[0]
        kept.append(winner)
        winner_rank = _license_strictness(winner)
        for row in ranked[1:]:
            if _license_strictness(row) < winner_rank:
                looser_dropped += 1
            else:
                duplicate_dropped += 1
    kept.sort(key=lambda row: int(row.get("_order") or 0))
    conflict_dropped = len(rows) - len(surviving) + extra_conflicts
    return kept, duplicate_dropped, looser_dropped, conflict_dropped, conflicts


def apply_collector_cap(rows: list[dict], max_per_collector: int) -> tuple[list[dict], list[dict]]:
    """Cap photos per collector per class.

    Unverified rows have their own cap, so they do not push verified photos
    out. Observations are kept whole when they fit. One observation larger
    than the cap contributes its first ``max_per_collector`` photos and
    nothing further from that collector. ``max_per_collector`` below 1
    disables the cap.
    """
    if max_per_collector < 1:
        return list(rows), []
    pools: dict[tuple, list[dict]] = {}
    for row in rows:
        collector = row.get("collector_key") or f"anon:{row.get('_order')}"
        pool_key = (row.get("class_id"), bool(row.get("unverified")), collector)
        pools.setdefault(pool_key, []).append(row)
    kept_orders: set[int] = set()
    for group in pools.values():
        observations: list[list[dict]] = []
        current_key = None
        current: list[dict] | None = None
        ordered = sorted(group, key=lambda item: int(item.get("_order") or 0))
        for row in ordered:
            obs = str(row.get("occurrence_key") or "")
            if current is None or obs != current_key:
                current_key = obs
                current = []
                observations.append(current)
            current.append(row)
        room = max_per_collector
        for index, obs_rows in enumerate(observations):
            if room < 1:
                break
            if len(obs_rows) <= room:
                for row in obs_rows:
                    kept_orders.add(int(row["_order"]))
                room -= len(obs_rows)
                continue
            if index == 0 and not any(int(row["_order"]) in kept_orders for row in group):
                for row in obs_rows[:max_per_collector]:
                    kept_orders.add(int(row["_order"]))
                room = 0
    kept = [row for row in rows if int(row["_order"]) in kept_orders]
    dropped = [row for row in rows if int(row["_order"]) not in kept_orders]
    return kept, dropped


def _join_meta(rows: list[dict], meta_paths: list[Path]) -> int:
    by_image: dict[str, dict] = {}
    for path in meta_paths:
        for raw in _read_csv(path):
            key = canonical_image_url(_cell(raw, "image_url"))
            if key and key not in by_image:
                by_image[key] = raw
    joined = 0
    for row in rows:
        meta = by_image.get(row.get("_image_key") or "")
        if meta is None:
            continue
        joined += 1
        if not row.get("event_date"):
            row["event_date"] = _cell(meta, "date")
        if not row.get("country"):
            row["country"] = _cell(meta, "country")
        lat = _float_or_none(_cell(meta, "lat"))
        lon = _float_or_none(_cell(meta, "lon"))
        if row.get("decimal_latitude") is None and lat is not None:
            row["decimal_latitude"] = lat
        if row.get("decimal_longitude") is None and lon is not None:
            row["decimal_longitude"] = lon
    return joined


def _float_or_none(value: str) -> float | None:
    if not value:
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    if not math.isfinite(number):
        return None
    return number


def _public_row(row: dict) -> dict:
    return {key: value for key, value in row.items() if not key.startswith("_")}


def import_directory(
    root: Path,
    *,
    max_per_collector: int = DEFAULT_MAX_PER_COLLECTOR,
    publishable_only: bool = False,
    exclude_unverified: bool = False,
    manifest: dict | None = None,
) -> tuple[list[dict], dict]:
    """Read a ``zdjecia`` directory and return dataset rows plus a count report."""
    root = root.resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"not a directory: {root}")
    index = species_index(manifest)
    photos, metas = _photo_files(root)
    rows: list[dict] = []
    rejected = Counter()
    unmapped: Counter[str] = Counter()
    order = 0
    files_read = 0
    for path in sorted(photos, key=_file_sort_key):
        table = _read_csv(path)
        if not table:
            continue
        fields = set(table[0])
        df20 = _is_df20(path, fields)
        if not df20 and "species" not in fields:
            continue
        files_read += 1
        unverified_file = _unverified_file(path)
        for raw in table:
            order += 1
            if df20:
                row, reason = _row_from_df20(raw, order=order, index=index)
            else:
                row, reason = _row_from_photo(
                    raw,
                    path=path,
                    order=order,
                    index=index,
                    unverified_file=unverified_file,
                )
            if row is None:
                rejected[reason] += 1
                if reason == "unmapped":
                    unmapped[_cell(raw, "species") or _cell(raw, "df20_name_used") or "(blank)"] += 1
                continue
            rows.append(row)
    rows_read = order
    rows, duplicate_dropped, looser_dropped, conflict_dropped, label_conflicts = dedupe_rows(rows)
    # publishable_only runs before the cap so a CC BY-NC photo does not
    # consume a collector's slot that a CC BY photo of the same person needs.
    if publishable_only:
        before = len(rows)
        rows = published_rows(rows)
        rejected["publishable_only"] += before - len(rows)
    meta_joined = _join_meta(rows, metas)
    rows, cap_dropped = apply_collector_cap(rows, max_per_collector)
    if exclude_unverified:
        rejected["exclude_unverified"] += sum(1 for row in rows if row.get("unverified") is True)
        rows = [row for row in rows if row.get("unverified") is not True]
    written = [_public_row(row) for row in rows]
    by_class = Counter(row["class_id"] for row in written)
    report = {
        "files_read": files_read,
        "rows_read": rows_read,
        "rows_written": len(written),
        "rejected_license": int(rejected["license"]),
        "rejected_unmapped": int(rejected["unmapped"]),
        "rejected_missing_author": int(rejected["author"]),
        "unmapped_species": dict(sorted(unmapped.items())),
        "dropped_duplicate": duplicate_dropped,
        "dropped_looser_license": looser_dropped,
        "dropped_label_conflict": conflict_dropped,
        "duplicate_class_conflicts": len(label_conflicts),
        "label_conflicts": label_conflicts,
        "rejected_url": int(rejected["url"]),
        "rejected_license_url_empty": int(rejected["license_url_empty"]),
        "rejected_license_url_not_https": int(rejected["license_url_not_https"]),
        "rejected_license_url_mismatch": int(rejected["license_url_mismatch"]),
        "rejected_by_reason": {key: int(rejected[key]) for key in sorted(rejected)},
        "dropped_by_reason": {
            "duplicate": duplicate_dropped,
            "looser_license": looser_dropped,
            "label_conflict": conflict_dropped,
            "collector_cap": len(cap_dropped),
            "publishable_only": int(rejected["publishable_only"]),
            "exclude_unverified": int(rejected["exclude_unverified"]),
        },
        "dropped_collector_cap": len(cap_dropped),
        "meta_rows_joined": meta_joined,
        "unverified": sum(1 for row in written if row.get("unverified") is True),
        "training_only": sum(1 for row in written if row.get("usage") == "training_only"),
        "publishable": sum(1 for row in written if row.get("usage") == "publishable"),
        "by_class": dict(sorted(by_class.items())),
        "max_per_collector": max_per_collector,
        "publishable_only": publishable_only,
        "exclude_unverified": exclude_unverified,
    }
    return written, report


def write_import(rows: list[dict], report: dict, output: Path, report_path: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
    output.write_text(text, encoding="utf-8")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import external mushroom photo CSVs")
    parser.add_argument("directory", type=Path, help="Directory of per-species CSVs (a zdjecia folder)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="JSONL dataset path")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="JSON count report")
    parser.add_argument(
        "--max-per-collector",
        type=int,
        default=DEFAULT_MAX_PER_COLLECTOR,
        help="Max photos per observer or author per class. Below 1 disables the cap. Default 30.",
    )
    parser.add_argument(
        "--publishable-only",
        action="store_true",
        help=(
            "Write only rows that pass is_publishable, before the collector cap. "
            "Drops CC BY-NC, DF20, unverified rows, and anything without a versioned CC0 or CC BY id."
        ),
    )
    parser.add_argument(
        "--exclude-unverified",
        action="store_true",
        help="Omit unverified rows from the jsonl. The default keeps them flagged.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.directory.is_dir():
        parser.error(f"not a directory: {args.directory}")
    rows, report = import_directory(
        args.directory,
        max_per_collector=args.max_per_collector,
        publishable_only=args.publishable_only,
        exclude_unverified=args.exclude_unverified,
    )
    write_import(rows, report, args.output, args.report)
    print(
        f"wrote {report['rows_written']} rows to {args.output} "
        f"(publishable {report['publishable']}, training_only {report['training_only']}, "
        f"unverified {report['unverified']}, rejected license {report['rejected_license']}, "
        f"unmapped {report['rejected_unmapped']}, cap {report['dropped_collector_cap']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
