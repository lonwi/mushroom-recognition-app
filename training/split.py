"""Train/val/test split grouped so one photographer or one observation stays together.

The split key is an HMAC-SHA256 of every identity key in a connected component,
keyed with a salt that is not stored in this repository. The salt does not
change the assignment; it only pseudonymizes ids written into reports. Rows
that share a photographer (`inat_observer`, otherwise author or GBIF
`recordedBy` / `photographer_rightsHolder`), an iNaturalist observation or
photo id, a Mushroom Observer observation, a Danish Fungi 2020 `observationID`,
or a GBIF occurrence are one component and go to one split. Placeholder author
strings are not a photographer. A held-out taxon does not move the component
into test; those rows are dropped unless the component is already in test.

`collector_group_key` is still the field-outing report (recorder, ~1 km grid,
calendar day). It is not the split key. `prepare_data.py` writes both.
"""

from __future__ import annotations

import hashlib
import hmac
import math
import random
import re
from collections import defaultdict

from gallery_exclusion import _INAT_OBS, _INAT_PHOTO, _MO_OBS, canonical_url
from split_salt import SplitSaltError

_GBIF_OCCURRENCE = re.compile(r"gbif\.org/occurrence/(\d+)", re.IGNORECASE)
_EMPTY_ID = frozenset({"none", "null", "nan"})
# Author strings that are not a person. They must not glue two observations
# into one component. Matching is case-insensitive after trimming.
_PLACEHOLDER_PERSONS = frozenset(
    {
        "none",
        "null",
        "nan",
        "unknown",
        "anonymous",
        "anonim",
        "anonimowy",
        "nieznany",
        "unknown author",
        "no rights reserved",
        "-",
        "?",
        "n/a",
        "na",
        "inaturalist",
        "gbif",
        "wikimedia",
        "wikimedia commons",
        "mushroom observer",
    }
)


def _clean_id(value: object) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer():
            return None
        value = int(value)
    text = str(value).strip().replace("\r", " ").replace("\n", " ")
    if not text or text.casefold() in _EMPTY_ID:
        return None
    return text


def normalized_person_text(value: object) -> str | None:
    """Trimmed, case-folded person text, including placeholders."""
    if not isinstance(value, str):
        if value is None or isinstance(value, bool):
            return None
        value = str(value)
    text = " ".join(value.casefold().split())
    if not text:
        return None
    return text


def is_placeholder_person(value: object) -> bool:
    """True for Unknown, Anonymous, ``no rights reserved``, society names, and blanks."""
    text = normalized_person_text(value)
    if text is None:
        return True
    if text in _PLACEHOLDER_PERSONS:
        return True
    if text.endswith(" society") or text.endswith(" stowarzyszenie") or text.endswith(" association"):
        return True
    return "mycological society" in text


def _person_name(value: object) -> str | None:
    if is_placeholder_person(value):
        return None
    return normalized_person_text(value)


def _token(prefix: str, value: str) -> str:
    return f"{prefix}:{value.replace(chr(10), ' ').replace(chr(13), ' ')}"


def person_key_source(record: dict) -> str:
    """Which field supplies the photographer when the row is counted.

    `inat_observer` wins. Rows without one use author, then GBIF `recordedBy`
    (and the DF20 rights-holder column, which is that fallback).
    """
    if _person_name(record.get("inat_observer")):
        return "inat_observer"
    if _person_name(record.get("author")) or _person_name(record.get("creator")):
        return "author"
    recorded = (
        record.get("recorded_by")
        or record.get("recordedBy")
        or record.get("photographer_rightsHolder")
        or record.get("rights_holder")
        or record.get("rightsHolder")
    )
    if _person_name(recorded):
        return "recorded_by"
    return "none"


def _person_from_collector_key(value: object) -> str | None:
    """``inat:login`` and ``author:name`` are the external-CSV collector key."""
    if not isinstance(value, str):
        return None
    text = value.strip()
    lowered = text.casefold()
    for prefix in ("inat:", "author:"):
        if lowered.startswith(prefix):
            return _person_name(text[len(prefix) :])
    return _person_name(text)


