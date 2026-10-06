"""Load the committed class contract. The app and the trainer share one file."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS_PATH = ROOT / "assets" / "models" / "labels.json"

CENTRAL_EUROPE = ("PL", "DE", "CZ", "SK", "AT", "HU", "LT", "LV", "EE")


def load_manifest(path: Path | None = None) -> dict:
    manifest_path = path or LABELS_PATH
    with manifest_path.open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    classes = manifest["classes"]
    ids = [item["id"] for item in classes]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate class id in labels.json")
    for index, item in enumerate(classes):
        if item["index"] != index:
            raise ValueError(f"class {item['id']} index {item['index']} != position {index}")
        if "status" in item or "edibility" in item:
            raise ValueError(f"class {item['id']} must not carry an edibility verdict")
    if classes[-1]["id"] != "not_a_mushroom":
        raise ValueError("the background class must be last so logit indexes stay stable")
    if manifest.get("model_packaged"):
        model_file = ROOT / "assets" / "models" / manifest["model_file"]
        if not model_file.is_file():
            raise ValueError("manifest says the model is packaged but the tflite file is missing")
    return manifest


def fungi_classes(manifest: dict | None = None) -> list[dict]:
    manifest = manifest or load_manifest()
    return [item for item in manifest["classes"] if item["id"] != "not_a_mushroom"]
