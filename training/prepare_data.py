"""Dedup, write the 224px training PNGs, then split without identity leakage.

Repeated photo ids are dropped first. The split groups a photographer and
an observation into one of train, val, or test. Atlas gallery photos that
match by image URL, mo_observation_id, or the iNaturalist observation id in
source_url stay out of test. A match that still lands in test stops the run.

    python training/prepare_data.py
    python training/prepare_data.py --with-external
    python training/prepare_data.py --publishable-only
    python training/prepare_data.py --gallery-csv /path/galeria/manifest_gallery.csv

Reads ``attributions.jsonl``. ``external.jsonl`` is read only with
``--with-external``. Unverified rows are skipped. ``--publishable-only``
also skips ``usage=training_only`` (CC BY-NC and Danish Fungi 2020). The split
salt is ``GRZYBOBRANIE_SPLIT_SALT`` or a file outside the repo. Corrupt files
are skipped. The cached PNG is EXIF-oriented and area-resized to the
model input, which is what the phone feeds the network.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np

from dataset_manifest import build_dataset_manifest
from dedup import dedup_by_identity, dedup_records, dropped_per_class, write_jsonl
from gallery_exclusion import (
    GalleryLeakError,
    assert_gallery_absent_from_test,
    gallery_csv_paths,
    load_pipeline_exclusion,
    record_matches_gallery,
)
from import_external import training_eligible
from manifest import ROOT, load_manifest
from preprocess import MODEL_INPUT_SIZE, ImageReadError, load_oriented_rgb, write_model_png
from split import split_by_observation, split_key_summary
from split_salt import SplitSaltError, load_split_salt

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


def _attribution_sources(data_dir: Path | None = None, *, with_external: bool = False) -> list[Path]:
    """GBIF attributions. ``external.jsonl`` is included only when asked.

    A present ``external.jsonl`` is not loaded by itself. ``--with-external``
    is the switch, and a missing file is then an error.
    """
    directory = DATA_DIR if data_dir is None else data_dir
    sources = []
    primary = directory / "attributions.jsonl"
    if primary.is_file():
        sources.append(primary)
    if not with_external:
        return sources
    external = directory / "external.jsonl"
    if not external.is_file():
        raise SystemExit(
            "missing training/data/external.jsonl. Run import_external.py before --with-external."
        )
    sources.append(external)
    return sources


def _usable_records(sources: list[Path], *, publishable_only: bool = False) -> tuple[list[dict], list[dict]]:
    """Decode every downloaded photo. Skip corrupt files instead of aborting.

    Unverified external rows never enter the set. ``publishable_only`` also
    drops ``usage=training_only`` (CC BY-NC and Danish Fungi 2020).
    """
    records = []
    skipped = []
    for source in sources:
        skipped.extend(_usable_records_one(source, records, publishable_only=publishable_only))
    return records, skipped


def _usable_records_one(source: Path, records: list[dict], *, publishable_only: bool) -> list[dict]:
    skipped = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not training_eligible(row, publishable_only=publishable_only):
            if row.get("downloaded"):
                reason = "unverified" if row.get("unverified") is True else "training_only"
                skipped.append({**row, "skip_reason": reason})
            continue
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
    return skipped


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


def assign_splits(records: list[dict], *, salt: str, exclusion) -> tuple[dict[str, list[dict]], list[dict]]:
    """Train/val/test split. Identity dedup has already run. A gallery photo in test raises."""
    withheld: list[dict] = []
    splits = split_by_observation(
        records,
        salt=salt,
        test_blocked=lambda row: record_matches_gallery(row, exclusion),
        withheld=withheld,
    )
    assert_gallery_absent_from_test(splits, exclusion)
    return splits, withheld


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Dedup photos and write a leak-free train/val/test split")
    parser.add_argument(
        "--with-external",
        action="store_true",
        help="Also read training/data/external.jsonl. Without this flag that file is ignored.",
    )
    parser.add_argument(
        "--publishable-only",
        action="store_true",
        help="Drop usage=training_only rows (CC BY-NC and DF20) before dedup and split.",
    )
    parser.add_argument(
        "--gallery-csv",
        action="append",
        default=[],
        help="Atlas gallery CSV (image_url, source_url, mo_observation_id). Repeat to add files. A test-set match stops the run.",
    )
    parser.add_argument(
        "--gallery-config",
        help="JSON file with a gallery_csvs list. Paths are relative to that file.",
    )
    parser.add_argument(
        "--component-share-config",
        help="JSON acknowledgement list for classes over the per-class component-share limit.",
    )
    args = parser.parse_args(argv)
    try:
        salt = load_split_salt()
        csv_paths = gallery_csv_paths(args.gallery_csv, args.gallery_config)
        exclusion = load_pipeline_exclusion(csv_paths)
        from component_share import load_share_config

        share_config = load_share_config(Path(args.component_share_config) if args.component_share_config else None)
    except (SplitSaltError, ValueError, OSError, json.JSONDecodeError) as error:
        raise SystemExit(str(error)) from error
    sources = _attribution_sources(with_external=args.with_external)
    if not sources:
        raise SystemExit(
            "missing training/data/attributions.jsonl. Run fetch_gbif.py first. "
            "External rows need --with-external after import_external.py."
        )
    manifest = load_manifest()
    size = int(manifest["input"]["size"])
    records, skipped = _usable_records(sources, publishable_only=args.publishable_only)
    records, identity_dropped = dedup_by_identity(records)
    kept, dropped = dedup_records(records)
    prepared, prepare_skipped = _cache_model_pngs(kept, size)
    skipped.extend(prepare_skipped)
    try:
        splits, withheld = assign_splits(prepared, salt=salt, exclusion=exclusion)
    except GalleryLeakError as error:
        raise SystemExit(str(error)) from error
    write_jsonl(DATA_DIR / "attributions.dedup.jsonl", prepared)
    identity_reasons = dict(Counter(row.get("drop_reason") or "" for row in identity_dropped))
    class_conflicts = [
        {
            "class_id": row.get("class_id"),
            "conflict_classes": row.get("conflict_classes"),
            "file": row.get("file"),
            "image_url": row.get("image_url"),
            "inat_photo_id": row.get("inat_photo_id"),
            "inat_observation_id": row.get("inat_observation_id"),
        }
        for row in identity_dropped
        if row.get("drop_reason") == "class_conflict"
    ]
    (DATA_DIR / "dedup_report.json").write_text(
        json.dumps(
            {
                "kept": len(prepared),
                "dropped": len(dropped),
                "dropped_per_class": dropped_per_class(dropped),
                "hash": "dhash_or_phash_threshold_2",
                "identity_dropped": len(identity_dropped),
                "identity_dropped_reasons": identity_reasons,
                "class_conflicts": class_conflicts,
                "held_out_withheld": len(withheld),
                "skipped_corrupt_or_unreadable": len(skipped),
                "model_png_size": size or MODEL_INPUT_SIZE,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    serializable = {name: rows for name, rows in splits.items()}
    (DATA_DIR / "splits.json").write_text(json.dumps(serializable, ensure_ascii=False), encoding="utf-8")
    counts = {name: dict(Counter(row["class_id"] for row in rows)) for name, rows in splits.items()}
    (DATA_DIR / "split_counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    (DATA_DIR / "split_groups.json").write_text(
        json.dumps(split_key_summary(prepared), indent=2),
        encoding="utf-8",
    )
    dataset_manifest = build_dataset_manifest(splits, salt=salt, share_config=share_config, withheld=withheld)
    (DATA_DIR / "dataset_manifest.json").write_text(
        json.dumps(dataset_manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    hard = dataset_manifest["component_share"]["hard_stop_classes"]
    if hard:
        raise SystemExit(
            "per-class component share or empty val/test stops the run for: "
            + ", ".join(hard)
            + ". Add an explicit acknowledgement with a reason, or widen the class. "
            "Acknowledged classes are written into dataset_manifest.json and block shipping."
        )
    print(json.dumps({name: len(rows) for name, rows in splits.items()}))


if __name__ == "__main__":
    main()
