"""Species decision shared with src/services/recognitionDecision.ts.

Energy score follows Liu et al., NeurIPS 2020:
    E(x) = -T * logsumexp(logits / T)
In-distribution inputs score lower. A softmax threshold is not the gate:
a peaked distribution over small logits can still be out of distribution.
"""

from __future__ import annotations

import math

DANGEROUS_GENERA = ("Amanita", "Cortinarius", "Galerina", "Gyromitra")
# A dangerous genus in 2nd or 3rd place warns only at this probability or above.
# Rank 1 always warns. A smaller third-place Amanita must not hide an edible top class.
DANGEROUS_GENUS_MIN_PROBABILITY = 0.10

# Policy floors written into the manifest only after an evaluation run.
# They are not evidence that the energy gate works.
POLICY_MIN_SOFTMAX_FOR_ACCEPT = 0.40
POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE = 0.70
POLICY_MIN_MARGIN = 0.15

BACKGROUND_CLASS_ID = "not_a_mushroom"
UNKNOWN_CLASS_ID = "unknown_mushroom"
# Known species only. The two trailing classes are decisions, not taxa.
NON_SPECIES_IDS = (UNKNOWN_CLASS_ID, BACKGROUND_CLASS_ID)

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
# Sulphur tuft and yellow knight are poisonous classes, so they are not in this
# list. New boletes and the extra Suillus species follow slippery jack: they are
# not the classic twins of the deadly gilled species. Saffron milkcaps are,
# because of the brown roll-rim.
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
    "lactarius_deliciosus",
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
    ("galerina_marginata", "hypholoma_fasciculare"),
    ("amanita_phalloides", "tricholoma_equestre"),
    ("paxillus_involutus", "lactarius_deliciosus"),
    ("boletus_edulis", "tylopilus_felleus"),
    ("neoboletus_luridiformis", "tylopilus_felleus"),
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


def non_species_ids(ood: dict) -> set[str]:
    """Classes that must never be shown as a species candidate."""
    hidden = {
        ood.get("background_class_id") or BACKGROUND_CLASS_ID,
        ood.get("unknown_class_id") or UNKNOWN_CLASS_ID,
    }
    return {class_id for class_id in hidden if class_id}


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

    hidden = non_species_ids(ood)
    background_id = ood.get("background_class_id") or BACKGROUND_CLASS_ID
    unknown_id = ood.get("unknown_class_id") or UNKNOWN_CLASS_ID
    if top_class["id"] == background_id:
        return {**base, "status": "rejected", "reason": "not_a_mushroom"}
    if energy > float(ood["energy_threshold"]):
        return {**base, "status": "rejected", "reason": "not_a_mushroom"}
    accept_floor = ood.get("min_softmax_for_accept")
    # A confident unknown-fungus top class is not a species and not an edibility call.
    # Below the accept floor the picture is unclear instead of "a mushroom we don't know".
    if top_class["id"] == unknown_id and (accept_floor is None or max_softmax >= float(accept_floor)):
        return {**base, "status": "rejected", "reason": "unknown_mushroom"}
    if accept_floor is not None and max_softmax < float(accept_floor):
        return {**base, "status": "rejected", "reason": "unclear"}

    species_order = [index for index in order if classes[index]["id"] not in hidden]
    top3 = species_order[:3]
    high_bar = ood.get("min_top1_softmax_for_high_confidence")
    min_margin = ood.get("min_margin")
    low_confidence = False
    if high_bar is not None and max_softmax < float(high_bar):
        low_confidence = True
    if min_margin is not None and margin < float(min_margin):
        low_confidence = True

    dangerous = False
    for position, index in enumerate(top3):
        genus = classes[index].get("genus")
        probability = probabilities[index]
        if genus in DANGEROUS_GENERA and (position == 0 or probability >= DANGEROUS_GENUS_MIN_PROBABILITY):
            dangerous = True
            break
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
