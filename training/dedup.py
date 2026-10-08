"""Drop exact byte duplicates and near-duplicate photos inside one class."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path


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


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
