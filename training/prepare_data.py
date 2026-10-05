"""Run dedup, then the observation-level split.

    python training/prepare_data.py
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from dedup import dedup_records, write_jsonl
from manifest import ROOT
from split import split_by_observation

DATA_DIR = ROOT / "training" / "data"


def _average_hash(path: Path) -> int | None:
    try:
        from PIL import Image
    except ImportError:
        return None
    with Image.open(path) as image:
        gray = image.convert("L").resize((8, 8))
        pixels = list(gray.getdata())
    grid = [pixels[row * 8 : (row + 1) * 8] for row in range(8)]
    from dedup import average_hash_bits

    return average_hash_bits(grid)


def main() -> None:
    source = DATA_DIR / "attributions.jsonl"
    if not source.is_file():
        raise SystemExit("missing training/data/attributions.jsonl. Run fetch_gbif.py first.")
    records = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not row.get("downloaded"):
            continue
        path = DATA_DIR / row["file"]
        payload = path.read_bytes()
        row["sha256"] = hashlib.sha256(payload).hexdigest()
        row["bytes"] = len(payload)
        row["average_hash"] = _average_hash(path)
        records.append(row)

    kept, dropped = dedup_records(records)
    write_jsonl(DATA_DIR / "attributions.dedup.jsonl", kept)
    (DATA_DIR / "dedup_report.json").write_text(
        json.dumps({"kept": len(kept), "dropped": len(dropped)}, indent=2),
        encoding="utf-8",
    )
    splits = split_by_observation(kept)
    serializable = {name: rows for name, rows in splits.items()}
    (DATA_DIR / "splits.json").write_text(json.dumps(serializable, ensure_ascii=False), encoding="utf-8")
    counts = {name: dict(Counter(row["class_id"] for row in rows)) for name, rows in splits.items()}
    (DATA_DIR / "split_counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    print(json.dumps({name: len(rows) for name, rows in splits.items()}))


if __name__ == "__main__":
    main()