def person_identity_keys(record: dict) -> list[str]:
    """Every photographer string on the row. Shared strings connect components.

    A GBIF ``recordedBy`` and an external ``inat_observer`` / ``collector_key``
    for the same person are one key, so the two sources cannot split apart.
    """
    values = (
        record.get("inat_observer"),
        record.get("author"),
        record.get("creator"),
        record.get("recorded_by"),
        record.get("recordedBy"),
        record.get("photographer_rightsHolder"),
        record.get("rights_holder"),
        record.get("rightsHolder"),
    )
    names = [name for name in (_person_name(value) for value in values) if name]
    collector = _person_from_collector_key(record.get("collector_key"))
    if collector:
        names.append(collector)
    keys = [_token("person", name) for name in names]
    return list(dict.fromkeys(keys))


# Longer prefixes first so ``inat-obs:`` is not read as ``inat:``.
_PREFIXED_IDS = (
    ("inat-obs:", "inat_observation"),
    ("inat-photo:", "inat_photo"),
    ("inat:", "inat_observation"),
    ("mo:", "mo_observation"),
    ("df20:", "df20_observation"),
    ("gbif:", "gbif_occurrence"),
)


def _prefixed_id(value: str) -> tuple[str, str] | None:
    lowered = value.casefold()
    for prefix, kind in _PREFIXED_IDS:
        if lowered.startswith(prefix):
            rest = value[len(prefix) :].strip()
            if rest:
                return kind, rest
            return None
    return None


def _occurrence_key_tokens(value: object) -> list[str]:
    """Map a GBIF id or an external occurrence key onto the shared identity.

    External rows use ``inat-obs:<id>`` or, from the CSV importer, ``inat:<id>``.
    A GBIF fetch row keeps the numeric occurrence key and is linked to that
    same observation through ``source_url``.
    """
    text = _clean_id(value)
    if not text:
        return []
    prefixed = _prefixed_id(text)
    if prefixed:
        return [_token(prefixed[0], prefixed[1])]
    lowered = text.casefold()
    if lowered.startswith("photo:"):
        rest = text.split(":", 1)[1].strip()
        if not rest:
            return []
        if rest.isdigit():
            return [_token("inat_photo", rest)]
        if "://" in rest:
            return [_token("image", canonical_url(rest))]
        return [_token("commons", rest)]
    if text.isdigit():
        return [_token("gbif_occurrence", text)]
    return [_token("occurrence", text)]


def photo_identity_keys(record: dict) -> list[str]:
    """Photo ids. Distinct photos of one observation stay; a repeated photo does not."""
    keys: list[str] = []
    photo = _clean_id(record.get("inat_photo_id"))
    if photo:
        keys.append(_token("inat_photo", photo))
    for field in ("image_url", "identifier"):
        url = record.get(field)
        if not isinstance(url, str) or not url.strip():
            continue
        keys.extend(_token("inat_photo", found) for found in _INAT_PHOTO.findall(url))
        keys.append(_token("image", canonical_url(url)))
    # A GBIF row often puts the iNat photo page in source_url. That photo id
    # is the same photo as an external CSV ``inat_photo_id``. The observation
    # page URL is not a photo key: two photos of one observation stay distinct.
    for field in ("source_url", "references"):
        url = record.get(field)
        if isinstance(url, str) and url.strip():
            keys.extend(_token("inat_photo", found) for found in _INAT_PHOTO.findall(url))
    for field in ("ImageUniqueID", "df20_image_id", "df20_image_path"):
        unique = _clean_id(record.get(field))
        if unique:
            keys.append(_token("df20_image", unique))
    for token in _occurrence_key_tokens(record.get("occurrence_key")):
        if token.startswith(("inat_photo:", "image:", "commons:", "df20_image:")):
            keys.append(token)
    commons = _clean_id(record.get("commons_file"))
    if commons:
        keys.append(_token("commons", commons))
    file_name = _clean_id(record.get("file"))
    if file_name:
        keys.append(_token("file", file_name.replace("\\", "/")))
    return list(dict.fromkeys(keys))


