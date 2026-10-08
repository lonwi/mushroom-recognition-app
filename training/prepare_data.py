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

from dedup import average_hash_bits, dedup_records, write_jsonl
from manifest import ROOT, load_manifest
from preprocess import MODEL_INPUT_SIZE, ImageReadError, load_oriented_rgb, write_model_png
from split import split_by_observation

DATA_DIR = ROOT / "training" / "data"


def _average_hash(rgb) -> int:
    from PIL import Image

    image = Image.fromarray(rgb, mode="RGB").convert("L").resize((8, 8))
    pixels = list(image.getdata())
    grid = [pixels[row * 8 : (row + 1) * 8] for row in range(8)]
    return average_hash_bits(grid)


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
            row["average_hash"] = _average_hash(rgb)
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
    print(json.dumps({name: len(rows) for name, rows in splits.items()}))


if __name__ == "__main__":
    main()
