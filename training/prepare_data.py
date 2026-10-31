"""Dedup, cap each person inside each class, write the 224px training PNGs, then split.

Repeated photo ids are dropped first. After both dedup passes, each person
is capped inside each class (``person_cap.py``). N is the row count of that
class at that moment. Removed rows stay in the source files. The split then
groups a photographer and an observation into one of train, val, or test.
Atlas gallery photos that match by image URL, mo_observation_id, or the
iNaturalist observation id in source_url stay out of test. A match that
still lands in test stops the run.

    python training/prepare_data.py
    python training/prepare_data.py --with-external
    python training/prepare_data.py --publishable-only
    python training/prepare_data.py --gallery-csv /path/galeria/manifest_gallery.csv

Reads ``attributions.jsonl``. ``external.jsonl`` is read only with
``--with-external``. Unverified rows are skipped. ``--publishable-only``
also skips ``usage=training_only`` (CC BY-NC, CC BY-SA, and Danish Fungi 2020).
Without that flag CC BY-NC and CC BY-SA stay in the training set. Danish
Fungi 2020 stays out unless ``--include-df20`` is also set; those rows are
counted as ``excluded_df20``. Those rows are experimental training only:
any DF20 row keeps ``shippable`` false, and ``DF20_CONSENT_CONFIRMED``
cannot clear that. The split
salt is ``GRZYBOBRANIE_SPLIT_SALT`` or a file outside the repo. Corrupt files
are skipped. The cached PNG is EXIF-oriented and area-resized to the
model input, which is what the phone feeds the network. An unacknowledged
class over the per-class component-share limit, or with an empty val or test,
stops the run before any split file or dataset manifest is written.
``person_cap_report.json`` is written with the other prepare outputs and is
removed with them when that hard stop fires. Its ``author_cap_report``
is one entry per class: N, the computed cap, and each person's kept and
cut counts. Cut rows still list a reason and photo ids.
Unverified rows and both dedup passes run before the cap, so those rows
are not in N and do not take a slot. Kept rows are ordered by the seeded
photo-id hash, not by the order of the source files.
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
from person_cap import apply_person_class_cap
from preprocess import MODEL_INPUT_SIZE, ImageReadError, load_oriented_rgb, write_model_png
from split import split_by_observation, split_key_summary
from split_salt import SplitSaltError, load_split_salt

DATA_DIR = ROOT / "training" / "data"
_PREPARE_OUTPUTS = (
    "attributions.dedup.jsonl",
    "dedup_report.json",
    "person_cap_report.json",
    "splits.json",
    "split_counts.json",
    "split_groups.json",
    "dataset_manifest.json",
)


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


def _usable_records(
    sources: list[Path],
    *,
    publishable_only: bool = False,
    include_df20: bool = False,
) -> tuple[list[dict], list[dict]]:
    """Decode every downloaded photo. Skip corrupt files instead of aborting.

    Unverified external rows never enter the set. ``publishable_only`` also
    drops ``usage=training_only`` (CC BY-NC, CC BY-SA, and Danish Fungi 2020).
    Without that flag ``--with-external`` keeps CC BY-NC and CC BY-SA.
    DF20 is kept only with ``include_df20`` (``--include-df20``). Otherwise
    each DF20 row is skipped and counted as ``df20_opt_out``.
    """
    records = []
    skipped = []
    for source in sources:
        skipped.extend(
            _usable_records_one(
                source,
                records,
                publishable_only=publishable_only,
                include_df20=include_df20,
            )
        )
    return records, skipped


def _usable_records_one(
    source: Path,
    records: list[dict],
    *,
    publishable_only: bool,
    include_df20: bool = False,
) -> list[dict]:
    from component_share import is_df20_row

    skipped = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not include_df20 and is_df20_row(row):
            skipped.append({**row, "skip_reason": "df20_opt_out"})
            continue
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


def records_for_split(
    records: list[dict],
) -> tuple[list[dict], list[dict], list[dict], list[dict], dict]:
    """Identity dedup, perceptual dedup, then the per-person cap.

    Call this after sources are merged (``_usable_records``) and before the
    PNG cache and ``assign_splits``. N is defined in ``person_cap.N_DEFINITION``:
    the rows of one class that remain after both dedup passes.
    """
    deduped, identity_dropped = dedup_by_identity(records)
    kept, dropped = dedup_records(deduped)
    capped, cap_removed, cap_report = apply_person_class_cap(kept)
    return capped, dropped, identity_dropped, cap_removed, cap_report


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
        help="Drop usage=training_only rows (CC BY-NC, CC BY-SA, and DF20) before dedup and split.",
    )
    parser.add_argument(
        "--include-df20",
        action="store_true",
        help=(
            "With --with-external, keep Danish Fungi 2020 rows. The default excludes "
            "them and counts excluded_df20. CC BY-NC and CC BY-SA are unaffected. "
            "DF20 is experimental only: any such row keeps shippable false."
        ),
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
    records, skipped = _usable_records(
        sources,
        publishable_only=args.publishable_only,
        include_df20=args.include_df20,
    )
    capped, dropped, identity_dropped, _cap_removed, cap_report = records_for_split(records)
    prepared, prepare_skipped = _cache_model_pngs(capped, size)
    skipped.extend(prepare_skipped)
    try:
        splits, withheld = assign_splits(prepared, salt=salt, exclusion=exclusion)
    except GalleryLeakError as error:
        raise SystemExit(str(error)) from error
    write_prepare_outputs(
        DATA_DIR,
        prepared=prepared,
        splits=splits,
        dropped=dropped,
        identity_dropped=identity_dropped,
        skipped=skipped,
        withheld=withheld,
        salt=salt,
        share_config=share_config,
        model_png_size=size or MODEL_INPUT_SIZE,
        cap_report=cap_report,
    )
    print(json.dumps({name: len(rows) for name, rows in splits.items()}))


def write_prepare_outputs(
    directory: Path,
    *,
    prepared: list[dict],
    splits: dict[str, list[dict]],
    dropped: list[dict],
    identity_dropped: list[dict],
    skipped: list,
    withheld: list[dict],
    salt: str,
    share_config: dict,
    model_png_size: int,
    cap_report: dict | None = None,
) -> dict:
    """Write split artifacts after the per-class hard stop.

    The manifest is built in memory first. An unacknowledged class over the
    component-share limit, or with an empty val or test, raises ``SystemExit``
    and leaves the directory without ``splits.json`` or ``dataset_manifest.json``.
    """
    dataset_manifest = build_dataset_manifest(
        splits,
        salt=salt,
        share_config=share_config,
        withheld=withheld,
    )
    hard = list(dataset_manifest["component_share"]["hard_stop_classes"])
    if hard:
        for name in _PREPARE_OUTPUTS:
            path = directory / name
            if path.is_file():
                path.unlink()
        raise SystemExit(
            "per-class component share or empty val/test stops the run for: "
            + ", ".join(hard)
            + ". No split files were written. "
            "Add an explicit acknowledgement with a reason, or widen the class. "
            "Acknowledged classes are recorded in the manifest as ship blockers, so the model is not shippable."
        )
    directory.mkdir(parents=True, exist_ok=True)
    write_jsonl(directory / "attributions.dedup.jsonl", prepared)
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
    (directory / "dedup_report.json").write_text(
        json.dumps(
            {
                "kept": len(prepared),
                "dropped": len(dropped),
                "dropped_per_class": dropped_per_class(dropped),
                "hash": "dhash_or_phash_threshold_2",
                "identity_dropped": len(identity_dropped),
                "identity_dropped_reasons": identity_reasons,
                "dropped_looser_license": sum(
                    1 for row in identity_dropped if row.get("drop_reason") == "looser_license"
                ),
                "class_conflicts": class_conflicts,
                "held_out_withheld": len(withheld),
                "skipped_corrupt_or_unreadable": len(skipped),
                "excluded_df20": sum(
                    1 for row in skipped if isinstance(row, dict) and row.get("skip_reason") == "df20_opt_out"
                ),
                "model_png_size": model_png_size,
                "person_cap_removed": 0 if not cap_report else int(cap_report.get("removed_rows") or 0),
                "author_cap_report": None if cap_report is None else "person_cap_report.json",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    if cap_report is not None:
        (directory / "person_cap_report.json").write_text(
            json.dumps(cap_report, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    serializable = {name: rows for name, rows in splits.items()}
    (directory / "splits.json").write_text(json.dumps(serializable, ensure_ascii=False), encoding="utf-8")
    counts = {name: dict(Counter(row["class_id"] for row in rows)) for name, rows in splits.items()}
    (directory / "split_counts.json").write_text(json.dumps(counts, indent=2), encoding="utf-8")
    (directory / "split_groups.json").write_text(
        json.dumps(split_key_summary(prepared), indent=2),
        encoding="utf-8",
    )
    (directory / "dataset_manifest.json").write_text(
        json.dumps(dataset_manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return dataset_manifest


if __name__ == "__main__":
    main()
