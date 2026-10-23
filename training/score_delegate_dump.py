"""Score an on-device delegate-vs-CPU dump and record the release gate.

The dump is produced by a development build. This script does not run the
network and does not lower any ship floor. A failing report is written with
passed false so production stays on CPU.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from delegate_sample import calibration_sample, sample_sha256
from manifest import LABELS_PATH, load_manifest
from recognition_math import HIGH_STAKES_IDS, decide, energy_score
from ship_gates import DELEGATE_DECISION_FIELDS, DELEGATE_PLATFORMS, assess_delegate_release

ENTRY_KEYS = (
    "passed",
    "reason",
    "platform",
    "measured_on",
    "model_sha256",
    "sample_sha256",
    "top1_agreement",
    "high_risk_top1_agreement",
    "decision_agreement",
    "high_risk_decision_agreement",
    "decision_fields",
    "max_energy_difference",
    "images",
    "high_risk_images",
)


def decision_identity(decision: dict) -> tuple:
    """status, top-1 class, expertVerificationRequired. Unavailable never agrees."""
    status = decision.get("status")
    if status == "candidates":
        top3 = decision.get("top3") or []
        top1 = top3[0]["id"] if top3 else decision.get("top_class_id")
        expert = bool(decision.get("expert_verification_required"))
        return (status, top1, expert)
    if status == "rejected":
        return (status, decision.get("top_class_id"), False)
    return ("unavailable", None, False)


def _rate(matches: int, total: int) -> float | None:
    if total < 1:
        return None
    return matches / total


def _finite_logits(values: list) -> bool:
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
        return False
    return all(math.isfinite(float(value)) for value in values)


def _pair_ok(cpu: list, delegate: list, classes: list, ood: dict) -> tuple[bool, bool, float | None]:
    """Top-1 match, decision match, and absolute energy difference."""
    if len(cpu) != len(classes) or len(delegate) != len(classes):
        return False, False, None
    if not _finite_logits(cpu) or not _finite_logits(delegate):
        return False, False, None
    cpu_values = [float(value) for value in cpu]
    delegate_values = [float(value) for value in delegate]
    top1 = max(range(len(cpu_values)), key=cpu_values.__getitem__) == max(
        range(len(delegate_values)), key=delegate_values.__getitem__
    )
    agreed = decision_identity(decide(cpu_values, classes, ood)) == decision_identity(
        decide(delegate_values, classes, ood)
    )
    gap = abs(energy_score(cpu_values) - energy_score(delegate_values))
    return top1, agreed, gap


def score_device_dump(dump: dict, manifest: dict, sample: list[dict]) -> dict:
    """Compare delegate logits to CPU logits on the fixed val+test sample."""
    classes = manifest.get("classes") or []
    ood = manifest.get("ood") if isinstance(manifest.get("ood"), dict) else {}
    dump_images = [image for image in dump.get("images") or [] if isinstance(image, dict)]
    files_match = [image.get("file") for image in dump_images] == [row["file"] for row in sample]
    top1_matches = 0
    risk_top1_matches = 0
    decision_matches = 0
    risk_decision_matches = 0
    risk_images = sum(1 for row in sample if row["class_id"] in HIGH_STAKES_IDS)
    max_gap = 0.0
    gaps_complete = files_match
    if files_match:
        for row, image in zip(sample, dump_images, strict=True):
            high_risk = row["class_id"] in HIGH_STAKES_IDS
            cpu = image.get("cpu_logits")
            delegate = image.get("delegate_logits")
            if not isinstance(cpu, list) or not isinstance(delegate, list):
                gaps_complete = False
                continue
            top1, agreed, gap = _pair_ok(cpu, delegate, classes, ood)
            if gap is None:
                gaps_complete = False
            else:
                max_gap = max(max_gap, gap)
            top1_matches += int(top1)
            decision_matches += int(agreed)
            if high_risk:
                risk_top1_matches += int(top1)
                risk_decision_matches += int(agreed)
    sample_hash = sample_sha256(sample)
    calibrated = bool(ood.get("calibrated") and ood.get("energy_threshold") is not None)
    measurement = {
        "platform": dump.get("platform"),
        "measured_on": dump.get("measured_on"),
        "model_sha256": dump.get("model_sha256"),
        "sample_sha256": sample_hash if files_match else None,
        "top1_agreement": _rate(top1_matches, len(sample)) if files_match else None,
        "high_risk_top1_agreement": _rate(risk_top1_matches, risk_images) if files_match else None,
        "decision_agreement": _rate(decision_matches, len(sample)) if files_match and calibrated else 0.0,
        "high_risk_decision_agreement": _rate(risk_decision_matches, risk_images) if files_match and calibrated else 0.0,
        "decision_fields": list(DELEGATE_DECISION_FIELDS),
        "max_energy_difference": max_gap if gaps_complete else None,
        "images": len(sample) if files_match else len(dump_images),
        "high_risk_images": risk_images if files_match else None,
    }
    expected_risk = sum(1 for row in sample if row["class_id"] in HIGH_STAKES_IDS)
    passed, reasons = assess_delegate_release(
        measurement,
        expected_model_sha256=manifest.get("model_sha256"),
        expected_sample_sha256=sample_hash,
        expected_images=len(sample),
        expected_high_risk_images=expected_risk,
    )
    measurement["passed"] = passed
    measurement["reason"] = None if passed else reasons[0]
    measurement["reasons"] = reasons
    return measurement


def apply_delegate_release(manifest: dict, measurement: dict, sample_hash: str) -> dict:
    """Record one platform. A failed measurement stays passed false."""
    platform = measurement.get("platform")
    if platform not in DELEGATE_PLATFORMS:
        raise ValueError(f"delegate platform {platform} is not android-gpu or core-ml")
    release = dict(manifest.get("delegate_release") or {})
    entry = {key: measurement.get(key) for key in ENTRY_KEYS}
    entry["passed"] = measurement.get("passed") is True
    release[platform] = entry
    updated = dict(manifest)
    updated["delegate_release"] = release
    updated["delegate_sample_sha256"] = sample_hash
    return updated


def write_delegate_release(manifest_path: Path, measurement: dict, sample_hash: str) -> dict:
    manifest = load_manifest(manifest_path)
    updated = apply_delegate_release(manifest, measurement, sample_hash)
    manifest_path.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Score a device delegate-vs-CPU dump")
    parser.add_argument("--dump", required=True, type=Path)
    parser.add_argument("--splits", required=True, type=Path, help="splits.json with val and test rows")
    parser.add_argument("--manifest", type=Path, default=LABELS_PATH)
    parser.add_argument("--write", action="store_true", help="Write this platform's gate into the manifest")
    args = parser.parse_args()
    dump = json.loads(args.dump.read_text(encoding="utf-8"))
    splits = json.loads(args.splits.read_text(encoding="utf-8"))
    sample = calibration_sample(splits)
    manifest = load_manifest(args.manifest)
    measurement = score_device_dump(dump, manifest, sample)
    if args.write:
        write_delegate_release(args.manifest, measurement, sample_sha256(sample))
    print(json.dumps({key: measurement.get(key) for key in (*ENTRY_KEYS, "reasons")}, indent=2))
    if not measurement["passed"]:
        raise SystemExit("delegate agreement gate did not pass; production stays on CPU")


if __name__ == "__main__":
    main()
