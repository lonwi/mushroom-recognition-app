"""Load the committed class contract. The app and the trainer share one file."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS_PATH = ROOT / "assets" / "models" / "labels.json"

# Poland and the neighbours the regional fetch walks before the global fill.
CENTRAL_EUROPE = ("PL", "DE", "CZ", "SK", "AT", "HU", "LT", "LV", "EE")

BACKGROUND_CLASS_ID = "not_a_mushroom"
UNKNOWN_CLASS_ID = "unknown_mushroom"
AGGREGATE_CLASS_IDS = (UNKNOWN_CLASS_ID, BACKGROUND_CLASS_ID)


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
    if len(classes) < 2 or classes[-1]["id"] != BACKGROUND_CLASS_ID:
        raise ValueError("the background class must be last so logit indexes stay stable")
    if classes[-2]["id"] != UNKNOWN_CLASS_ID:
        raise ValueError("unknown_mushroom must sit immediately before not_a_mushroom")
    _validate_sampling(classes)
    if manifest.get("model_packaged"):
        model_file = ROOT / "assets" / "models" / manifest["model_file"]
        if not model_file.is_file():
            raise ValueError("manifest says the model is packaged but the tflite file is missing")
    return manifest


def _validate_sampling(classes: list[dict]) -> None:
    known_names: set[str] = set()
    for item in classes:
        if item["id"] in AGGREGATE_CLASS_IDS:
            continue
        if item.get("sampling"):
            raise ValueError(f"{item['id']} is a species class and must not set aggregate sampling")
        for name in item.get("gbif_names") or []:
            key = str(name).casefold()
            if key in known_names:
                raise ValueError(f"duplicate GBIF name {name}")
            known_names.add(key)
    for item in classes:
        if item["id"] not in AGGREGATE_CLASS_IDS:
            continue
        sampling = item.get("sampling") or {}
        names = [str(name) for name in item.get("gbif_names") or []]
        held = [str(name) for name in sampling.get("held_out_gbif_names") or []]
        per_taxon = sampling.get("per_taxon_cap")
        class_cap = sampling.get("class_cap")
        if not isinstance(per_taxon, int) or not isinstance(class_cap, int):
            raise ValueError(f"{item['id']} needs integer per_taxon_cap and class_cap")
        if per_taxon < 1 or class_cap < 1:
            raise ValueError(f"{item['id']} sampling caps must be positive")
        if not 1500 <= class_cap <= 3000:
            raise ValueError(f"{item['id']} class_cap must sit between 1500 and 3000 images")
        if len(names) < 30:
            raise ValueError(f"{item['id']} needs many taxa, not a handful of GBIF names")
        if len(held) < 8:
            raise ValueError(f"{item['id']} must hold taxa out for the test split")
        if len(set(names)) != len(names) or len(set(held)) != len(held):
            raise ValueError(f"{item['id']} repeats a GBIF name")
        missing = [name for name in held if name not in names]
        if missing:
            raise ValueError(f"{item['id']} held-out names are not in gbif_names: {missing}")
        if per_taxon * len(names) < 1500:
            raise ValueError(f"{item['id']} cannot reach 1500 images at the per-taxon cap")
        collided = [name for name in names if name.casefold() in known_names]
        if collided:
            raise ValueError(f"{item['id']} reuses a known species name: {collided}")


def species_classes(manifest: dict | None = None) -> list[dict]:
    """Known species. Excludes the unknown-fungus class and the background class."""
    manifest = manifest or load_manifest()
    return [item for item in manifest["classes"] if item["id"] not in AGGREGATE_CLASS_IDS]


def fungi_classes(manifest: dict | None = None) -> list[dict]:
    return species_classes(manifest)
