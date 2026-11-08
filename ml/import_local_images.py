"""Import local image files from disk into the training dataset format.

The GBIF fetch in ``fetch_gbif.py`` and the CSV importer in
``import_external.py`` both describe photos that live on a remote URL. This
script is the third path: photos the user already has on their hard drive. It
merges them into ``ml/data/external.jsonl`` using the same row schema,
license decision, and identity dedup as ``import_external.py``.

    python ml/import_local_images.py manifest.csv \
        --staging training/data/local --external training/data/external.jsonl

Unlike ``import_external.py`` this script does not keep ``image_url`` as the
only source of pixels. Each listed image is copied into
``ml/data/local/<class_id>/`` and the row is marked ``downloaded=True``
with ``file`` pointing at the staged copy, so ``prepare_data.py`` consumes it
directly without a network download. That is the whole point of step 1: no
Hugging Face, no new download step, just a merge into the existing JSONL.

Input is a CSV manifest, one row per image. Required columns:

    image, species, author, license, license_url, source_url

``image`` is the path to the file on disk. ``species`` is a scientific name
that the manifest maps to a class id (same matching as ``import_external.py``).
``author`` is the required credit. ``license`` and ``license_url`` follow the
same rule as the rest of the pipeline: an https ``license_url`` that names the
same version as the text, or the row is rejected. ``source_url`` is an https
publisher page and may be empty.

``image_url`` is optional. When empty the row is training-only for display
purposes (it cannot pass ``is_publishable`` because there is no https photo
URL), but it still trains. When a https URL is given the row is publishable
like every other CC0/CC BY row. Optional occurrence columns (``inat_photo_id``,
``inat_observation_id``, ``mo_observation_id``, ``commons_file``,
``inat_observer``, ``id_confidence``, ``country``, ``event_date``,
``decimal_latitude``, ``decimal_longitude``) are copied through so the split can
group by observer and deduplicate by id, exactly as for remote photos.

The merge reads an existing ``external.jsonl`` when present, unions the rows,
deduplicates by photo and observation id keeping the stricter license, applies
the collector cap, and writes the result back to the same file. Existing rows
keep their own ``downloaded`` flag, so remote rows stay remote and the newly
staged local rows are the ones that become usable.
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

from import_external import (
    DEFAULT_MAX_PER_COLLECTOR,
    _blank_ids,
    _cell,
    _collector_key,
    _dataset_name,
    _fill_ids_from_urls,
    _float_or_none,
    _occurrence_key,
    _public_row,
    _UNVERIFIED_CONFIDENCE,
    apply_collector_cap,
    canonical_image_url,
    dedupe_rows,
    force_https_url,
    is_publishable,
    photo_license_decision,
    resolve_species,
    species_index,
)
from license_policy import exclude_df20_unless_requested
from manifest import load_manifest

STAGING_DIR = Path("training") / "data" / "local"
DEFAULT_EXTERNAL = Path("training") / "data" / "external.jsonl"
DEFAULT_REPORT = Path("training") / "data" / "local_report.json"
DEFAULT_LABELS = Path("assets") / "models" / "labels.json"

# CSV columns this manifest understands. The first six are required.
_REQUIRED_COLUMNS = ("image", "species", "author", "license", "license_url", "source_url")
_OPTIONAL_COLUMNS = (
    "image_url",
    "inat_photo_id",
    "inat_observation_id",
    "mo_observation_id",
    "commons_file",
    "inat_observer",
    "id_confidence",
    "country",
    "event_date",
    "decimal_latitude",
    "decimal_longitude",
)


def _located(value: str) -> str:
    return " ".join(value.split())


def _safe_name(value: str, index: int) -> str:
    """A filesystem-safe, collision-free stem for one staged image.

    ``author`` is sanitized so a space or backslash cannot escape the class
    folder. The zero-padded index keeps every row unique even when two photos
    share an author or an empty author.
    """
    stem = "".join(ch if (ch.isalnum() or ch in "-_") else "-" for ch in value.strip().lower()).strip("-_")
    stem = stem or "photo"
    return f"{stem}-{index:05d}"


def _staged_path(staging_dir: Path, class_id: str, stem: str, ext: str) -> Path:
    folder = staging_dir / str(class_id)
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{stem}.{ext}"


def _row_from_local(raw: dict, *, staged_rel: str, order: int, index: dict[str, dict]) -> tuple[dict | None, str]:
    """Build one local-photo row, mirroring ``import_external._row_from_photo``.

    The differences are deliberate: ``image_url`` may be empty (a local photo
    can have no online URL), the row is already ``downloaded``, and ``file`` is
    the staged copy relative to ``ml/data/``. Every license, author,
    species, and identity decision is identical to the remote path.
    """
    species = _cell(raw, "species")
    target = resolve_species(species, index) if species else None
    if target is None:
        return None, "unmapped"
    license_text = _cell(raw, "license")
    license_url = _cell(raw, "license_url")
    decision, reason = photo_license_decision(license_text, license_url)
    if decision is None:
        return None, reason
    author = _located(_cell(raw, "author"))
    if not author:
        return None, "author"
    image_url = _cell(raw, "image_url")
    if image_url and urlsplit(image_url).scheme != "https":
        return None, "url"
    source_url = force_https_url(_cell(raw, "source_url"))
    if source_url and urlsplit(source_url).scheme != "https":
        return None, "url"
    confidence = _cell(raw, "id_confidence")
    unverified = confidence in _UNVERIFIED_CONFIDENCE
    ids = _blank_ids()
    ids["inat_observer"] = _cell(raw, "inat_observer")
    ids["inat_photo_id"] = _cell(raw, "inat_photo_id")
    ids["inat_observation_id"] = _cell(raw, "inat_observation_id")
    ids["mo_observation_id"] = _cell(raw, "mo_observation_id")
    ids["commons_file"] = _cell(raw, "commons_file")
    _fill_ids_from_urls(ids, image_url, source_url)
    local_key = f"local:{staged_rel}"
    occurrence_key = _occurrence_key(ids, local_key, order)
    recorded_by = ids["inat_observer"] or author
    row = {
        "source": _dataset_name(ids, source_url, image_url, df20=False),
        "class_id": target["class_id"],
        "taxon_name": target["taxon_name"],
        "queried_name": target["taxon_name"],
        "species": species,
        "held_out_taxon": target["held_out_taxon"],
        "toxic": target["toxic"],
        "probe": target["probe"],
        "genus_relation": target["genus_relation"],
        "image_url": image_url,
        "source_url": source_url,
        "creator": author,
        "author": author,
        "license": license_text,
        "license_url": license_url,
        "license_normalized": decision["license_normalized"],
        "usage": decision["usage"],
        "unverified": unverified,
        "id_confidence": confidence,
        "recorded_by": recorded_by,
        "collector_key": _collector_key(ids["inat_observer"], author),
        "occurrence_key": occurrence_key,
        "observation_id": occurrence_key.split(":", 1)[-1],
        "downloaded": True,
        "file": staged_rel,
        "decimal_latitude": _float_or_none(_cell(raw, "decimal_latitude")),
        "decimal_longitude": _float_or_none(_cell(raw, "decimal_longitude")),
        "event_date": _cell(raw, "event_date"),
        "country": _located(_cell(raw, "country")),
        "_order": order,
        "_image_key": local_key,
    }
    row.update(ids)
    return row, ""


def _read_manifest(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for row in reader:
            if not isinstance(row, dict):
                continue
            rows.append({key: value for key, value in row.items() if key is not None})
        return rows


def _stage_image(source: Path, staged: Path) -> None:
    if staged.exists():
        return
    staged.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, staged)


def _load_existing_external(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
    return rows


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )


def _staging_root(staging_dir: Path) -> Path:
    """Return the parent of ``staging_dir``.

    ``file`` is stored relative to the parent of the staging directory, so
    ``ml/data/local`` images get a ``file`` like ``data/local/...``.
    """
    return staging_dir.parent


def import_local_images(
    manifest_csv: Path,
    *,
    staging_dir: Path = STAGING_DIR,
    external: Path = DEFAULT_EXTERNAL,
    labels: Path = DEFAULT_LABELS,
    max_per_collector: int = DEFAULT_MAX_PER_COLLECTOR,
    publishable_only: bool = False,
    include_df20: bool = False,
    exclude_unverified: bool = False,
) -> tuple[list[dict], dict]:
    """Merge the manifest's local images into ``external`` and return the rows.

    Each listed image is copied into ``staging_dir/<class_id>/`` and becomes a
    downloaded row. The result is the union of the existing external file (when
    present) and the new local rows, deduplicated and capped, written back to
    ``external``. The returned report mirrors ``import_external``'s so the two
    importers share one shape of result.
    """
    manifest_csv = Path(manifest_csv)
    staging_dir = Path(staging_dir)
    external = Path(external)
    labels_path = Path(labels)
    manifest = load_manifest(labels_path) if labels_path.is_file() else None
    index = species_index(manifest)
    existing = _load_existing_external(external)

    manifest_rows = _read_manifest(manifest_csv)
    rows: list[dict] = []
    rejected: Counter[str] = Counter()
    unmapped: Counter[str] = Counter()
    staged_files: list[tuple[str, Path]] = []
    order = len(existing)
    for position, raw in enumerate(manifest_rows, start=1):
        source = Path(_cell(raw, "image"))
        order += 1
        if not source.is_file():
            rejected["missing_image"] += 1
            continue
        species = _cell(raw, "species")
        target = resolve_species(species, index) if species else None
        if target is None:
            rejected["unmapped"] += 1
            unmapped[species or "(blank)"] += 1
            continue
        license_text = _cell(raw, "license")
        license_url = _cell(raw, "license_url")
        decision, reason = photo_license_decision(license_text, license_url)
        if decision is None:
            rejected[reason] += 1
            continue
        author = _located(_cell(raw, "author"))
        if not author:
            rejected["author"] += 1
            continue
        ext = source.suffix.lstrip(".").lower() or "jpg"
        stem = _safe_name(author, position)
        staged = _staged_path(staging_dir, target["class_id"], stem, ext)
        _stage_image(source, staged)
        staged_rel = str(staged.relative_to(_staging_root(staging_dir))).replace("\\", "/")
        local_row, local_reason = _row_from_local(raw, staged_rel=staged_rel, order=order, index=index)
        if local_row is None:
            rejected[local_reason] += 1
            continue
        rows.append(local_row)
        staged_files.append((staged_rel, staged))

    all_rows = existing + rows
    all_rows, excluded_df20 = exclude_df20_unless_requested(all_rows, include_df20=include_df20)
    kept, duplicate_dropped, looser_dropped, conflict_dropped, label_conflicts = dedupe_rows(all_rows)
    if publishable_only:
        before = len(kept)
        kept = [row for row in kept if is_publishable(row)]
        rejected["publishable_only"] += before - len(kept)
    if exclude_unverified:
        rejected["exclude_unverified"] += sum(1 for row in kept if row.get("unverified") is True)
        kept = [row for row in kept if row.get("unverified") is not True]
    kept, cap_dropped = apply_collector_cap(kept, max_per_collector)
    kept.sort(key=lambda row: int(row.get("_order") or 0))
    written = [_public_row(row) for row in kept]
    _write_jsonl(external, written)

    by_class = Counter(row["class_id"] for row in written)
    report = {
        "manifest_rows": len(manifest_rows),
        "images_staged": len(staged_files),
        "existing_external_rows": len(existing),
        "rows_written": len(written),
        "rejected_missing_image": int(rejected["missing_image"]),
        "rejected_license": int(rejected["license"]),
        "rejected_unmapped": int(rejected["unmapped"]),
        "rejected_missing_author": int(rejected["author"]),
        "rejected_url": int(rejected["url"]),
        "rejected_license_url_empty": int(rejected["license_url_empty"]),
        "rejected_license_url_not_https": int(rejected["license_url_not_https"]),
        "rejected_license_url_mismatch": int(rejected["license_url_mismatch"]),
        "unmapped_species": dict(sorted(unmapped.items())),
        "dropped_duplicate": duplicate_dropped,
        "dropped_looser_license": looser_dropped,
        "dropped_label_conflict": conflict_dropped,
        "duplicate_class_conflicts": len(label_conflicts),
        "label_conflicts": label_conflicts,
        "dropped_collector_cap": len(cap_dropped),
        "excluded_df20": excluded_df20,
        "include_df20": include_df20,
        "publishable_only": publishable_only,
        "exclude_unverified": exclude_unverified,
        "unverified": sum(1 for row in written if row.get("unverified") is True),
        "training_only": sum(1 for row in written if row.get("usage") == "training_only"),
        "publishable": sum(1 for row in written if row.get("usage") == "publishable"),
        "by_class": dict(sorted(by_class.items())),
        "staged_files": [rel for rel, _ in staged_files],
        "max_per_collector": max_per_collector,
    }
    return written, report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import local image files into external.jsonl")
    parser.add_argument("manifest", type=Path, help="CSV manifest, one row per local image")
    parser.add_argument(
        "--staging",
        type=Path,
        default=STAGING_DIR,
        help=f"Where staged copies live (default: {STAGING_DIR})",
    )
    parser.add_argument(
        "--external",
        type=Path,
        default=DEFAULT_EXTERNAL,
        help=f"External JSONL to merge into (default: {DEFAULT_EXTERNAL})",
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=DEFAULT_LABELS,
        help="labels.json used to map species to class ids (default: assets/models/labels.json)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=DEFAULT_REPORT,
        help="JSON count report (default: training/data/local_report.json)",
    )
    parser.add_argument(
        "--max-per-collector",
        type=int,
        default=DEFAULT_MAX_PER_COLLECTOR,
        help="Max photos per observer or author per class. Below 1 disables the cap. Default 30.",
    )
    parser.add_argument(
        "--publishable-only",
        action="store_true",
        help="Write only rows that pass is_publishable before the collector cap.",
    )
    parser.add_argument(
        "--exclude-unverified",
        action="store_true",
        help="Omit unverified rows from the jsonl.",
    )
    parser.add_argument(
        "--include-df20",
        action="store_true",
        help="Keep Danish Fungi 2020 rows; the default excludes them and counts excluded_df20.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.manifest.is_file():
        parser.error(f"not a file: {args.manifest}")
    rows, report = import_local_images(
        args.manifest,
        staging_dir=args.staging,
        external=args.external,
        labels=args.labels,
        max_per_collector=args.max_per_collector,
        publishable_only=args.publishable_only,
        include_df20=args.include_df20,
        exclude_unverified=args.exclude_unverified,
    )
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"staged {report['images_staged']} local images into {args.staging} "
        f"and wrote {report['rows_written']} rows to {args.external} "
        f"(publishable {report['publishable']}, training_only {report['training_only']}, "
        f"rejected license {report['rejected_license']}, unmapped {report['rejected_unmapped']}, "
        f"missing image {report['rejected_missing_image']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
