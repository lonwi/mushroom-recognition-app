"""Per-class top-1/top-3, dangerous-pair confusion, and the energy gate.

The threshold is chosen on the validation split so that 97% of in-distribution
validation images are kept (their energy is at or below the threshold).
The ship gate still requires 95% on the test split.
Held-out test images, including non-mushrooms, are only scored after that.
`training/export_tflite.py` runs this again on the TFLite interpreter's logits.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import zlib
from collections import defaultdict
from pathlib import Path

import numpy as np

from manifest import (
    ROOT,
    _REQUIRED_EXCEPTIONS,
    deadly_heldout_taxa,
    load_manifest,
    poisonous_heldout_taxa,
    safety_catalog,
)
from stats import bootstrap_rate_lower, bootstrap_rate_upper, wilson_interval
from preprocess import ImageReadError, load_oriented_rgb, preprocess_rgb_uint8
from recognition_math import (
    BACKGROUND_CLASS_ID,
    DANGEROUS_PAIRS,
    HIGH_STAKES_IDS,
    NON_SPECIES_IDS,
    POLICY_MIN_MARGIN,
    POLICY_MIN_SOFTMAX_FOR_ACCEPT,
    POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
    UNKNOWN_CLASS_ID,
    decide,
    energy_score,
    softmax,
)

DATA_DIR = ROOT / "training" / "data"
ARTIFACTS = ROOT / "training" / "artifacts"
# Fit the threshold a bit above the 0.95 ship floor. A threshold that keeps
# exactly 95% of validation images fails the test gate on ordinary split noise.
ID_KEEP_FIT = 0.97


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


def row_image_path(row: dict, data_dir: Path = DATA_DIR) -> Path:
    relative = row.get("prepared_file") or row["file"]
    return data_dir / relative


def preprocessed_batch(row: dict, image_size: int, data_dir: Path = DATA_DIR) -> np.ndarray:
    rgb = load_oriented_rgb(row_image_path(row, data_dir))
    return preprocess_rgb_uint8(rgb, image_size).astype(np.float32)[None, ...]


def prediction_from_logits(row: dict, logits: list[float]) -> dict:
    if not all(math.isfinite(value) for value in logits):
        raise ValueError(f"non-finite logits for {row.get('file')}")
    probabilities = softmax(logits)
    order = sorted(range(len(probabilities)), key=probabilities.__getitem__, reverse=True)
    return {
        "class_id": row["class_id"],
        "file": row.get("file"),
        "held_out_taxon": bool(row.get("held_out_taxon")),
        "taxon_name": row.get("taxon_name") or "",
        "genus_relation": row.get("genus_relation") or "",
        "toxic": bool(row.get("toxic")),
        "logits": logits,
        "probabilities": probabilities,
        "order": order,
        "energy": energy_score(logits),
    }


def _predict_rows(model, rows: list[dict], image_size: int) -> list[dict]:
    predictions = []
    for row in rows:
        try:
            tensor = preprocessed_batch(row, image_size)
        except (ImageReadError, OSError, ValueError) as error:
            print(f"skip unreadable {row.get('file')}: {error}", file=sys.stderr)
            continue
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
        if class_id not in NON_SPECIES_IDS:
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

    ood_rows = grouped.get(BACKGROUND_CLASS_ID) or []
    confident = [row for row in ood_rows if max(row["probabilities"]) > 0.5]
    caught = 0
    if threshold is not None and confident:
        caught = sum(
            1
            for row in confident
            if row["energy"] > threshold or class_ids[row["order"][0]] == BACKGROUND_CLASS_ID
        )
    return {
        "per_class": per_class,
        "macro_top1": (sum(top1_values) / len(top1_values)) if top1_values else None,
        "macro_top3": (sum(top3_values) / len(top3_values)) if top3_values else None,
        "dangerous_pair_rates": pair_rates,
        "ood_test_softmax_above_0_5": len(confident) if threshold is not None else None,
        "softmax_above_0_5_still_rejected_rate": (caught / len(confident)) if confident and threshold is not None else None,
    }


def choose_threshold(val_predictions: list[dict], keep_rate: float = ID_KEEP_FIT) -> float:
    """Smallest validation energy that keeps at least `keep_rate` of ID images.

    This is an order statistic, not `numpy.quantile`. The linear quantile sits
    between samples, so on a short validation split fewer than 95% of energies
    are <= that interpolated value. The threshold is fit on validation only.
    """
    if not 0 < keep_rate < 1:
        raise ValueError("keep_rate must be between 0 and 1")
    energies = sorted(
        float(row["energy"])
        for row in val_predictions
        if row["class_id"] != BACKGROUND_CLASS_ID
    )
    if len(energies) < 8:
        raise RuntimeError("need at least 8 in-distribution validation images to set an energy threshold")
    keep_count = math.ceil(keep_rate * len(energies) - 1e-9)
    keep_count = min(len(energies), max(1, keep_count))
    return float(energies[keep_count - 1])


def _keep_rate(predictions: list[dict], threshold: float) -> float | None:
    energies = [row["energy"] for row in predictions if row["class_id"] != BACKGROUND_CLASS_ID]
    if not energies:
        return None
    return sum(1 for energy in energies if energy <= threshold) / len(energies)


def outcome_is_safe(decision: dict) -> bool:
    """Rejected, low confidence, or a dangerous-genus warning. Not a confident edible."""
    if decision.get("status") == "rejected":
        return True
    if decision.get("status") != "candidates":
        return False
    return bool(decision.get("low_confidence") or decision.get("dangerous_genus"))


def outcome_is_confident_edible(decision: dict, edible_ids: set[str]) -> bool:
    """decide() would show an edible species with no low-confidence and no genus warning."""
    if decision.get("status") != "candidates":
        return False
    if decision.get("low_confidence") or decision.get("dangerous_genus"):
        return False
    top3 = decision.get("top3") or []
    if not top3:
        return False
    return top3[0]["id"] in edible_ids


def outcome_is_strict_top1_edible(decision: dict, edible_ids: set[str]) -> bool:
    """Top-1 is an edible species and the result is not low-confidence.

    A dangerous-genus banner does not clear this. Deadly probes use it so a
    confident parasol stays a failure when Amanita is only a small later rank.
    """
    if decision.get("status") != "candidates":
        return False
    if decision.get("low_confidence"):
        return False
    top3 = decision.get("top3") or []
    if not top3:
        return False
    return top3[0]["id"] in edible_ids


def deadly_probe_taxa(manifest: dict) -> list[str]:
    """Strict visual groups, deadly held-out taxa, used by the zero edible-top-1 gate."""
    return deadly_heldout_taxa(manifest)


def _integer(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def rare_exception_applies(name: str, item: dict, row: dict, probes: dict, groups: list) -> bool:
    """The 5-photo floor, only for a closed-list taxon whose licensed pool was exhausted.

    ``accepted`` is the verified-file count from the fetch report. It is below
    the cap when that candidate pool could not fill the cap, including when
    some downloads failed and nothing remained to replace them. ``gbif_licensed_count``
    is the size of that licensed pool, not the file count, and it must match
    the audited exception and be under 50. A null group, an extra name, or a
    full cap does not qualify.
    """
    if name not in _REQUIRED_EXCEPTIONS:
        return False
    group_id = item.get("group_id")
    if not isinstance(group_id, str) or not group_id:
        return False
    group = next((candidate for candidate in groups if candidate.get("id") == group_id), None)
    taxa = [str(taxon) for taxon in (group or {}).get("taxa") or []]
    if group is None or name not in taxa:
        return False
    cap = _integer(probes.get("per_taxon_cap"))
    accepted = _integer(row.get("accepted"))
    licensed = _integer(row.get("gbif_licensed_count"))
    audited = _integer(item.get("gbif_licensed_count"))
    if cap is None or accepted is None or licensed is None or audited is None:
        return False
    if audited >= 50 or licensed >= 50 or licensed != audited:
        return False
    return accepted < cap


def _whole(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        return None
    return value


def poisonous_sample_reasons(
    per_taxon: list,
    probes: dict | None,
    *,
    expected_names: list[str] | None = None,
) -> list[str]:
    """Floors for poisonous held-out photos.

    Visual groups have a total. Every taxon needs 50 images unless it is one of
    the closed rare_taxon_exceptions AND the fetch row shows the whole licensed
    pool was taken (accepted below the cap, licensed count under 50 and equal
    to the audited count). That exception needs 5 images, 0 confident-edible
    outcomes, and a group that still meets its minimum. A null group or an
    extra name does not lower the floor. The poisonous held-out total stays
    at least 300.
    """
    probes = probes or {}
    other_min = int(probes.get("other_taxon_minimum") or 50)
    rare_min = int(probes.get("rare_exception_minimum") or 5)
    total_min = int(probes.get("minimum_poisonous_held_out_images") or 300)
    exceptions = {
        str(item.get("taxon")): item
        for item in (probes.get("rare_taxon_exceptions") or [])
        if isinstance(item, dict)
    }
    groups = [group for group in (probes.get("visual_groups") or []) if isinstance(group, dict)]
    reasons: list[str] = []
    rows: dict[str, dict] = {}
    if not isinstance(per_taxon, list):
        return ["poisonous held-out per-taxon counts are missing"]
    for item in per_taxon:
        if not isinstance(item, dict):
            reasons.append("poisonous held-out per-taxon row is not an object")
            continue
        name = str(item.get("taxon") or "")
        support = _whole(item.get("support"))
        edible = _whole(item.get("confident_edible"))
        if support is None:
            reasons.append(f"{name or '?'} support is not a count")
            continue
        if edible is None:
            reasons.append(f"{name or '?'} confident edible count is not a count")
            continue
        rows[name] = {
            "support": support,
            "confident_edible": edible,
            "accepted": item.get("accepted"),
            "gbif_licensed_count": item.get("gbif_licensed_count"),
        }

    if expected_names is not None:
        missing = [name for name in expected_names if name not in rows]
        if missing:
            reasons.append(
                "poisonous held-out taxa missing from the report (counted as below their floor): "
                + ", ".join(missing)
            )

    total = 0
    edible_total = 0
    for name, item in rows.items():
        support = item["support"]
        edible = item["confident_edible"]
        total += support
        edible_total += edible
        if name in exceptions and rare_exception_applies(name, exceptions[name], item, probes, groups):
            if support < rare_min:
                reasons.append(
                    f"{name} is a rare-taxon exception with {support} photos; need at least {rare_min}"
                )
            if edible != 0:
                reasons.append(
                    f"{name} is a rare-taxon exception with {edible} confident edible outcomes; need 0"
                )
        elif support < other_min:
            reasons.append(
                f"{name} has {support} poisonous held-out photos; need {other_min} or a rare_taxon_exception"
            )

    for group in groups:
        names = [str(name) for name in group.get("taxa") or []]
        absent = [name for name in names if name not in rows]
        if absent:
            reasons.append(f"visual group {group.get('id')} is missing {', '.join(absent)}")
            continue
        group_total = sum(rows[name]["support"] for name in names)
        minimum = int(group.get("minimum_images") or 0)
        if group_total < minimum:
            reasons.append(f"visual group {group.get('id')} has {group_total} images; need {minimum}")

    for name, item in exceptions.items():
        if name not in _REQUIRED_EXCEPTIONS:
            reasons.append(f"rare exception {name} is not in the closed exception list")
            continue
        if expected_names is not None and name not in rows:
            reasons.append(f"rare exception {name} is missing from the poisonous held-out report")
        group_id = item.get("group_id")
        if not isinstance(group_id, str) or not group_id:
            reasons.append(f"rare exception {name} must belong to a visual group")
            continue
        group = next((candidate for candidate in groups if candidate.get("id") == group_id), None)
        if group is None or name not in [str(taxon) for taxon in group.get("taxa") or []]:
            reasons.append(f"rare exception {name} group {group_id} does not contain that taxon")

    if total < total_min:
        reasons.append(f"poisonous held-out support {total} is below {total_min}")
    if edible_total != 0:
        reasons.append(
            f"poisonous held-out photos shown as a confident edible: {edible_total} (need 0)"
        )
    return reasons


def annotate_safety(predictions: list[dict], manifest: dict) -> set[str]:
    """Mark each photo poisonous from the class or from its taxon. Returns edible class ids."""
    catalog = safety_catalog(manifest)
    taxa = catalog["taxa"]
    toxic_classes = catalog["toxic_class_ids"]
    for row in predictions:
        taxon = taxa.get(row.get("taxon_name") or "")
        row["toxic"] = row["class_id"] in toxic_classes or bool(taxon and taxon.get("toxic"))
        if taxon and not row.get("genus_relation"):
            row["genus_relation"] = taxon.get("relation") or ""
        if taxon and taxon.get("held_out"):
            row["held_out_taxon"] = True
    return set(catalog["edible_ids"])


def confident_toxic_as_edible(predictions: list[dict], classes: list[dict], ood_config: dict, edible_ids: set[str]) -> int:
    """Poisonous photos the app would show as a confident edible species.

    Known classes, unknown-class taxa, and held-out probes all count when the
    row is marked toxic. The edible side is every class tagged edible, not
    only the named look-alikes. Energy rejects, low confidence, and a
    dangerous-genus warning are not counted. The ship gate requires zero.
    """
    count = 0
    for row in predictions:
        if not row.get("toxic"):
            continue
        decision = decide(row["logits"], classes, ood_config)
        if outcome_is_confident_edible(decision, edible_ids):
            count += 1
    return count


def _decision_is_unknown(row: dict, classes: list[dict], ood_config: dict) -> bool:
    decision = decide(row["logits"], classes, ood_config)
    return decision.get("status") == "rejected" and decision.get("reason") == "unknown_mushroom"


def _unknown_metrics(test_pred: list[dict], class_ids: list[str], classes: list[dict], ood_config: dict) -> dict:
    """Recall of the unknown class is a diagnostic. Steal uses decide(), not argmax alone."""
    empty = {
        "held_out_support": 0,
        "held_out_recall": None,
        "held_out_taxa": 0,
        "taxa_with_at_least_10": 0,
        "per_taxon_recall_lower_bound_min": None,
        "known_support": 0,
        "known_predicted_as_unknown_rate": None,
        "high_stakes_steal": {},
        "by_relation": {},
        "diagnostic_only": True,
    }
    if UNKNOWN_CLASS_ID not in class_ids:
        return empty
    unknown_index = class_ids.index(UNKNOWN_CLASS_ID)
    held = [
        row
        for row in test_pred
        if row["class_id"] == UNKNOWN_CLASS_ID and row.get("held_out_taxon")
    ]
    known = [row for row in test_pred if row["class_id"] not in NON_SPECIES_IDS]
    recall = (
        sum(1 for row in held if row["order"][0] == unknown_index) / len(held) if held else None
    )
    stolen_flags = [_decision_is_unknown(row, classes, ood_config) for row in known]
    stolen = (sum(stolen_flags) / len(known)) if known else None
    by_taxon: dict[str, list[dict]] = defaultdict(list)
    for row in held:
        by_taxon[row.get("taxon_name") or ""].append(row)
    lowers = []
    taxa_ge_10 = 0
    for name, rows in sorted(by_taxon.items()):
        if len(rows) < 10:
            continue
        taxa_ge_10 += 1
        hits = sum(1 for row in rows if row["order"][0] == unknown_index)
        lowers.append(bootstrap_rate_lower(hits, len(rows), seed=zlib.crc32(name.encode("utf-8")) % 10_000))
    steal_by_class = {}
    for species_id in HIGH_STAKES_IDS:
        rows = [row for row in known if row["class_id"] == species_id]
        if not rows:
            steal_by_class[species_id] = {"support": 0, "rate": None}
            continue
        taken = sum(1 for row in rows if _decision_is_unknown(row, classes, ood_config))
        steal_by_class[species_id] = {"support": len(rows), "rate": taken / len(rows)}
    by_relation = {}
    for relation in ("unknown_genus", "unknown_species_of_known_genus"):
        rows = [row for row in held if row.get("genus_relation") == relation]
        hits = sum(1 for row in rows if row["order"][0] == unknown_index) if rows else 0
        by_relation[relation] = {
            "support": len(rows),
            "unknown_recall": (hits / len(rows)) if rows else None,
        }
    return {
        "held_out_support": len(held),
        "held_out_recall": recall,
        "held_out_taxa": len([name for name in by_taxon if name]),
        "taxa_with_at_least_10": taxa_ge_10,
        "per_taxon_recall_lower_bound_min": min(lowers) if lowers else None,
        "known_support": len(known),
        "known_predicted_as_unknown_rate": stolen,
        "high_stakes_steal": steal_by_class,
        "by_relation": by_relation,
        "diagnostic_only": True,
        "diagnostic_targets": {
            "recall": 0.50,
            "support": 200,
            "taxa_with_at_least_10": 10,
            "per_taxon_bootstrap_lower_bound": 0.40,
            "note": (
                "Recall and the per-taxon bootstrap bound are diagnostics. "
                "The ship gate requires the sample size so the diagnostic exists. "
                "It does not fail the ship on the 0.50 or 0.40 figures."
            ),
        },
    }


def _empty_taxon_bucket(name: str) -> dict:
    return {
        "taxon": name,
        "support": 0,
        "confident_edible": 0,
        "strict_top1_edible": 0,
        "confident_edible_wilson_high": None,
        "confident_edible_bootstrap_high": None,
    }


def _fill_taxon_bounds(bucket: dict) -> None:
    support = bucket["support"]
    if support < 1:
        return
    _low, high = wilson_interval(bucket["confident_edible"], support)
    bucket["confident_edible_wilson_high"] = high
    bucket["confident_edible_bootstrap_high"] = bootstrap_rate_upper(
        bucket["confident_edible"],
        support,
        seed=zlib.adler32(str(bucket["taxon"]).encode("utf-8")) & 0xFFFFFFFF,
    )


def open_set_metrics(
    test_pred: list[dict],
    classes: list[dict],
    ood_config: dict,
    edible_ids: set[str],
    expected_poisonous_taxa: list[str] | None = None,
    deadly_taxa: list[str] | None = None,
    probes: dict | None = None,
) -> dict:
    """decide() outcomes on fungi held out of train and val, including toxic probes."""
    held = [
        row
        for row in test_pred
        if row.get("held_out_taxon") and row["class_id"] == UNKNOWN_CLASS_ID
    ]
    poisonous = [row for row in held if row.get("toxic")]
    safe = 0
    confident = 0
    for row in held:
        decision = decide(row["logits"], classes, ood_config)
        if outcome_is_safe(decision):
            safe += 1
        if outcome_is_confident_edible(decision, edible_ids):
            confident += 1
    poisonous_confident = 0
    strict_edible = 0
    deadly = set(deadly_taxa or [])
    per_taxon: dict[str, dict] = {
        name: _empty_taxon_bucket(name) for name in (expected_poisonous_taxa or [])
    }
    for row in poisonous:
        name = row.get("taxon_name") or ""
        bucket = per_taxon.setdefault(name, _empty_taxon_bucket(name))
        bucket["support"] += 1
        decision = decide(row["logits"], classes, ood_config)
        if outcome_is_confident_edible(decision, edible_ids):
            poisonous_confident += 1
            bucket["confident_edible"] += 1
        if name in deadly and outcome_is_strict_top1_edible(decision, edible_ids):
            strict_edible += 1
            bucket["strict_top1_edible"] += 1
    for row in test_pred:
        if row.get("class_id") not in HIGH_STAKES_IDS:
            continue
        decision = decide(row["logits"], classes, ood_config)
        if outcome_is_strict_top1_edible(decision, edible_ids):
            strict_edible += 1
    for bucket in per_taxon.values():
        _fill_taxon_bounds(bucket)
    support = len(held)
    safe_low = safe_high = None
    edible_low = edible_high = None
    if support:
        safe_low, safe_high = wilson_interval(safe, support)
        edible_low, edible_high = wilson_interval(confident, support)
    probe_config = probes or {}
    other_min = int(probe_config.get("other_taxon_minimum") or 50)
    rare_min = int(probe_config.get("rare_exception_minimum") or 5)
    groups = [group for group in (probe_config.get("visual_groups") or []) if isinstance(group, dict)]
    exception_rows = {
        str(item.get("taxon")): item
        for item in (probe_config.get("rare_taxon_exceptions") or [])
        if isinstance(item, dict)
    }
    below = []
    for item in per_taxon.values():
        exception = exception_rows.get(item["taxon"])
        floor = (
            rare_min
            if exception and rare_exception_applies(item["taxon"], exception, item, probe_config, groups)
            else other_min
        )
        if item["support"] < floor:
            below.append(item["taxon"])
    by_relation = {}
    for relation in ("unknown_genus", "unknown_species_of_known_genus"):
        rows = [row for row in held if row.get("genus_relation") == relation]
        relation_safe = 0
        relation_edible = 0
        for row in rows:
            decision = decide(row["logits"], classes, ood_config)
            if outcome_is_safe(decision):
                relation_safe += 1
            if outcome_is_confident_edible(decision, edible_ids):
                relation_edible += 1
        by_relation[relation] = {
            "support": len(rows),
            "safe_rate": (relation_safe / len(rows)) if rows else None,
            "confident_edible_rate": (relation_edible / len(rows)) if rows else None,
        }
    return {
        "held_out_support": support,
        "safe_count": safe,
        "safe_rate": (safe / support) if support else None,
        "safe_rate_wilson_low": safe_low,
        "confident_edible_count": confident,
        "confident_edible_rate": (confident / support) if support else None,
        "confident_edible_wilson_high": edible_high,
        "poisonous_held_out_support": len(poisonous),
        "poisonous_held_out_confident_edible": poisonous_confident,
        "poisonous_held_out_confident_edible_wilson_high": (
            wilson_interval(poisonous_confident, len(poisonous))[1] if poisonous else None
        ),
        "poisonous_held_out_confident_edible_bootstrap_high": (
            bootstrap_rate_upper(poisonous_confident, len(poisonous), seed=0) if poisonous else None
        ),
        "deadly_probe_strict_top1_edible": strict_edible,
        "poisonous_per_taxon": sorted(per_taxon.values(), key=lambda item: item["taxon"]),
        "taxa_below_minimum": sorted(below),
        "by_relation": by_relation,
    }


def _reject_rate(rows: list[dict], classes: list[dict], ood_config: dict) -> float | None:
    if not rows:
        return None
    rejected = 0
    for row in rows:
        decision = decide(row["logits"], classes, ood_config)
        if decision["status"] == "rejected":
            rejected += 1
    return rejected / len(rows)


FETCH_COUNT_FIELDS = ("accepted", "gbif_licensed_count")


def without_fetch_counts(per_taxon: list) -> list:
    """Drop license counts that only a fetch report is allowed to supply."""
    stripped = []
    for row in per_taxon:
        if not isinstance(row, dict):
            stripped.append(row)
            continue
        stripped.append({key: value for key, value in row.items() if key not in FETCH_COUNT_FIELDS})
    return stripped


def _with_fetch_counts(row: dict, evidence: dict | None) -> dict:
    copy = {key: value for key, value in row.items() if key not in FETCH_COUNT_FIELDS}
    if evidence:
        for field in FETCH_COUNT_FIELDS:
            if field in evidence:
                copy[field] = evidence[field]
    return copy


def attach_fetch_evidence(
    per_taxon: list,
    fetch_report: dict | None = None,
    report_path: Path | None = None,
) -> list:
    """Replace accepted and gbif_licensed_count from the fetch report.

    Metrics rows do not keep those counts. A missing, unreadable, or
    incomplete report drops them, so a rare-taxon exception cannot lower
    the 50-photo floor unless the report itself shows the pool was exhausted.
    """
    if not isinstance(per_taxon, list):
        return per_taxon
    if fetch_report is None:
        path = report_path if report_path is not None else DATA_DIR / "fetch_report.json"
        if not path.is_file():
            return without_fetch_counts(per_taxon)
        try:
            fetch_report = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return without_fetch_counts(per_taxon)
    if not isinstance(fetch_report, dict):
        return without_fetch_counts(per_taxon)
    by_name: dict[str, dict] = {}
    for key in ("taxa", "toxic_probes"):
        for item in fetch_report.get(key) or []:
            if isinstance(item, dict) and item.get("taxon") and str(item["taxon"]) not in by_name:
                by_name[str(item["taxon"])] = item
    merged = []
    for row in per_taxon:
        if not isinstance(row, dict):
            merged.append(row)
            continue
        evidence = by_name.get(str(row.get("taxon") or ""))
        merged.append(_with_fetch_counts(row, evidence))
    return merged


def assemble_report(manifest: dict, splits: dict, val_pred: list[dict], test_pred: list[dict]) -> dict:
    """Metrics for one set of logits. Export passes TFLite logits; evaluate passes Keras.

    The energy threshold is chosen on validation. In-distribution keep rate is
    reported for both splits and the ship gate reads the test split only.
    """
    class_ids = [item["id"] for item in manifest["classes"]]
    classes = manifest["classes"]
    edible_ids = annotate_safety(val_pred, manifest)
    annotate_safety(test_pred, manifest)
    threshold = choose_threshold(val_pred)
    id_keep_val = _keep_rate(val_pred, threshold)
    id_keep_test = _keep_rate(test_pred, threshold)
    summary = summarize(test_pred, class_ids, threshold)
    ood_test = [row for row in test_pred if row["class_id"] == BACKGROUND_CLASS_ID]
    held_ood = [row for row in ood_test if row.get("held_out_taxon")]
    ood_config = {
        "calibrated": True,
        "background_class_id": BACKGROUND_CLASS_ID,
        "unknown_class_id": UNKNOWN_CLASS_ID,
        "temperature": 1,
        "energy_threshold": threshold,
        "min_softmax_for_accept": POLICY_MIN_SOFTMAX_FOR_ACCEPT,
        "min_top1_softmax_for_high_confidence": POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
        "min_margin": POLICY_MIN_MARGIN,
    }
    ood_reject = _reject_rate(ood_test, classes, ood_config)
    held_ood_reject = _reject_rate(held_ood, classes, ood_config)
    train_rows = list(splits.get("train") or [])
    val_rows = list(splits.get("val") or [])
    test_rows = list(splits.get("test") or [])
    all_rows = train_rows + val_rows + test_rows
    return {
        "per_class": summary["per_class"],
        "macro_top1": summary["macro_top1"],
        "macro_top3": summary["macro_top3"],
        "dangerous_pair_rates": summary["dangerous_pair_rates"],
        "confident_toxic_as_edible": confident_toxic_as_edible(test_pred, classes, ood_config, edible_ids),
        "open_set": open_set_metrics(
            test_pred,
            classes,
            ood_config,
            edible_ids,
            poisonous_heldout_taxa(manifest),
            deadly_probe_taxa(manifest),
            manifest.get("toxic_probes") or {},
        ),
        "unknown_mushroom": _unknown_metrics(test_pred, class_ids, classes, ood_config),
        "coverage": {
            "train_images": image_counts(train_rows, class_ids),
            "val_images": image_counts(val_rows, class_ids),
            "test_images": image_counts(test_rows, class_ids),
        },
        "ood": {
            "method": "energy_logsumexp_plus_background_class",
            "energy_threshold": threshold,
            "temperature": 1,
            "min_softmax_for_accept": POLICY_MIN_SOFTMAX_FOR_ACCEPT,
            "min_top1_softmax_for_high_confidence": POLICY_MIN_TOP1_FOR_HIGH_CONFIDENCE,
            "min_margin": POLICY_MIN_MARGIN,
            "id_keep_rate_val": id_keep_val,
            "id_keep_rate_test": id_keep_test,
            "ood_reject_rate_test": ood_reject,
            "ood_test_count": len(ood_test),
            "held_out_not_a_mushroom_support": len(held_ood),
            "held_out_not_a_mushroom_reject_rate": held_ood_reject,
            "ood_test_softmax_above_0_5": summary["ood_test_softmax_above_0_5"],
            "softmax_above_0_5_still_rejected_rate": summary["softmax_above_0_5_still_rejected_rate"],
            "note": (
                "The energy threshold is the lowest validation in-distribution energy that "
                f"keeps at least {ID_KEEP_FIT:.0%} of validation ID images (an order statistic, not a linear "
                "quantile). The fit is above 95% so split noise does not fail a 95% test gate. "
                "id_keep_rate_val is that calibration check. id_keep_rate_test is the "
                "same threshold on the held-out test split and is the ship gate, still at 95%. "
                "Export overwrites this report with TFLite interpreter logits on the real val and test photos. "
                "softmax_above_0_5_still_rejected_rate is the share of test non-mushrooms "
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
