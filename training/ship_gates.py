"""Whether measured metrics are good enough to copy weights into the app.

A missing metric fails closed. This module does not invent scores.
Every class in assets/models/labels.json is checked. A missing class, or a
class with no training images or no test images, cannot ship.

The energy keep-rate gate reads the held-out test split. Validation is only
where the threshold is chosen.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path

from evaluate import (
    DATA_DIR,
    attach_fetch_evidence,
    attributions_complete,
    poisonous_sample_reasons,
    without_fetch_counts,
)
from manifest import ROOT, load_manifest, poisonous_heldout_taxa
from recognition_math import (
    BACKGROUND_CLASS_ID,
    DANGEROUS_PAIRS,
    EDIBLE_LOOKALIKE_IDS,
    HIGH_STAKES_IDS,
    UNKNOWN_CLASS_ID,
)
from stats import wilson_interval

ARTIFACTS = ROOT / "training" / "artifacts"
_SHA256 = re.compile(r"^[0-9a-f]{64}$")
# Unknown-class recall stays a diagnostic (target 0.50, bootstrap lower bound
# 0.40). The ship gate only requires enough held-out photos to compute it.
UNKNOWN_DIAGNOSTIC_SUPPORT_MIN = 200
UNKNOWN_DIAGNOSTIC_TAXA_MIN = 10
UNKNOWN_STEAL_MAX = 0.10
HIGH_STAKES_STEAL_SUPPORT_MIN = 30
HELDOUT_BACKGROUND_SUPPORT_MIN = 20
OPEN_SET_SAFE_MIN = 0.90
OPEN_SET_SAFE_WILSON_LOW_MIN = 0.85
OPEN_SET_CONFIDENT_EDIBLE_MAX = 0.02
OPEN_SET_CONFIDENT_EDIBLE_WILSON_HIGH_MAX = 0.05
POISONOUS_HELDOUT_SUPPORT_MIN = 300


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


def _split_total(images: object) -> int | None:
    if not isinstance(images, dict) or not images:
        return None
    total = 0
    for value in images.values():
        count = _whole_count(value)
        if count is None:
            return None
        total += count
    return total


def _high_risk_total(val_images: object, test_images: object) -> int | None:
    if not isinstance(val_images, dict) or not isinstance(test_images, dict):
        return None
    total = 0
    for species_id in HIGH_STAKES_IDS:
        val_count = _whole_count(val_images.get(species_id))
        test_count = _whole_count(test_images.get(species_id))
        if val_count is None or test_count is None:
            return None
        total += val_count + test_count
    return total


def _attribution_file_reasons(directory: Path, coverage: dict) -> list[str]:
    expected = _split_total(coverage.get("train_images"))
    val_total = _split_total(coverage.get("val_images"))
    test_total = _split_total(coverage.get("test_images"))
    if expected is None or val_total is None or test_total is None:
        return ["attribution file cannot be checked without train, val, and test coverage"]
    expected += val_total + test_total
    path = directory / "attributions.jsonl"
    if not path.is_file():
        return ["attribution file was not written next to the model"]
    rows = []
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    except json.JSONDecodeError:
        return ["attribution file next to the model is not valid jsonl"]
    reasons = []
    if len(rows) != expected:
        reasons.append(f"attribution file has {len(rows)} rows, not the {expected} train+val+test images")
    if not attributions_complete(rows):
        reasons.append("attribution file is missing creator, license, image URL, or source page")
    return reasons


def fetch_report_file(directory: Path | None = None) -> Path | None:
    """The fetch report whose hash the ship gate checks.

    A caller-supplied artifact directory uses only the copy inside that
    directory. The real artifacts directory may fall back to training/data.
    """
    folder = ARTIFACTS if directory is None else directory
    bundled = folder / "fetch_report.json"
    if bundled.is_file():
        return bundled
    if folder.resolve() == ARTIFACTS.resolve():
        stored = DATA_DIR / "fetch_report.json"
        if stored.is_file():
            return stored
    return None


def _open_set_reasons(open_set: dict, fetch_file: Path | None = None) -> list[str]:
    """Gates on decide() outcomes for fungi the trainer never saw."""
    reasons = []
    support = _whole_count(open_set.get("held_out_support"))
    safe_count = _whole_count(open_set.get("safe_count"))
    edible_count = _whole_count(open_set.get("confident_edible_count"))
    if support is None or support < 1 or safe_count is None or edible_count is None:
        return ["open-set held-out counts are missing"]
    safe_rate = safe_count / support
    safe_low, _safe_high = wilson_interval(safe_count, support)
    if safe_rate < OPEN_SET_SAFE_MIN or safe_low < OPEN_SET_SAFE_WILSON_LOW_MIN:
        reasons.append(
            f"open-set safe outcome rate {safe_rate:.3f} (95% lower bound {safe_low:.3f}) "
            f"on {support} held-out fungi (need >= {OPEN_SET_SAFE_MIN} and lower bound >= {OPEN_SET_SAFE_WILSON_LOW_MIN})"
        )
    edible_rate = edible_count / support
    _edible_low, edible_high = wilson_interval(edible_count, support)
    if edible_rate > OPEN_SET_CONFIDENT_EDIBLE_MAX or edible_high > OPEN_SET_CONFIDENT_EDIBLE_WILSON_HIGH_MAX:
        reasons.append(
            f"open-set confident edible rate {edible_rate:.3f} (95% upper bound {edible_high:.3f}) "
            f"on {support} held-out fungi (need <= {OPEN_SET_CONFIDENT_EDIBLE_MAX} and upper bound <= {OPEN_SET_CONFIDENT_EDIBLE_WILSON_HIGH_MAX})"
        )
    per_taxon = open_set.get("poisonous_per_taxon")
    manifest = load_manifest()
    probes = manifest.get("toxic_probes") or {}
    if not isinstance(per_taxon, list) or not per_taxon:
        reasons.append("poisonous held-out per-taxon counts are missing")
        return reasons
    # No fetch file: do not trust accepted / gbif_licensed_count written on the metrics row.
    evidenced = (
        without_fetch_counts(per_taxon)
        if fetch_file is None
        else attach_fetch_evidence(per_taxon, report_path=fetch_file)
    )
    reasons.extend(
        poisonous_sample_reasons(
            evidenced,
            probes,
            expected_names=poisonous_heldout_taxa(manifest),
        )
    )
    row_support = 0
    row_edible = 0
    for item in per_taxon:
        if not isinstance(item, dict):
            continue
        support = _whole_count(item.get("support"))
        edible = _whole_count(item.get("confident_edible"))
        if support is None or edible is None:
            continue
        row_support += support
        row_edible += edible
    reported_support = _whole_count(open_set.get("poisonous_held_out_support"))
    if reported_support is None or reported_support != row_support:
        reasons.append(
            f"poisonous held-out support {open_set.get('poisonous_held_out_support')} "
            f"does not match the per-taxon total {row_support}"
        )
    reported_edible = open_set.get("poisonous_held_out_confident_edible")
    if reported_edible != row_edible:
        reasons.append(
            f"poisonous held-out confident edible {reported_edible} "
            f"does not match the per-taxon total {row_edible}"
        )
    strict = open_set.get("deadly_probe_strict_top1_edible")
    if not isinstance(strict, int) or isinstance(strict, bool) or strict != 0:
        reasons.append(
            "deadly probe photos with an edible top-1 and no low-confidence warning: "
            f"{strict} (need 0)"
        )
    return reasons


def assess_shippable(report: dict, artifact_dir: Path | None = None) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    directory = ARTIFACTS if artifact_dir is None else artifact_dir
    fetch_file = fetch_report_file(directory)
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
        if species_id in (BACKGROUND_CLASS_ID, UNKNOWN_CLASS_ID):
            if train_count < 100:
                label = "background class" if species_id == BACKGROUND_CLASS_ID else "unknown_mushroom"
                reasons.append(f"{label} has only {train_count} training images (need >= 100)")
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

    id_keep = ood.get("id_keep_rate_test")
    ood_reject = ood.get("ood_reject_rate_test")
    confident_ood = ood.get("ood_test_softmax_above_0_5")
    caught = ood.get("softmax_above_0_5_still_rejected_rate")
    held_background = ood.get("held_out_not_a_mushroom_support")
    held_background_rate = ood.get("held_out_not_a_mushroom_reject_rate")
    if id_keep is None or id_keep < 0.95:
        reasons.append(
            f"held-out test in-distribution keep rate {id_keep} is below 0.95 "
            "(threshold is fit on validation at 0.97 and scored on test at 0.95)"
        )
    if ood_reject is None or ood_reject < 0.90:
        reasons.append(f"held-out non-mushroom reject rate {ood_reject} is below 0.90")
    held_background_count = _whole_count(held_background)
    if held_background_count is None or held_background_count < HELDOUT_BACKGROUND_SUPPORT_MIN:
        reasons.append(
            f"held-out non-mushroom taxa have support {held_background} "
            f"(need >= {HELDOUT_BACKGROUND_SUPPORT_MIN})"
        )
    elif held_background_rate is None or held_background_rate < 0.90:
        reasons.append(
            f"held-out non-mushroom taxa reject rate {held_background_rate} is below 0.90"
        )
    if confident_ood is None or confident_ood < 30:
        reasons.append(
            f"only {confident_ood} held-out non-mushroom images scored softmax > 0.5; "
            "the energy gate is not validated against overconfident rejects"
        )
    elif caught is None or caught < 0.90:
        reasons.append(
            f"energy rejected only {caught} of non-mushrooms that softmax scored above 0.5 (need >= 0.90)"
        )

    unknown = report.get("unknown_mushroom") or {}
    held_unknown = _whole_count(unknown.get("held_out_support"))
    known_support = _whole_count(unknown.get("known_support"))
    steal = unknown.get("known_predicted_as_unknown_rate")
    taxa_ge_10 = _whole_count(unknown.get("taxa_with_at_least_10"))
    if held_unknown is None or held_unknown < UNKNOWN_DIAGNOSTIC_SUPPORT_MIN:
        reasons.append(
            f"unknown_mushroom held-out support {unknown.get('held_out_support')} "
            f"is below {UNKNOWN_DIAGNOSTIC_SUPPORT_MIN} (needed to report the recall diagnostic)"
        )
    if taxa_ge_10 is None or taxa_ge_10 < UNKNOWN_DIAGNOSTIC_TAXA_MIN:
        reasons.append(
            f"unknown_mushroom held-out taxa with at least 10 images: {unknown.get('taxa_with_at_least_10')} "
            f"(need >= {UNKNOWN_DIAGNOSTIC_TAXA_MIN})"
        )
    if known_support is None or known_support < 1 or not _finite(steal) or steal > UNKNOWN_STEAL_MAX:
        reasons.append(
            f"known species predicted as unknown_mushroom at {steal} on support {known_support} "
            f"(need a rate <= {UNKNOWN_STEAL_MAX})"
        )
    high_stakes_steal = unknown.get("high_stakes_steal") or {}
    for species_id in HIGH_STAKES_IDS:
        block = high_stakes_steal.get(species_id) if isinstance(high_stakes_steal, dict) else None
        support = _whole_count(block.get("support")) if isinstance(block, dict) else None
        rate = block.get("rate") if isinstance(block, dict) else None
        if support is None or support < HIGH_STAKES_STEAL_SUPPORT_MIN or not _finite(rate) or rate > UNKNOWN_STEAL_MAX:
            reasons.append(
                f"high-stakes class {species_id} predicted as unknown_mushroom at {rate} "
                f"on support {support} (need <= {UNKNOWN_STEAL_MAX} and >= {HIGH_STAKES_STEAL_SUPPORT_MIN})"
            )
    reasons.extend(_open_set_reasons(report.get("open_set") or {}, fetch_file))
    toxic_as_edible = report.get("confident_toxic_as_edible")
    if not isinstance(toxic_as_edible, int) or isinstance(toxic_as_edible, bool) or toxic_as_edible != 0:
        reasons.append(
            f"confident toxic-as-edible count is {toxic_as_edible} (need 0 across every poisonous taxon)"
        )

    if not export_ok.get("loaded"):
        reasons.append("TFLite interpreter did not load the exported model")
    if export_ok.get("agreement_source") != "val_and_test_photos":
        reasons.append("TFLite agreement was not measured on held-out val and test photos")
    agreement_images = export_ok.get("agreement_images")
    expected_agreement = _split_total(coverage.get("val_images"))
    test_total = _split_total(coverage.get("test_images"))
    if expected_agreement is None or test_total is None:
        reasons.append("val and test coverage is missing, so TFLite agreement cannot cover the full set")
        expected_agreement = None
    else:
        expected_agreement += test_total
    if not isinstance(agreement_images, int) or isinstance(agreement_images, bool) or expected_agreement is None:
        reasons.append("TFLite agreement did not include the full val and test set")
    elif agreement_images != expected_agreement:
        reasons.append(
            f"TFLite agreement covered {agreement_images} photos, not the full val+test set ({expected_agreement})"
        )
    agreement = export_ok.get("top1_agreement_with_fp32")
    if agreement is None or agreement < 0.99:
        reasons.append(f"TFLite vs float32 top-1 agreement {agreement} is below 0.99")
    high_risk_agreement = export_ok.get("high_risk_top1_agreement")
    high_risk_images = export_ok.get("high_risk_agreement_images")
    expected_risk = _high_risk_total(coverage.get("val_images"), coverage.get("test_images"))
    if (
        not isinstance(high_risk_images, int)
        or isinstance(high_risk_images, bool)
        or expected_risk is None
        or high_risk_images != expected_risk
        or high_risk_images < 1
    ):
        reasons.append(
            f"TFLite high-risk agreement covered {high_risk_images} photos, not the full high-risk val+test set ({expected_risk})"
        )
    elif high_risk_agreement is None or high_risk_agreement < 0.99:
        reasons.append(f"TFLite vs float32 high-risk top-1 agreement {high_risk_agreement} is below 0.99")
    if not report.get("attributions_complete"):
        reasons.append("per-image attribution file is incomplete")
    reasons.extend(_attribution_file_reasons(directory, coverage))

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
    # The hash is the file bytes. A report that counts verified files, records
    # replacements, and sets gbif_licensed_count only for a fully enumerated
    # pool will not match a hash exported from an older report until export
    # runs again. The rare-taxon floor stays 50 unless accepted equals that
    # entire licensed count and the audited count.
    fetch_hash = sha256_file(fetch_file) if fetch_file is not None else None
    if recorded.get("fetch_report_sha256") != fetch_hash:
        reasons.append("fetch_report sha256 does not match the file used for rare-taxon evidence")

    return (len(reasons) == 0, reasons)