def observation_identity_keys(record: dict) -> list[str]:
    """Observation ids, including Danish Fungi 2020 ``observationID``."""
    keys: list[str] = []
    inat = _clean_id(record.get("inat_observation_id") or record.get("inaturalist_observation_id"))
    if inat:
        keys.append(_token("inat_observation", inat))
    mo = _clean_id(record.get("mo_observation_id"))
    if mo:
        keys.append(_token("mo_observation", mo))
    for field in ("observationID", "df20_observation_id"):
        df20 = _clean_id(record.get(field))
        if df20:
            keys.append(_token("df20_observation", df20))
    source = str(record.get("source") or "").casefold()
    if source == "df20":
        df20_obs = _clean_id(record.get("observation_id"))
        if df20_obs:
            keys.append(_token("df20_observation", df20_obs))
    for token in _occurrence_key_tokens(record.get("occurrence_key")):
        if token.startswith(("inat_observation:", "mo_observation:", "df20_observation:", "gbif_occurrence:", "occurrence:")):
            keys.append(token)
    gbif_id = _clean_id(record.get("gbif_id") or record.get("gbifID"))
    if gbif_id:
        keys.append(_token("gbif_occurrence", gbif_id))
    for field in ("source_url", "references", "gbif_occurrence"):
        value = record.get(field)
        if not isinstance(value, str) or not value.strip():
            continue
        keys.extend(_token("inat_observation", found) for found in _INAT_OBS.findall(value))
        keys.extend(_token("mo_observation", found) for found in _MO_OBS.findall(value))
        keys.extend(_token("gbif_occurrence", found) for found in _GBIF_OCCURRENCE.findall(value))
    return list(dict.fromkeys(keys))


def identity_keys(record: dict) -> list[str]:
    """Photographer, photo, and observation keys for one row."""
    return list(dict.fromkeys([*person_identity_keys(record), *photo_identity_keys(record), *observation_identity_keys(record)]))


