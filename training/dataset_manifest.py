"""Counts and a content hash for one prepared train/val/test dataset.

The hash covers the split assignment and the identity fields of each row.
It does not include the split salt.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter

# Fields that identify a row. The salt and the HMAC group id are not here.
_HASH_FIELDS = (
    "class_id",
    "taxon_name",
    "license",
    "license_normalized",
    "image_url",
    "source_url",
    "file",
    "prepared_file",
    "sha256",
    "inat_observer",
    "author",
    "creator",
    "recorded_by",
    "recordedBy",
    "photographer_rightsHolder",
    "inat_photo_id",
    "inat_observation_id",
    "mo_observation_id",
    "observationID",
    "observation_id",
    "ImageUniqueID",
    "occurrence_key",
    "gbifID",
    "commons_file",
    "licence_note",
)


def _canonical_line(split_name: str, row: dict) -> str:
    payload: dict[str, object] = {"split": split_name}
    for field in _HASH_FIELDS:
        if field not in row:
            continue
        value = row[field]
        if value is None or value == "":
            continue
        payload[field] = value
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def build_dataset_manifest(
    splits: dict[str, list[dict]],
    *,
    salt: str,
    share_config: dict | None = None,
    withheld: list[dict] | None = None,
    input_tree_sha256: str | None = None,
    sums_checked: bool | None = None,
    sha256sums_sha256: str | None = None,
    self_entry_ignored: bool | None = None,
    self_entry_path: str | None = None,
    input_archive_sha256: str | None = None,
) -> dict:
    """Per-split totals, per-class counts, component shares, and a content sha256.

    The sha256 covers the assigned rows and does not include the salt.
    ``salt_fingerprint`` is the first 8 hex digits of sha256(salt).
    ``input_tree_sha256`` is the custom digest of the input files, not a
    ``.tgz``. ``input_archive_sha256`` is that archive when prepare was told
    about it. ``sums_checked`` is false when ``SHA256SUMS`` was absent.
    """
    names = ("train", "val", "test")
    class_ids: set[str] = set()
    per_split_counts: dict[str, Counter[str]] = {}
    lines: list[str] = []
    for name in names:
        rows = list(splits.get(name) or [])
        counts: Counter[str] = Counter()
        for row in rows:
            class_id = str(row.get("class_id") or "")
            counts[class_id] += 1
            class_ids.add(class_id)
            lines.append(_canonical_line(name, row))
        per_split_counts[name] = counts
    ordered = sorted(class_ids)
    report: dict[str, dict] = {}
    for name in names:
        counts = per_split_counts[name]
        report[name] = {
            "rows": sum(counts.values()),
            "per_class": {class_id: counts.get(class_id, 0) for class_id in ordered},
        }
    digest = hashlib.sha256("\n".join(sorted(lines)).encode("utf-8")).hexdigest()
    from component_share import COMPONENT_SHARE_LIMIT, load_share_config, measure_component_share
    from split import held_out_withheld_report
    from split_salt import salt_fingerprint

    config = load_share_config() if share_config is None else share_config
    share = measure_component_share(
        splits,
        salt=salt,
        acknowledgements=config.get("acknowledgements") or {},
        limit=config.get("limit", COMPONENT_SHARE_LIMIT),
    )
    manifest = {
        "splits": report,
        "content_sha256": digest,
        "salt_fingerprint": salt_fingerprint(salt),
        "component_share": share,
        "held_out_withheld": held_out_withheld_report(withheld or []),
    }
    if input_tree_sha256 is not None:
        manifest["input_tree_sha256"] = input_tree_sha256
        manifest["sums_checked"] = bool(sums_checked)
        manifest["sha256sums_sha256"] = sha256sums_sha256
        manifest["self_entry_ignored"] = bool(self_entry_ignored)
        manifest["self_entry_path"] = self_entry_path
        manifest["input_archive_sha256"] = input_archive_sha256
    return manifest
