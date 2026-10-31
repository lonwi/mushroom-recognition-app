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
The input tree (CSV files, ``attributions.jsonl``, and ``external.jsonl``)
is hashed before those outputs are written. ``*.bak``, ``__pycache__``, and
logs are left out. That digest is ``input_tree_sha256``, not the sha256 of a
``.tgz``. ``SHA256SUMS``, when present, is standard ``sha256sum`` output:
one ``<hex>  <relative path>`` line per file (a ``*`` marks binary mode).
Each listed file is checked. An absolute path, a ``..`` segment, a missing
file, a hash mismatch, or a CSV or script that is not listed stops the run
and removes any previous split files. A missing ``SHA256SUMS`` is recorded
as ``sums_checked: false``. ``--input-archive`` or
``GRZYBOBRANIE_INPUT_ARCHIVE`` records ``input_archive_sha256``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
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
_CHECKSUM_FILE = "SHA256SUMS"
_PACKAGE_SKIP_DIRS = frozenset({"__pycache__", "logs"})
_SCRIPT_SUFFIXES = frozenset({".py", ".sh", ".bash", ".zsh", ".js", ".mjs", ".cjs"})
_HEX_DIGITS = frozenset("0123456789abcdef")
_ARCHIVE_PATH_ENV = "GRZYBOBRANIE_INPUT_ARCHIVE"
_ARCHIVE_SHA_ENV = "GRZYBOBRANIE_INPUT_ARCHIVE_SHA256"
_PREPARE_OUTPUTS = (
    "attributions.dedup.jsonl",
    "dedup_report.json",
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


def _package_relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _is_input_package_file(path: Path, root: Path) -> bool:
    """CSV and attribution inputs. Outputs, backups, caches, and logs are not."""
    relative = _package_relative(path, root)
    parts = relative.split("/")
    if any(part in _PACKAGE_SKIP_DIRS for part in parts[:-1]):
        return False
    name = parts[-1]
    if name in {_CHECKSUM_FILE, "attributions.dedup.jsonl"}:
        return False
    if name.endswith(".bak") or name.endswith(".log"):
        return False
    if name.endswith(".csv"):
        return True
    return name in {"attributions.jsonl", "external.jsonl"}


def input_package_files(root: Path) -> list[Path]:
    """Package files in relative-path order. Missing directory means no files."""
    if not root.is_dir():
        return []
    found = [path for path in root.rglob("*") if path.is_file() and _is_input_package_file(path, root)]
    return sorted(found, key=lambda path: _package_relative(path, root))


def input_tree_sha256(root: Path) -> str:
    """Custom tree digest. This is not the sha256 of a versioned ``.tgz``.

    SHA-256 over sorted relative paths plus each file's bytes. File order on
    disk does not change the digest. One changed byte does.
    """
    digest = hashlib.sha256()
    for path in input_package_files(root):
        payload = path.read_bytes()
        relative = _package_relative(path, root).encode("utf-8")
        digest.update(relative)
        digest.update(b"\0")
        digest.update(len(payload).to_bytes(8, "big"))
        digest.update(payload)
        digest.update(b"\0")
    return digest.hexdigest()


def _file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _is_hex_digest(token: str) -> bool:
    return len(token) == 64 and all(character in _HEX_DIGITS for character in token)


def _must_be_listed(path: Path, root: Path) -> bool:
    """CSV, attribution input, or script that may not sit outside SHA256SUMS."""
    if not _is_input_package_file(path, root) and not _is_script_file(path, root):
        return False
    return True


def _is_script_file(path: Path, root: Path) -> bool:
    relative = _package_relative(path, root)
    parts = relative.split("/")
    if any(part in _PACKAGE_SKIP_DIRS for part in parts[:-1]):
        return False
    name = parts[-1]
    if name.endswith(".bak") or name.endswith(".log"):
        return False
    return any(name.lower().endswith(suffix) for suffix in _SCRIPT_SUFFIXES)


def _files_that_must_be_listed(root: Path) -> list[str]:
    if not root.is_dir():
        return []
    found = []
    for path in root.rglob("*"):
        if path.is_file() and _must_be_listed(path, root):
            found.append(_package_relative(path, root))
    return sorted(found)


def _unescape_sha256sum_name(name: str) -> str:
    """Undo the escapes ``sha256sum`` uses when a name contains ``\\`` or a newline."""
    return name.replace("\\\\", "\\").replace("\\n", "\n")


def _parse_sha256sum_line(line: str) -> tuple[str, str]:
    """``<64 hex><space><space or *><path>`` as written by ``sha256sum``."""
    raw = line[:-1] if line.endswith("\n") else line
    if raw.startswith("\\"):
        raw = _unescape_sha256sum_name(raw[1:])
    if len(raw) < 67 or raw[64] != " " or raw[65] not in (" ", "*"):
        raise SystemExit(f"SHA256SUMS line is not sha256sum output: {line.strip()!r}")
    digest = raw[:64].lower()
    if not _is_hex_digest(digest):
        raise SystemExit(f"SHA256SUMS digest is not 64 hex digits: {raw[:64]!r}")
    name = raw[66:]
    if not name:
        raise SystemExit("SHA256SUMS line has an empty path")
    return digest, name


def _reject_unsafe_sum_path(relative: str) -> None:
    if not relative or relative.startswith(("/", "\\")):
        raise SystemExit(f"SHA256SUMS path is absolute: {relative}")
    normalized = relative.replace("\\", "/")
    if normalized.startswith("/"):
        raise SystemExit(f"SHA256SUMS path is absolute: {relative}")
    parts = normalized.split("/")
    head = parts[0]
    if len(head) >= 2 and head[1] == ":":
        raise SystemExit(f"SHA256SUMS path is absolute: {relative}")
    if any(part in ("", "..") for part in parts):
        raise SystemExit(f"SHA256SUMS path escapes the package: {relative}")


def _locate_sha256sums(root: Path) -> tuple[Path, Path] | None:
    """Return the checksum file and the directory its paths are relative to.

    The versioned package keeps the list at ``zdjecia/SHA256SUMS``. Those
    paths (``zdjecia/sample.csv``) are relative to the directory above
    ``zdjecia/``, which is ``root`` when prepare is pointed at that parent.
    A list sitting directly in ``root`` is relative to ``root``.
    """
    nested = root / "zdjecia" / _CHECKSUM_FILE
    if nested.is_file():
        return nested, root
    direct = root / _CHECKSUM_FILE
    if direct.is_file():
        return direct, direct.parent
    return None


def _normalize_sum_path(name: str) -> str:
    """Drop ``.`` segments. ``..`` has already been rejected."""
    parts = [part for part in name.replace("\\", "/").split("/") if part != "."]
    return "/".join(parts)


def verify_input_package_sums(root: Path) -> dict[str, object]:
    """Check ``SHA256SUMS`` when it is there. A bad list stops prepare.

    The file is ``sha256sum`` output: one line per file, ``<hex>  <relative path>``,
    with ``*`` instead of the second space for binary mode. Paths are relative
    to the package base (the directory above ``zdjecia/`` when the list lives
    at ``zdjecia/SHA256SUMS``). An absolute path, a ``..`` segment, a missing
    file, a hash mismatch, or a CSV or script that is not listed is a hard stop.
    The one skipped line is the checksum file itself: it cannot hold its own
    hash. That line is ``self_entry_ignored`` and is not checked.
    A missing list records ``sums_checked`` false and warns on stderr.
    """
    missed = {
        "sums_checked": False,
        "sha256sums_sha256": None,
        "self_entry_ignored": False,
        "self_entry_path": None,
    }
    located = _locate_sha256sums(root)
    if located is None:
        print(
            "warning: SHA256SUMS is missing; CSV and script files were not checked",
            file=sys.stderr,
        )
        return missed
    path, base = located
    self_rel = _package_relative(path, base)
    try:
        text = path.read_text(encoding="utf-8")
        sums_digest = _file_sha256(path)
    except OSError as error:
        raise SystemExit(f"SHA256SUMS could not be read: {error}") from error
    listed: dict[str, str] = {}
    saw_entry = False
    self_ignored = False
    for raw in text.splitlines():
        if not raw.strip() or raw.strip().startswith("#"):
            continue
        saw_entry = True
        digest, name = _parse_sha256sum_line(raw)
        _reject_unsafe_sum_path(name)
        relative = _normalize_sum_path(name)
        if relative == self_rel:
            self_ignored = True
            continue
        if relative in listed:
            raise SystemExit(f"SHA256SUMS lists {relative} more than once")
        listed[relative] = digest
    if not saw_entry:
        raise SystemExit("SHA256SUMS has no file lines")
    base_resolved = base.resolve()
    for relative, expected in listed.items():
        candidate = (base / relative).resolve()
        if not candidate.is_relative_to(base_resolved):
            raise SystemExit(f"SHA256SUMS path escapes the package: {relative}")
        if not candidate.is_file():
            raise SystemExit(f"SHA256SUMS lists a missing file: {relative}")
        actual = _file_sha256(candidate)
        if actual != expected:
            raise SystemExit(f"SHA256SUMS hash mismatch: {relative}")
    unlisted = [relative for relative in _files_that_must_be_listed(base) if relative not in listed]
    if unlisted:
        raise SystemExit("SHA256SUMS does not list package file: " + ", ".join(unlisted))
    return {
        "sums_checked": True,
        "sha256sums_sha256": sums_digest,
        "self_entry_ignored": self_ignored,
        "self_entry_path": self_rel if self_ignored else None,
    }


def resolve_input_archive_sha256(
    *,
    path: str | None = None,
    digest: str | None = None,
    environ: dict[str, str] | None = None,
) -> str | None:
    """Sha256 of a versioned ``.tgz``, from a path, a digest, or the environment.

    ``GRZYBOBRANIE_INPUT_ARCHIVE`` is the archive path.
    ``GRZYBOBRANIE_INPUT_ARCHIVE_SHA256`` is the digest. A path and a digest
    that disagree stop prepare. Nothing is recorded when neither is set.
    """
    env = os.environ if environ is None else environ
    path_text = (path if path is not None else env.get(_ARCHIVE_PATH_ENV, "")).strip()
    digest_text = (digest if digest is not None else env.get(_ARCHIVE_SHA_ENV, "")).strip().lower()
    computed = None
    if path_text:
        archive = Path(path_text)
        if not archive.is_file():
            raise SystemExit(f"input archive is not a file: {archive}")
        computed = _file_sha256(archive)
    if digest_text:
        if not _is_hex_digest(digest_text):
            raise SystemExit("input archive sha256 is not a sha256 digest")
        if computed is not None and computed != digest_text:
            raise SystemExit(
                "input archive sha256 does not match the archive file "
                f"(flag says {digest_text}, file is {computed})"
            )
        return digest_text
    return computed


def _clear_prepare_outputs(directory: Path) -> None:
    if not directory.is_dir():
        return
    for name in _PREPARE_OUTPUTS:
        path = directory / name
        if path.is_file():
            path.unlink()


def _rejected_per_class(*groups: list) -> dict[str, dict[str, int]]:
    """Count every skipped or dropped prepare row by class and reason.

    A row with no class is ``unmapped``. A row with no reason is ``unknown``,
    so a silent drop still shows up in the report.
    """
    counts: dict[str, Counter[str]] = {}
    for group in groups:
        for row in group:
            if not isinstance(row, dict):
                counts.setdefault("unmapped", Counter())["unknown"] += 1
                continue
            class_id = row.get("class_id")
            label = class_id.strip() if isinstance(class_id, str) and class_id.strip() else "unmapped"
            reason = row.get("skip_reason") or row.get("drop_reason") or ""
            why = str(reason).strip() or "unknown"
            counts.setdefault(label, Counter())[why] += 1
    return {
        class_id: {reason: int(count) for reason, count in sorted(bucket.items())}
        for class_id, bucket in sorted(counts.items())
        if bucket
    }


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
    parser.add_argument(
        "--input-archive",
        help=(
            "Path of the versioned .tgz this prepare used. Its sha256 is recorded as "
            "input_archive_sha256. GRZYBOBRANIE_INPUT_ARCHIVE is the same path."
        ),
    )
    parser.add_argument(
        "--input-archive-sha256",
        help=(
            "Sha256 of that .tgz when the file is not on this machine. "
            "GRZYBOBRANIE_INPUT_ARCHIVE_SHA256 is the same digest. "
            "A path and a digest that disagree stop the run."
        ),
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
    records, identity_dropped = dedup_by_identity(records)
    kept, dropped = dedup_records(records)
    prepared, prepare_skipped = _cache_model_pngs(kept, size)
    skipped.extend(prepare_skipped)
    try:
        splits, withheld = assign_splits(prepared, salt=salt, exclusion=exclusion)
    except GalleryLeakError as error:
        raise SystemExit(str(error)) from error
    archive_sha = resolve_input_archive_sha256(
        path=args.input_archive,
        digest=args.input_archive_sha256,
    )
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
        input_archive_sha256=archive_sha,
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
    input_archive_sha256: str | None = None,
) -> dict:
    """Write split artifacts after the per-class hard stop.

    The manifest is built in memory first. An unacknowledged class over the
    component-share limit, or with an empty val or test, raises ``SystemExit``
    and leaves the directory without ``splits.json`` or ``dataset_manifest.json``.
    ``SHA256SUMS``, when present, is checked before that write. A bad line,
    a missing file, a hash mismatch, or an unlisted CSV or script removes any
    previous split files and stops.
    """
    tree_digest = input_tree_sha256(directory)
    try:
        sums = verify_input_package_sums(directory)
    except SystemExit:
        _clear_prepare_outputs(directory)
        raise
    dataset_manifest = build_dataset_manifest(
        splits,
        salt=salt,
        share_config=share_config,
        withheld=withheld,
        input_tree_sha256=tree_digest,
        sums_checked=bool(sums["sums_checked"]),
        sha256sums_sha256=sums["sha256sums_sha256"] if isinstance(sums["sha256sums_sha256"], str) else None,
        self_entry_ignored=bool(sums["self_entry_ignored"]),
        self_entry_path=sums["self_entry_path"] if isinstance(sums["self_entry_path"], str) else None,
        input_archive_sha256=input_archive_sha256,
    )
    hard = list(dataset_manifest["component_share"]["hard_stop_classes"])
    if hard:
        _clear_prepare_outputs(directory)
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
    rejected_per_class = _rejected_per_class(skipped, identity_dropped, dropped)
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
                "rejected_per_class": rejected_per_class,
                "input_tree_sha256": tree_digest,
                "sums_checked": bool(sums["sums_checked"]),
                "sha256sums_sha256": sums["sha256sums_sha256"],
                "self_entry_ignored": bool(sums["self_entry_ignored"]),
                "self_entry_path": sums["self_entry_path"],
                "input_archive_sha256": input_archive_sha256,
                "excluded_df20": sum(
                    1 for row in skipped if isinstance(row, dict) and row.get("skip_reason") == "df20_opt_out"
                ),
                "model_png_size": model_png_size,
            },
            indent=2,
        ),
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
