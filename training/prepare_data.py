"""Dedup, write the 224px training PNGs, then split by observation.

    python training/prepare_data.py

Corrupt files are skipped. The cached PNG is EXIF-oriented and area-resized
to the model input, which is what the phone feeds the network.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np

from dedup import dedup_records, dropped_per_class, write_jsonl
from manifest import ROOT, load_manifest
from preprocess import MODEL_INPUT_SIZE, ImageReadError, load_oriented_rgb, write_model_png
from split import split_by_observation, split_key_summary

DATA_DIR = ROOT / "training" / "data"


_DCT32: np.ndarray | None = None


def _dct32_matrix() -> np.ndarray:
    """Same unnormalized DCT-II cosines as dedup._dct_1d, computed once."""
    global _DCT32
    if _DCT32 is None:
        count = 32
        matrix = np.empty((count, count), dtype=np.float64)
        for freq in range(count):
            scale = math.pi * freq / (2 * count)
            for index in range(count):
                matrix[freq, index] = math.cos(scale * (2 * index + 1))
        _DCT32 = matrix
    return _DCT32


def _pack_bits(flags: np.ndarray) -> int:
    flat = np.ascontiguousarray(flags, dtype=np.uint8).reshape(-1)
    return int.from_bytes(np.packbits(flat).tobytes(), "big")


def _dhash_from_gray8x9(gray: np.ndarray) -> int:
    pixels = np.asarray(gray)
    if pixels.shape != (8, 9):
        raise ValueError("dHash expects an 8x9 gray grid")
    return _pack_bits(pixels[:, :-1] > pixels[:, 1:])


def _phash_from_gray32(gray: np.ndarray) -> int:
    """Low-frequency pHash. Bits match dedup.perceptual_hash_bits.

    Each coefficient is summed left to right, one input sample at a time,
    in float64. That is the pure-Python order, so flat images do not flip
    bits the way a BLAS dot can when values sit on the median.
    """
    pixels = np.asarray(gray, dtype=np.float64)
    if pixels.shape != (32, 32):
        raise ValueError("pHash expects a 32x32 gray grid")
    matrix = _dct32_matrix()
    rows = np.zeros((32, 32), dtype=np.float64)
    for index in range(32):
        rows += pixels[:, index][:, None] * matrix[:, index][None, :]
    columns = np.zeros((32, 32), dtype=np.float64)
    for y in range(32):
        columns += matrix[:, y][:, None] * rows[y, :][None, :]
    block = columns[:8, :8].reshape(-1)
    median = np.sort(block)[(block.size - 1) // 2]
    return _pack_bits(block > median)


def _perceptual_hashes(rgb) -> tuple[int, int]:
    """dHash and pHash. Bits match dedup.difference_hash_bits and perceptual_hash_bits.

    The grayscale photo is resized once to 9×8 and once to 32×32. The previous
    loop called resize inside the row slice, so a full-resolution photo was
    resized eight times. Pillow's default resample is unchanged.
    """
    from PIL import Image

    gray = Image.fromarray(rgb, mode="RGB").convert("L")
    dhash = _dhash_from_gray8x9(np.asarray(gray.resize((9, 8))))
    phash = _phash_from_gray32(np.asarray(gray.resize((32, 32))))
    return dhash, phash


def _usable_records(source: Path) -> tuple[list[dict], list[dict]]:
    """Decode every downloaded photo. Skip corrupt files instead of aborting."""
    records = []
    skipped = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not row.get("downloaded"):
            continue
        path = DATA_DIR / row["file"]
        if not path.is_file():
            skipped.append({**row, "skip_reason": "missing_file"})
            print(f"skip missing {path}", file=sys.stderr)
            continue
        try:
            payload = path.read_bytes()
            rgb = load_oriented_rgb(path)
            row["dhash"], row["phash"] = _perceptual_hashes(rgb)
        except (ImageReadError, OSError, ValueError) as error:
            skipped.append({**row, "skip_reason": "corrupt", "error": str(error)})
            print(f"skip corrupt {path}: {error}", file=sys.stderr)
            continue
        row["sha256"] = hashlib.sha256(payload).hexdigest()
        row["bytes"] = len(payload)
        records.append(row)
    return records, skipped


def _cache_model_pngs(records: list[dict], size: int) -> tuple[list[dict], list[dict]]:
    kept = []
    skipped = []
    for row in records:
        source = DATA_DIR / row["file"]
        relative = Path("prepared") / f"{size}" / row["class_id"] / f"{Path(row['file']).stem}.png"
        destination = DATA_DIR / relative
        try:
            rgb = load_oriented_rgb(source)
            write_model_png(rgb, destination, size)
        except (ImageReadError, OSError, ValueError) as error:
            skipped.append({**row, "skip_reason": "prepare_failed", "error": str(error)})
            print(f"skip prepare {source}: {error}", file=sys.stderr)
            continue
        row["prepared_file"] = str(relative).replace("\\", "/")
        kept.append(row)
    return kept, skipped


def main() -> None:
    source = DATA_DIR / "attributions.jsonl"
    if not source.is_file():
        raise SystemExit("missing training/data/attributions.jsonl. Run fetch_gbif.py first.")
    manifest = load_manifest()
    size = int(manifest["input"]["size"])
    records, skipped = _usable_records(source)
    kept, dropped = dedup_records(records)
    prepared, prepare_skipped = _cache_model_pngs(kept, size)
    skipped.extend(prepare_skipped)
    write_jsonl(DATA_DIR / "attributions.dedup.jsonl", prepared)
    (DATA_DIR / "dedup_report.json").write_text(
        json.dumps(
            {
                "kept": len(prepared),
                "dropped": len(dropped),
                "dropped_per_class": dropped_per_class(dropped),
                "hash": "dhash_or_phash_threshold_2",
                "skipped_corrupt_or_unreadable": len(skipped),
                "model_png_size": size or MODEL_INPUT_SIZE,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    splits = split_by_observation(prepared)
    serializable = {name: rows for name, rows in splits.items()}
    (DATA_DIR / "splits.json").write_text(json.dumps(serializable, ensure_ascii=False), encoding="utf-8")
    counts = {name: dict(Counter(row["class_id"] for row in rows)) for name, rows in splits.items()}
    (DATA_DIR / "split_counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    (DATA_DIR / "split_groups.json").write_text(
        json.dumps(split_key_summary(prepared), indent=2),
        encoding="utf-8",
    )
    print(json.dumps({name: len(rows) for name, rows in splits.items()}))


if __name__ == "__main__":
    main()
