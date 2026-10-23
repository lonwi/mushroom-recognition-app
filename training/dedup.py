"""Drop exact byte duplicates, repeated photo ids, and near-duplicate photos."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from publication import classify_license_column
from split import observation_identity_keys, photo_identity_keys


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def average_hash_bits(gray: list[list[int]], hash_size: int = 8) -> int:
    """8x8 average hash from a grayscale grid of 0-255 samples already resized."""
    if len(gray) != hash_size or any(len(row) != hash_size for row in gray):
        raise ValueError(f"expected {hash_size}x{hash_size} gray grid")
    flat = [pixel for row in gray for pixel in row]
    mean = sum(flat) / len(flat)
    bits = 0
    for pixel in flat:
        bits = (bits << 1) | (1 if pixel >= mean else 0)
    return bits


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def difference_hash_bits(gray: list[list[int]]) -> int:
    """Horizontal dHash. Expects 8 rows of 9 grayscale samples."""
    if len(gray) != 8 or any(len(row) != 9 for row in gray):
        raise ValueError("dHash expects an 8x9 gray grid")
    bits = 0
    for row in gray:
        for left, right in zip(row, row[1:]):
            bits = (bits << 1) | (1 if left > right else 0)
    return bits


def _dct_1d(values: list[float]) -> list[float]:
    count = len(values)
    output = []
    for freq in range(count):
        total = 0.0
        for index, value in enumerate(values):
            total += value * math.cos(math.pi * freq * (2 * index + 1) / (2 * count))
        output.append(total)
    return output


def perceptual_hash_bits(gray: list[list[float]]) -> int:
    """Low-frequency pHash. Expects a 32x32 grayscale grid."""
    if len(gray) != 32 or any(len(row) != 32 for row in gray):
        raise ValueError("pHash expects a 32x32 gray grid")
    rows = [_dct_1d([float(pixel) for pixel in row]) for row in gray]
    columns = [_dct_1d([rows[y][x] for y in range(32)]) for x in range(32)]
    block = [columns[x][y] for y in range(8) for x in range(8)]
    ordered = sorted(block)
    median = ordered[(len(ordered) - 1) // 2]
    bits = 0
    for value in block:
        bits = (bits << 1) | (1 if value > median else 0)
    return bits


def dropped_per_class(dropped: list[dict]) -> dict[str, int]:
    """How many near-duplicate or exact-duplicate photos each class lost."""
    return dict(sorted(Counter(str(row.get("class_id") or "") for row in dropped).items()))


def _hash_bucket(record: dict) -> str:
    """Near-duplicates of unknown_mushroom are per taxon, not per class.

    Every probe and every held-out name shares class_id unknown_mushroom.
    Comparing hashes across that whole class drops distinct species whose
    caps hash within a few bits. Species classes still share one bucket,
    including synonym GBIF names of the same label.
    """
    class_id = str(record["class_id"])
    taxon = str(record.get("taxon_name") or "")
    if class_id == "unknown_mushroom" and taxon:
        return f"{class_id}\n{taxon}"
    return class_id


def dedup_records(records: list[dict], hash_distance: int = 2) -> tuple[list[dict], list[dict]]:
    """Keep the largest file when sha256 matches, then drop near-duplicates.

    A photo is a near-duplicate when its dHash or its pHash is within
    `hash_distance` (default 2) of one already kept in the same bucket.
    Records with neither hash are kept after the sha256 pass.
    """
    by_hash: dict[tuple[str, str], dict] = {}
    for record in records:
        digest = record.get("sha256")
        if not digest:
            raise ValueError("record is missing sha256")
        key = (record["class_id"], digest)
        current = by_hash.get(key)
        if current is None or int(record.get("bytes") or 0) > int(current.get("bytes") or 0):
            by_hash[key] = record
    unique = list(by_hash.values())

    kept: list[dict] = []
    dropped: list[dict] = []
    seen_hashes: dict[str, list[tuple[int | None, int | None]]] = {}
    ordered = sorted(unique, key=lambda item: int(item.get("bytes") or 0), reverse=True)
    for record in ordered:
        bucket = _hash_bucket(record)
        dhash = record.get("dhash")
        phash = record.get("phash")
        if dhash is None and phash is None:
            kept.append(record)
            continue
        too_close = False
        for previous_d, previous_p in seen_hashes.get(bucket, []):
            if dhash is not None and previous_d is not None and hamming(int(dhash), int(previous_d)) <= hash_distance:
                too_close = True
                break
            if phash is not None and previous_p is not None and hamming(int(phash), int(previous_p)) <= hash_distance:
                too_close = True
                break
        if too_close:
            dropped.append({**record, "drop_reason": "perceptual_near_duplicate"})
            continue
        seen_hashes.setdefault(bucket, []).append(
            (None if dhash is None else int(dhash), None if phash is None else int(phash))
        )
        kept.append(record)
    return kept, dropped


def _license_rank(record: dict) -> int:
    """Prefer a versioned CC0 row over CC BY, and either over a training-only row."""
    from import_external import exact_license_usage

    normalized = record.get("license_normalized")
    usage = exact_license_usage(normalized)
    if usage == "publishable" and str(normalized).startswith("cc0-"):
        return 2
    if usage == "publishable":
        return 1
    url = record.get("license_url")
    kind = classify_license_column(
        record.get("license") if isinstance(record.get("license"), str) else None,
        url if isinstance(url, str) else None,
    )
    if kind == "cc0":
        return 2
    if kind == "cc-by":
        return 1
    return 0


def _class_conflict_indexes(records: list[dict]) -> dict[int, list[str]]:
    """Indexes whose photo or observation id is tied to more than one species.

    Every row of that id is listed. File order does not pick a label.
    """
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
        for key in photo_identity_keys(record):
            previous = owner.get(key)
            if previous is None:
                owner[key] = index
            else:
                union(index, previous)
    photo_members: dict[int, list[int]] = defaultdict(list)
    for index in range(count):
        photo_members[find(index)].append(index)

    conflict: dict[int, set[str]] = defaultdict(set)
    for indexes in photo_members.values():
        labels = sorted({str(records[index].get("class_id") or "") for index in indexes})
        if len(labels) > 1:
            for index in indexes:
                conflict[index].update(labels)

    by_observation: dict[str, list[int]] = defaultdict(list)
    for index, record in enumerate(records):
        for key in observation_identity_keys(record):
            by_observation[key].append(index)
    for indexes in by_observation.values():
        labels = sorted({str(records[index].get("class_id") or "") for index in indexes})
        if len(labels) > 1:
            for index in indexes:
                conflict[index].update(labels)
    return {index: sorted(labels) for index, labels in conflict.items()}


def dedup_by_identity(records: list[dict]) -> tuple[list[dict], list[dict]]:
    """Drop a repeated photo id before the split.

    The same photo, or the same observation id, under two species drops every
    row of that id. Those rows are listed with ``drop_reason`` ``class_conflict``.
    Two different photos that share an observation and one species are kept.
    A second copy of one photo keeps the versioned CC0 or CC BY row.
    A second copy of an observation that does not add a photo id is dropped.
    """
    conflicts = _class_conflict_indexes(records)
    dropped: list[dict] = []
    remaining: list[dict] = []
    for index, record in enumerate(records):
        labels = conflicts.get(index)
        if labels:
            dropped.append({**record, "drop_reason": "class_conflict", "conflict_classes": labels})
        else:
            remaining.append(record)

    count = len(remaining)
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
    photos: list[list[str]] = []
    for index, record in enumerate(remaining):
        found = photo_identity_keys(record)
        photos.append(found)
        for key in found:
            previous = owner.get(key)
            if previous is None:
                owner[key] = index
            else:
                union(index, previous)

    members: dict[int, list[int]] = defaultdict(list)
    for index in range(count):
        members[find(index)].append(index)
    winner_of: dict[int, int] = {}
    for indexes in members.values():
        winner = min(indexes, key=lambda index: (-_license_rank(remaining[index]), index))
        for index in indexes:
            winner_of[index] = winner

    seen_observation: set[str] = set()
    kept: list[dict] = []
    emitted: set[int] = set()
    for index, record in enumerate(remaining):
        winner = winner_of[index]
        if winner in emitted or index != winner:
            continue
        emitted.add(winner)
        for other in members[find(winner)]:
            if other != winner:
                dropped.append({**remaining[other], "drop_reason": "duplicate_photo_id"})
        chosen = remaining[winner]
        observed = observation_identity_keys(chosen)
        if not photos[winner] and any(key in seen_observation for key in observed):
            dropped.append({**chosen, "drop_reason": "duplicate_observation_id"})
            continue
        seen_observation.update(observed)
        kept.append(chosen)
    return kept, dropped


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
