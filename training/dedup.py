"""Drop exact byte duplicates and near-duplicate photos inside one class."""

from __future__ import annotations

import hashlib
import json
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


def _hash_bucket(record: dict) -> str:
    """Near-duplicates of unknown_mushroom are per taxon, not per class.

    Every probe and every held-out name shares class_id unknown_mushroom.
    Comparing 8x8 hashes across that whole class drops distinct species whose
    caps hash within a few bits, which is what cut Conocybe filaris from 78
    licensed photos to 33. Species classes still share one bucket, including
    synonym GBIF names of the same label.
    """
    class_id = str(record["class_id"])
    taxon = str(record.get("taxon_name") or "")
    if class_id == "unknown_mushroom" and taxon:
        return f"{class_id}\n{taxon}"
    return class_id


def dedup_records(records: list[dict], hash_distance: int = 4) -> tuple[list[dict], list[dict]]:
    """Keep the largest file when sha256 matches, then drop near-duplicates.

    `average_hash` may be absent. Records without it are kept after the sha256 pass.
    Near-duplicate comparison uses `_hash_bucket`.
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
    seen_hashes: dict[str, list[int]] = {}
    ordered = sorted(unique, key=lambda item: int(item.get("bytes") or 0), reverse=True)
    for record in ordered:
        bucket = _hash_bucket(record)
        photo_hash = record.get("average_hash")
        if photo_hash is None:
            kept.append(record)
            continue
        photo_hash = int(photo_hash)
        too_close = False
        for previous in seen_hashes.get(bucket, []):
            if hamming(photo_hash, previous) <= hash_distance:
                too_close = True
                break
        if too_close:
            dropped.append({**record, "drop_reason": "perceptual_near_duplicate"})
            continue
        seen_hashes.setdefault(bucket, []).append(photo_hash)
        kept.append(record)
    return kept, dropped


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
