"""Species decision shared with src/services/recognitionDecision.ts.

Energy score follows Liu et al., NeurIPS 2020:
    E(x) = -T * logsumexp(logits / T)
In-distribution inputs score lower. A softmax threshold is not the gate:
a peaked distribution over small logits can still be out of distribution.
"""

from __future__ import annotations

import math

DANGEROUS_GENERA = ("Amanita", "Cortinarius", "Galerina", "Gyromitra")

# Policy floors written into the manifest only after an evaluation run.
# They are not evidence that the energy gate works.
POLICY_MIN_SOFTMAX_FOR_ACCEPT = 0.40
POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE = 0.70
POLICY_MIN_MARGIN = 0.15

HIGH_STAKES_IDS = (
    "amanita_phalloides",
    "amanita_virosa",
    "amanita_pantherina",
    "amanita_muscaria",
    "gyromitra_esculenta",
    "cortinarius_orellanus",
    "cortinarius_rubellus",
    "galerina_marginata",
    "paxillus_involutus",
)

# Edible or commonly eaten look-alikes. A high-stakes photo predicted as one of
# these is the safety failure the evaluation report must count.
EDIBLE_LOOKALIKE_IDS = (
    "macrolepiota_procera",
    "russula_virescens",
    "agaricus_campestris",
    "amanita_rubescens",
    "morchella_esculenta",
    "kuehneromyces_mutabilis",
    "armillaria_mellea",
    "cantharellus_cibarius",
    "boletus_edulis",
)

DANGEROUS_PAIRS = (
    ("amanita_phalloides", "macrolepiota_procera"),
    ("amanita_phalloides", "russula_virescens"),
    ("amanita_phalloides", "agaricus_campestris"),
    ("amanita_phalloides", "amanita_citrina"),
    ("amanita_virosa", "agaricus_campestris"),
    ("amanita_pantherina", "amanita_rubescens"),
    ("gyromitra_esculenta", "morchella_esculenta"),
    ("galerina_marginata", "kuehneromyces_mutabilis"),
    ("galerina_marginata", "armillaria_mellea"),
    ("boletus_edulis", "tylopilus_felleus"),
    ("cantharellus_cibarius", "hygrophoropsis_aurantiaca"),
    ("macrolepiota_procera", "chlorophyllum_rhacodes"),
    ("cortinarius_orellanus", "cortinarius_rubellus"),
)


def logsumexp(values: list[float]) -> float:
    if not values:
        raise ValueError("logits are empty")
    peak = max(values)
    return peak + math.log(sum(math.exp(value - peak) for value in values))


def softmax(logits: list[float]) -> list[float]:
    peak = max(logits)
    exps = [math.exp(value - peak) for value in logits]
    total = sum(exps)
    return [value / total for value in exps]


def energy_score(logits: list[float], temperature: float = 1.0) -> float:
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    scaled = [value / temperature for value in logits]
    return -temperature * logsumexp(scaled)


def decide(logits: list[float], classes: list[dict], ood: dict) -> dict:
    if len(logits) != len(classes):
        raise ValueError(f"logit length {len(logits)} != class count {len(classes)}")
    if not all(math.isfinite(value) for value in logits):
        return {"status": "unavailable", "reason": "output_mismatch"}
    if not ood.get("calibrated") or ood.get("energy_threshold") is None:
        return {"status": "unavailable", "reason": "gate_not_calibrated"}

    probabilities = softmax(logits)
    energy = energy_score(logits, float(ood.get("temperature") or 1.0))
    order = sorted(range(len(probabilities)), key=lambda index: probabilities[index], reverse=True)
    top = order[0]
    max_softmax = probabilities[top]
    second = probabilities[order[1]] if len(order) > 1 else 0.0
    margin = max_softmax - second
    top_class = classes[top]

    base = {
        "energy": energy,
        "max_softmax": max_softmax,
        "margin": margin,
        "top_class_id": top_class["id"],
    }

    if top_class["id"] == ood.get("background_class_id"):
        return {**base, "status": "rejected", "reason": "not_a_mushroom"}
    if energy > float(ood["energy_threshold"]):
        return {**base, "status": "rejected", "reason": "not_a_mushroom"}
    accept_floor = ood.get("min_softmax_for_accept")
    if accept_floor is not None and max_softmax < float(accept_floor):
        return {**base, "status": "rejected", "reason": "unclear"}

    background_id = ood.get("background_class_id")
    species_order = [index for index in order if classes[index]["id"] != background_id]
    top3 = species_order[:3]
    high_bar = ood.get("min_top1_softmax_for_high_confidence")
    min_margin = ood.get("min_margin")
    low_confidence = False
    if high_bar is not None and max_softmax < float(high_bar):
        low_confidence = True
    if min_margin is not None and margin < float(min_margin):
        low_confidence = True

    dangerous = any(classes[index].get("genus") in DANGEROUS_GENERA for index in top3)
    candidates = []
    for rank, index in enumerate(top3, start=1):
        species = classes[index]
        candidates.append(
            {
                "id": species["id"],
                "name": species.get("name") or species["id"],
                "name_latin": species.get("name_latin") or "",
                "genus": species.get("genus") or "",
                "confidence": probabilities[index],
                "rank": rank,
            }
        )
    warning_reasons = []
    if dangerous:
        warning_reasons.append("dangerous_genus")
    if low_confidence:
        warning_reasons.append("low_confidence")
    return {
        **base,
        "status": "candidates",
        "low_confidence": low_confidence,
        "dangerous_genus": dangerous,
        "expert_verification_required": bool(warning_reasons),
        "warning_reasons": warning_reasons,
        "top3": candidates,
    }
