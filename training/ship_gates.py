"""Whether measured metrics are good enough to copy weights into the app.

A missing metric fails closed. This module does not invent scores.
"""

from __future__ import annotations

from recognition_math import DANGEROUS_PAIRS, EDIBLE_LOOKALIKE_IDS, HIGH_STAKES_IDS


def assess_shippable(report: dict) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    per_class = report.get("per_class") or {}
    coverage = report.get("coverage") or {}
    ood = report.get("ood") or {}
    export_ok = report.get("tflite") or {}

    macro_top1 = report.get("macro_top1")
    macro_top3 = report.get("macro_top3")
    if macro_top1 is None or macro_top1 < 0.80:
        reasons.append(f"macro top-1 {macro_top1} is below 0.80")
    if macro_top3 is None or macro_top3 < 0.90:
        reasons.append(f"macro top-3 {macro_top3} is below 0.90")

    for species_id in HIGH_STAKES_IDS:
        stats = per_class.get(species_id) or {}
        recall = stats.get("top1")
        support = stats.get("support") or 0
        if support < 8 or recall is None or recall < 0.85:
            reasons.append(
                f"high-stakes class {species_id} top-1 {recall} on support {support} (need >= 0.85 and >= 8)"
            )

    for species_id, count in (coverage.get("train_images") or {}).items():
        if species_id == "not_a_mushroom":
            if count < 100:
                reasons.append(f"background class has only {count} training images (need >= 100)")
            continue
        if count < 40:
            reasons.append(f"{species_id} has only {count} training images after dedup (need >= 40)")

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
    agreement = export_ok.get("top1_agreement_with_fp32")
    if agreement is None or agreement < 0.99:
        reasons.append(f"TFLite vs float32 top-1 agreement {agreement} is below 0.99")
    if not report.get("attributions_complete"):
        reasons.append("per-image attribution file is incomplete")

    return (len(reasons) == 0, reasons)
