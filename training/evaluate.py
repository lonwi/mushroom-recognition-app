"""Per-class top-1/top-3, dangerous-pair confusion, and the energy gate.

The threshold is chosen on the validation split so that 95% of in-distribution
validation images are kept (their energy is at or below the threshold).
Held-out test images, including non-mushrooms, are only scored after that.
`training/export_tflite.py` runs this again on the TFLite interpreter's logits.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np

from manifest import ROOT, load_manifest
from preprocess import preprocess_rgb_uint8
from recognition_math import (
    DANGEROUS_PAIRS,
    POLICY_MIN_MARGIN,
    POLICY_MIN_SOFTMAX_FOR_ACCEPT,
    POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
    decide,
    energy_score,
    softmax,
)

DATA_DIR = ROOT / "training" / "data"
ARTIFACTS = ROOT / "training" / "artifacts"


def attributions_complete(records: list[dict]) -> bool:
    if not records:
        return False
    for row in records:
        license_id = str(row.get("license_normalized") or "")
        if not (license_id.startswith("cc0-") or license_id.startswith("cc-by-")):
            return False
        if not row.get("creator") or not row.get("image_url"):
            return False
        if not (row.get("source_url") or row.get("gbif_occurrence")):
            return False
    return True


def image_counts(rows: list[dict], class_ids: list[str]) -> dict[str, int]:
    """Count photos for every label class. A class with no rows stays at 0."""
    counts = {class_id: 0 for class_id in class_ids}
    for row in rows:
        class_id = row.get("class_id")
        if class_id in counts:
            counts[class_id] += 1
    return counts


def preprocessed_batch(row: dict, image_size: int, data_dir: Path = DATA_DIR) -> np.ndarray:
    from PIL import Image

    with Image.open(data_dir / row["file"]) as image:
        rgb = np.asarray(image.convert("RGB"))
    return preprocess_rgb_uint8(rgb, image_size).astype(np.float32)[None, ...]


def prediction_from_logits(row: dict, logits: list[float]) -> dict:
    if not all(math.isfinite(value) for value in logits):
        raise ValueError(f"non-finite logits for {row.get('file')}")
    probabilities = softmax(logits)
    order = sorted(range(len(probabilities)), key=probabilities.__getitem__, reverse=True)
    return {
        "class_id": row["class_id"],
        "file": row.get("file"),
        "logits": logits,
        "probabilities": probabilities,
        "order": order,
        "energy": energy_score(logits),
    }


def _predict_rows(model, rows: list[dict], image_size: int) -> list[dict]:
    predictions = []
    for row in rows:
        tensor = preprocessed_batch(row, image_size)
        logits = model.predict(tensor, verbose=0)[0].astype(float).tolist()
        predictions.append(prediction_from_logits(row, logits))
    return predictions


def summarize(predictions: list[dict], class_ids: list[str], threshold: float | None) -> dict:
    per_class: dict[str, dict] = {}
    grouped: dict[str, list[dict]] = defaultdict(list)
    for item in predictions:
        grouped[item["class_id"]].append(item)
    top1_values = []
    top3_values = []
    for class_id in class_ids:
        rows = grouped.get(class_id) or []
        if not rows:
            per_class[class_id] = {"top1": None, "top3": None, "support": 0}
            continue
        index = class_ids.index(class_id)
        top1 = sum(1 for row in rows if row["order"][0] == index) / len(rows)
        top3 = sum(1 for row in rows if index in row["order"][:3]) / len(rows)
        per_class[class_id] = {"top1": top1, "top3": top3, "support": len(rows)}
        if class_id != "not_a_mushroom":
            top1_values.append(top1)
            top3_values.append(top3)

    pair_rates = {}
    for left, right in DANGEROUS_PAIRS:
        for truth, predicted in ((left, right), (right, left)):
            rows = grouped.get(truth) or []
            if not rows or predicted not in class_ids:
                pair_rates[f"{truth}->{predicted}"] = None
                continue
            predicted_index = class_ids.index(predicted)
            pair_rates[f"{truth}->{predicted}"] = sum(1 for row in rows if row["order"][0] == predicted_index) / len(rows)

    ood_rows = grouped.get("not_a_mushroom") or []
    confident = [row for row in ood_rows if max(row["probabilities"]) > 0.5]
    caught = 0
    if threshold is not None and confident:
        classes = [{"id": class_id, "genus": ""} for class_id in class_ids]
        # genus is filled by the caller when a full decision is required
        caught = sum(1 for row in confident if row["energy"] > threshold or class_ids[row["order"][0]] == "not_a_mushroom")
    return {
        "per_class": per_class,
        "macro_top1": (sum(top1_values) / len(top1_values)) if top1_values else None,
        "macro_top3": (sum(top3_values) / len(top3_values)) if top3_values else None,
        "dangerous_pair_rates": pair_rates,
        "ood_test_softmax_above_0_5": len(confident) if threshold is not None else None,
        "softmax_above_0_5_still_rejected_rate": (caught / len(confident)) if confident and threshold is not None else None,
    }


def choose_threshold(val_predictions: list[dict]) -> float:
    energies = [row["energy"] for row in val_predictions if row["class_id"] != "not_a_mushroom"]
    if len(energies) < 8:
        raise RuntimeError("need at least 8 in-distribution validation images to set an energy threshold")
    return float(np.quantile(np.asarray(energies, dtype=np.float64), 0.95))


def assemble_report(manifest: dict, splits: dict, val_pred: list[dict], test_pred: list[dict]) -> dict:
    """Metrics for one set of logits. Export passes TFLite logits; evaluate passes Keras."""
    class_ids = [item["id"] for item in manifest["classes"]]
    threshold = choose_threshold(val_pred)
    id_val = [row for row in val_pred if row["class_id"] != "not_a_mushroom"]
    id_keep = sum(1 for row in id_val if row["energy"] <= threshold) / len(id_val)
    summary = summarize(test_pred, class_ids, threshold)
    ood_test = [row for row in test_pred if row["class_id"] == "not_a_mushroom"]
    classes = manifest["classes"]
    ood_config = {
        "calibrated": True,
        "background_class_id": "not_a_mushroom",
        "temperature": 1,
        "energy_threshold": threshold,
        "min_softmax_for_accept": POLICY_MIN_SOFTMAX_FOR_ACCEPT,
        "min_top1_softmax_for_high_confidence": POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
        "min_margin": POLICY_MIN_MARGIN,
    }
    rejected = 0
    for row in ood_test:
        decision = decide(row["logits"], classes, ood_config)
        if decision["status"] == "rejected":
            rejected += 1
    ood_reject = (rejected / len(ood_test)) if ood_test else None
    all_rows = list(splits.get("train") or []) + list(splits.get("val") or []) + list(splits.get("test") or [])
    return {
        "per_class": summary["per_class"],
        "macro_top1": summary["macro_top1"],
        "macro_top3": summary["macro_top3"],
        "dangerous_pair_rates": summary["dangerous_pair_rates"],
        "coverage": {
            "train_images": image_counts(list(splits.get("train") or []), class_ids),
            "test_images": image_counts(list(splits.get("test") or []), class_ids),
        },
        "ood": {
            "method": "energy_logsumexp_plus_background_class",
            "energy_threshold": threshold,
            "temperature": 1,
            "min_softmax_for_accept": POLICY_MIN_SOFTMAX_FOR_ACCEPT,
            "min_top1_softmax_for_high_confidence": POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
            "min_margin": POLICY_MIN_MARGIN,
            "id_keep_rate_val": id_keep,
            "ood_reject_rate_test": ood_reject,
            "ood_test_count": len(ood_test),
            "ood_test_softmax_above_0_5": summary["ood_test_softmax_above_0_5"],
            "softmax_above_0_5_still_rejected_rate": summary["softmax_above_0_5_still_rejected_rate"],
            "note": (
                "Threshold is the 95th percentile of in-distribution validation energy "
                "on these logits. Export overwrites this report with TFLite interpreter logits "
                "on the real val and test photos. "
                "softmax_above_0_5_still_rejected_rate is the share of held-out non-mushrooms "
                "whose top softmax exceeds 0.5 and that the energy gate or the background class still rejects. "
                "A softmax cutoff of 0.5 is not the gate."
            ),
        },
        "attributions_complete": attributions_complete(all_rows),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the saved Keras model")
    parser.parse_args()
    import tensorflow as tf

    manifest = load_manifest()
    image_size = int(manifest["input"]["size"])
    model = tf.keras.models.load_model(ARTIFACTS / "model.keras")
    splits = json.loads((DATA_DIR / "splits.json").read_text(encoding="utf-8"))
    val_pred = _predict_rows(model, splits["val"], image_size)
    test_pred = _predict_rows(model, splits["test"], image_size)
    report = assemble_report(manifest, splits, val_pred, test_pred)
    report["tflite"] = {"loaded": False, "top1_agreement_with_fp32": None, "agreement_source": None}
    report["shippable"] = False
    report["ship_blockers"] = ["TFLite export has not scored real val/test photos yet"]
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "macro_top1": report["macro_top1"],
                "ood_reject_rate_test": report["ood"]["ood_reject_rate_test"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
