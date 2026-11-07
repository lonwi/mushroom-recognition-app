"""The fixed val+test sample used for on-device delegate agreement.

Train rows are rejected. Photos are not copied into the app or the git tree.
The hash is the identity of this list, so a shorter or reordered dump is stale.
"""

from __future__ import annotations

import hashlib
import json

SAMPLE_SPLITS = ("val", "test")


def calibration_sample(splits: dict) -> list[dict]:
    rows = []
    for split in SAMPLE_SPLITS:
        part = splits.get(split) or []
        if not part:
            raise RuntimeError(f"delegate sample needs {split} images")
        for row in part:
            if not isinstance(row, dict):
                raise RuntimeError("delegate sample row is not an object")
            tagged = row.get("split", split)
            if tagged != split or tagged == "train":
                raise RuntimeError(f"delegate sample {split} row is tagged {tagged}")
            file_name = row.get("file")
            class_id = row.get("class_id")
            if not isinstance(file_name, str) or not file_name or not isinstance(class_id, str) or not class_id:
                raise RuntimeError("delegate sample row needs file and class_id")
            rows.append({"file": file_name, "split": split, "class_id": class_id})
    return rows


def sample_sha256(rows: list[dict]) -> str:
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