def hashed_split_key(material: list[str], salt: str) -> str:
    """HMAC-SHA256 of the sorted identity keys. The salt is the HMAC key."""
    if not isinstance(salt, str) or not salt.strip():
        raise SplitSaltError(
            "Split salt is missing. Pass salt= from GRZYBOBRANIE_SPLIT_SALT "
            "or a file outside the repository (GRZYBOBRANIE_SPLIT_SALT_FILE). "
            "The salt is not stored in the repo."
        )
    payload = "\n".join(material).encode("utf-8")
    return hmac.new(salt.strip().encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _components(records: list[dict], salt: str) -> list[dict]:
    """Connected components. An edge is any shared identity key."""
    count = len(records)
    parent = list(range(count))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        ra, rb = find(left), find(right)
        if ra != rb:
            parent[rb] = ra

    owner: dict[str, int] = {}
    row_keys: list[list[str]] = []
    for index, record in enumerate(records):
        keys = identity_keys(record)
        if not keys:
            keys = [f"solo:{index}"]
        row_keys.append(keys)
        for key in keys:
            if key.startswith("solo:"):
                continue
            previous = owner.get(key)
            if previous is None:
                owner[key] = index
            else:
                union(index, previous)
    grouped: dict[int, list[int]] = defaultdict(list)
    for index in range(count):
        grouped[find(index)].append(index)
    components: list[dict] = []
    for indexes in grouped.values():
        indexes.sort()
        material = sorted({key for index in indexes for key in row_keys[index] if not key.startswith("solo:")})
        if not material:
            material = [row_keys[indexes[0]][0]]
        components.append(
            {
                "indexes": indexes,
                "rows": [records[index] for index in indexes],
                "id": hashed_split_key(material, salt),
            }
        )
    components.sort(key=lambda comp: comp["indexes"][0])
    return components


def component_ids(records: list[dict], salt: str) -> list[str]:
    """HMAC id of the component that contains each row, in input order."""
    ids = [""] * len(records)
    for component in _components(records, salt):
        for index in component["indexes"]:
            ids[index] = component["id"]
    return ids


def collector_group_key(record: dict) -> str:
    """Recorder + ~1 km grid + day, or the occurrence when that is missing.

    This is a leakage report, not the split key. The split key is the salted
    HMAC of the identity component from `hashed_split_key`.
    """
    recorded = " ".join(str(record.get("recorded_by") or "").casefold().split())
    day = str(record.get("event_date") or "")[:10]
    lat = record.get("decimal_latitude")
    lon = record.get("decimal_longitude")
    class_id = record.get("class_id") or ""
    if recorded and len(day) == 10 and day[4] == "-" and day[7] == "-" and lat is not None and lon is not None:
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            lat_f = float("nan")
            lon_f = float("nan")
        if math.isfinite(lat_f) and math.isfinite(lon_f):
            lat_bin = round(lat_f / 0.01) * 0.01
            lon_bin = round(lon_f / 0.01) * 0.01
            taxon = str(record.get("taxon_name") or record.get("queried_name") or "")
            return f"collector:{class_id}:{taxon}:{recorded}:{lat_bin:.2f}:{lon_bin:.2f}:{day}"
    token = record.get("occurrence_key")
    if _clean_id(token) is None:
        for field in (
            "observationID",
            "df20_observation_id",
            "inat_observation_id",
            "mo_observation_id",
            "gbif_id",
            "gbifID",
        ):
            found = _clean_id(record.get(field))
            if found:
                token = found
                break
    return f"occurrence:{class_id}:{token}"


def collector_grid_key(record: dict) -> str | None:
    """Recorder + ~1 km grid, without the calendar day.

    This is a leakage report, not the split key. Two days from the same person
    in the same square stay one group here and two groups in `collector_group_key`.
    The split itself keeps the whole photographer in one of train, val, or test.
    """
    recorded = " ".join(str(record.get("recorded_by") or "").casefold().split())
    lat = record.get("decimal_latitude")
    lon = record.get("decimal_longitude")
    if not recorded or lat is None or lon is None:
        return None
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(lat_f) or not math.isfinite(lon_f):
        return None
    lat_bin = round(lat_f / 0.01) * 0.01
    lon_bin = round(lon_f / 0.01) * 0.01
    class_id = record.get("class_id") or ""
    taxon = str(record.get("taxon_name") or record.get("queried_name") or "")
    return f"grid:{class_id}:{taxon}:{recorded}:{lat_bin:.2f}:{lon_bin:.2f}"


def split_key_summary(records: list[dict]) -> dict[str, int]:
    collector_keys = [collector_group_key(record) for record in records]
    collector = sum(1 for key in collector_keys if key.startswith("collector:"))
    grid_keys = [key for key in (collector_grid_key(record) for record in records) if key]
    sources = [person_key_source(record) for record in records]
    return {
        "collector_grid_day": collector,
        "collector_grid_day_groups": len({key for key in collector_keys if key.startswith("collector:")}),
        "occurrence_fallback": len(records) - collector,
        "collector_grid": len(grid_keys),
        "collector_grid_groups": len(set(grid_keys)),
        "inat_observer": sum(1 for source in sources if source == "inat_observer"),
        "author_fallback": sum(1 for source in sources if source == "author"),
        "recorded_by_fallback": sum(1 for source in sources if source == "recorded_by"),
        "no_person_key": sum(1 for source in sources if source == "none"),
        "largest_component_rows": _largest_component_rows(records),
        "largest_component_share": _largest_component_share(records),
    }


def _largest_component_rows(records: list[dict]) -> int:
    if not records:
        return 0
    count = len(records)
    parent = list(range(count))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        ra, rb = find(left), find(right)
        if ra != rb:
            parent[rb] = ra

    owner: dict[str, int] = {}
    for index, record in enumerate(records):
        keys = identity_keys(record)
        for key in keys:
            previous = owner.get(key)
            if previous is None:
                owner[key] = index
            else:
                union(index, previous)
    sizes: dict[int, int] = defaultdict(int)
    for index in range(count):
        sizes[find(index)] += 1
    return max(sizes.values()) if sizes else 0


def _largest_component_share(records: list[dict]) -> float:
    if not records:
        return 0.0
    return _largest_component_rows(records) / len(records)


def _require_salt(salt: str | None) -> str:
    if not isinstance(salt, str) or not salt.strip():
        raise SplitSaltError(
            "Split salt is missing. Set GRZYBOBRANIE_SPLIT_SALT or point "
            "GRZYBOBRANIE_SPLIT_SALT_FILE at a file outside the repository. "
            "The salt is not stored in the repo."
        )
    return salt.strip()


def split_by_observation(
    records: list[dict],
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
    test_blocked=None,
    *,
    salt: str | None = None,
    withheld: list | None = None,
) -> dict[str, list[dict]]:
    """Split by identity component. ``test_blocked`` rows never enter test.

    A blocked photo keeps its whole component out of test. A held-out taxon
    does not pull the rest of that component into test. When the component
    lands in train or val, its held-out rows are removed and appended to
    ``withheld`` with counts. They stay only when the component is in test.
    The salt pseudonymizes component ids. It does not change the assignment.
    """
    salt = _require_salt(salt)
    if val_ratio < 0 or test_ratio < 0 or val_ratio + test_ratio >= 1:
        raise ValueError("val and test ratios must leave a non-empty train share")

    blocked = test_blocked or (lambda _record: False)
    components = _components(records, salt)
    for component in components:
        component["blocked"] = any(blocked(row) for row in component["rows"])

    splits: dict[str, list[dict]] = {"train": [], "val": [], "test": []}
    locked: dict[str, str] = {}
    ratio = components

    by_class: dict[str, list[dict]] = defaultdict(list)
    for component in ratio:
        rows_by_class: dict[str, list[dict]] = defaultdict(list)
        for row in component["rows"]:
            rows_by_class[row["class_id"]].append(row)
        for class_id, rows in rows_by_class.items():
            by_class[class_id].append({"id": component["id"], "rows": rows, "blocked": component["blocked"]})

    for class_id in sorted(by_class):
        observations = by_class[class_id]
        rng = random.Random(f"{seed}:{class_id}")
        rng.shuffle(observations)
        total_images = sum(len(group["rows"]) for group in observations)
        test_target = round(total_images * test_ratio)
        val_target = round(total_images * val_ratio)
        test_count = 0
        val_count = 0
        # Fewer than three observations: keep everything in train and let the
        # ship gate fail for lack of a real held-out set. A component already
        # locked by another class stays in that split.
        if len(observations) < 3:
            for group in observations:
                dest = locked.get(group["id"], "train")
                if group["blocked"] and dest == "test":
                    raise RuntimeError(f"gallery-blocked group {group['id']} was locked to test")
                locked[group["id"]] = dest
                splits[dest].extend(group["rows"])
            continue
        for index, group in enumerate(observations):
            rows = group["rows"]
            if group["id"] in locked:
                dest = locked[group["id"]]
                if group["blocked"] and dest == "test":
                    raise RuntimeError(f"gallery-blocked group {group['id']} was locked to test")
                splits[dest].extend(rows)
                if dest == "test":
                    test_count += len(rows)
                elif dest == "val":
                    val_count += len(rows)
                continue
            remaining = observations[index:]
            remaining_images = sum(len(item["rows"]) for item in remaining)
            group_blocked = group["blocked"]
            if (
                not group_blocked
                and test_count < test_target
                and (total_images - test_count - len(rows)) > 0
            ):
                dest = "test"
                test_count += len(rows)
            elif val_count < val_target and remaining_images > len(rows):
                dest = "val"
                val_count += len(rows)
            else:
                dest = "train"
            locked[group["id"]] = dest
            splits[dest].extend(rows)
    dropped = _drop_held_out_outside_test(splits)
    if withheld is not None:
        withheld.extend(dropped)
    _assert_occurrence_integrity(splits)
    _assert_identity_integrity(splits, salt)
    placed = sum(len(rows) for rows in splits.values()) + len(dropped)
    if placed != len(records):
        raise RuntimeError(f"split placed {placed} rows, not {len(records)}")
    return splits


def _drop_held_out_outside_test(splits: dict[str, list[dict]]) -> list[dict]:
    """Remove held-out rows whose component was assigned to train or val."""
    dropped: list[dict] = []
    for name in ("train", "val"):
        kept: list[dict] = []
        for row in splits.get(name) or []:
            if row.get("held_out_taxon"):
                dropped.append({**row, "drop_reason": "held_out_outside_test", "assigned_split": name})
            else:
                kept.append(row)
        splits[name] = kept
    return dropped


def held_out_withheld_report(rows: list[dict]) -> dict:
    """Counts for held-out rows dropped because their component was not in test."""
    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[str(row.get("class_id") or "")] += 1
    return {"rows": len(rows), "per_class": dict(sorted(counts.items()))}


def _assert_occurrence_integrity(splits: dict[str, list[dict]]) -> None:
    seen: dict[str, str] = {}
    for name, records in splits.items():
        for record in records:
            key = collector_group_key(record)
            previous = seen.get(key)
            if previous is not None and previous != name:
                raise RuntimeError(f"photo group {key} leaked into both {previous} and {name}")
            seen[key] = name


def _assert_identity_integrity(splits: dict[str, list[dict]], salt: str) -> None:
    flat: list[tuple[str, dict]] = []
    for name in ("train", "val", "test"):
        for record in splits[name]:
            flat.append((name, record))
    if not flat:
        return
    rows = [record for _name, record in flat]
    seen: dict[str, str] = {}
    for cid, (name, _record) in zip(component_ids(rows, salt), flat):
        previous = seen.get(cid)
        if previous is not None and previous != name:
            raise RuntimeError(f"identity group {cid} leaked into both {previous} and {name}")
        seen[cid] = name
    people: dict[str, str] = {}
    for name, record in flat:
        for key in person_identity_keys(record):
            previous = people.get(key)
            if previous is not None and previous != name:
                raise RuntimeError(f"observer {key} leaked into both {previous} and {name}")
            people[key] = name
