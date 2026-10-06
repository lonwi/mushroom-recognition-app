"""Whether measured metrics are good enough to copy weights into the app.

A missing metric fails closed. This module does not invent scores.
Every class in assets/models/labels.json is checked. A missing class, or a
class with no training images or no test images, cannot ship.
"""

from __future__ import annotations

import hashlib
import math
import re
from pathlib import Path

from manifest import ROOT, load_manifest
from recognition_math import DANGEROUS_PAIRS, EDIBLE_LOOKALIKE_IDS, HIGH_STAKES_IDS

ARTIFACTS = ROOT / "training" / "artifacts"
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _finite(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _whole_count(value: object) -> int | None:
    if isinstance(value, bool) or (isinstance(value, float) and not value.is_integer()):
        return None
    if not _finite(value):
        return None
    number = int(value)  # type: ignore[arg-type]
    if number < 0:
        return None
    return number


def assess_shippable(report: dict, artifact_dir: Path | None = None) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    class_ids = [item["id"] for item in load_manifest()["classes"]]
    per_class = report.get("per_class") or {}
    coverage = report.get("coverage") or {}
    train_images = coverage.get("train_images") or {}
    test_images = coverage.get("test_images") or {}
    ood = report.get("ood") or {}
    export_ok = report.get("tflite") or {}

    macro_top1 = report.get("macro_top1")
    macro_top3 = report.get("macro_top3")
    if macro_top1 is None or macro_top1 < 0.80:
        reasons.append(f"macro top-1 {macro_top1} is below 0.80")
    if macro_top3 is None or macro_top3 < 0.90:
        reasons.append(f"macro top-3 {macro_top3} is below 0.90")

    for species_id in class_ids:
        stats = per_class.get(species_id) if isinstance(per_class.get(species_id), dict) else None
        if species_id not in per_class or species_id not in train_images or species_id not in test_images or stats is None:
            reasons.append(f"{species_id} is missing from measured train/test coverage")
        train_count = _whole_count(train_images.get(species_id))
        test_count = _whole_count(test_images.get(species_id))
        support = _whole_count(stats.get("support")) if stats else None
        if (
            train_count is None
            or train_count == 0
            or test_count is None
            or test_count == 0
            or support is None
            or support == 0
        ):
            reasons.append(f"{species_id} has support 0 in train or test")
            continue
        if not _finite(stats.get("top1")) or not _finite(stats.get("top3")):
            reasons.append(f"{species_id} has no measured top-1/top-3")
        if species_id == "not_a_mushroom":
            if train_count < 100:
                reasons.append(f"background class has only {train_count} training images (need >= 100)")
        elif train_count < 40:
            reasons.append(f"{species_id} has only {train_count} training images after dedup (need >= 40)")
        if species_id in HIGH_STAKES_IDS:
            recall = stats.get("top1")
            if support < 8 or not _finite(recall) or recall < 0.85:
                reasons.append(
                    f"high-stakes class {species_id} top-1 {recall} on support {support} (need >= 0.85 and >= 8)"
                )

    pair_rates = report.get("dangerous_pair_rates") or {}
    for left, right in DANGEROUS_PAIRS:
        for truth, predicted in ((left, right), (right, left)):
            if truth not in HIGH_STAKES_IDS:
                continue
            if predicted not in EDIBLE_LOOKALIKE_IDS and predicted not in HIGH_STAKES_IDS:
                continue
            if truth in HIGH_STAKES_IDS and predicted in EDIBLE_LOOKALIKE_IDS:
                rate = pair_rates.get(f"{truth}->{predicted}")
                if rate is None or rate > 0.05:
                    reasons.append(
                        f"dangerous confusion {truth}->{predicted} rate {rate} exceeds 0.05"
                    )

    id_keep = ood.get("id_keep_rate_val")
    ood_reject = ood.get("ood_reject_rate_test")
    confident_ood = ood.get("ood_test_softmax_above_0_5")
    caught = ood.get("softmax_above_0_5_still_rejected_rate")
    if id_keep is None or id_keep < 0.95:
        reasons.append(f"validation in-distribution keep rate {id_keep} is below 0.95")
    if ood_reject is None or ood_reject < 0.90:
        reasons.append(f"held-out non-mushroom reject rate {ood_reject} is below 0.90")
    if confident_ood is None or confident_ood < 30:
        reasons.append(
            f"only {confident_ood} held-out non-mushroom images scored softmax > 0.5; "
            "the energy gate is not validated against overconfident rejects"
        )
    elif caught is None or caught < 0.90:
        reasons.append(
            f"energy rejected only {caught} of non-mushrooms that softmax scored above 0.5 (need >= 0.90)"
        )

    if not export_ok.get("loaded"):
        reasons.append("TFLite interpreter did not load the exported model")
    if export_ok.get("agreement_source") != "val_and_test_photos":
        reasons.append("TFLite agreement was not measured on held-out val and test photos")
    agreement_images = export_ok.get("agreement_images")
    if not isinstance(agreement_images, int) or isinstance(agreement_images, bool) or agreement_images < 1:
        reasons.append("TFLite agreement did not include any real val/test photos")
    agreement = export_ok.get("top1_agreement_with_fp32")
    if agreement is None or agreement < 0.99:
        reasons.append(f"TFLite vs float32 top-1 agreement {agreement} is below 0.99")
    if not report.get("attributions_complete"):
        reasons.append("per-image attribution file is incomplete")

    directory = ARTIFACTS if artifact_dir is None else artifact_dir
    recorded = report.get("artifacts") or {}
    keras_hash = recorded.get("model_keras_sha256")
    tflite_hash = recorded.get("tflite_sha256")
    if not (isinstance(keras_hash, str) and _SHA256.fullmatch(keras_hash)):
        reasons.append("model.keras sha256 is missing from metrics")
    if not (isinstance(tflite_hash, str) and _SHA256.fullmatch(tflite_hash)):
        reasons.append("tflite sha256 is missing from metrics")
    if keras_hash != sha256_file(directory / "model.keras"):
        reasons.append("model.keras sha256 does not match the file that was evaluated")
    if tflite_hash != sha256_file(directory / "mushrooms_model.tflite"):
        reasons.append("tflite sha256 does not match the file that was evaluated")

    return (len(reasons) == 0, reasons)
