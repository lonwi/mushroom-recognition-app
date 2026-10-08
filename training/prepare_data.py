"""Dedup, write the 224px training PNGs, then split by observation.

    python training/prepare_data.py

Corrupt files are skipped. The cached PNG is EXIF-oriented and area-resized
to the model input, which is what the phone feeds the network.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

from dedup import dedup_records, difference_hash_bits, dropped_per_class, perceptual_hash_bits, write_jsonl
from manifest import ROOT, load_manifest
from preprocess import MODEL_INPUT_SIZE, ImageReadError, load_oriented_rgb, write_model_png
from split import split_by_observation, split_key_summary

DATA_DIR = ROOT / "training" / "data"


def _perceptual_hashes(rgb) -> tuple[int, int]:
    from PIL import Image

    gray = Image.fromarray(rgb, mode="RGB").convert("L")
    dhash_grid = [
        [pixel for pixel in gray.resize((9, 8)).getdata()][offset : offset + 9] for offset in range(0, 72, 9)
    ]
    phash_image = gray.resize((32, 32))
    phash_grid = [
        [pixel for pixel in phash_image.getdata()][offset : offset + 32] for offset in range(0, 1024, 32)
    ]
    return difference_hash_bits(dhash_grid), perceptual_hash_bits(phash_grid)


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
