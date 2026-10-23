"""Export a float-input TFLite model and refuse to install it unless ship gates pass.

The default graph is fp16 weights with float32 input and output. react-native-fast-tflite
runs that graph on the Android GPU delegate or the iOS Core ML delegate, and on
XNNPACK when the delegate falls back to CPU. `--also-export` writes a second graph
beside it: int8 (full-integer ops), dynamic-range, or fp16.

int8 calibration uses the train split only. Val and test are scored, never used to
pick ranges. Input and output stay float32 so the on-device MobileNetV3 preprocess
does not change. The quantized graph is installed only with `--select-quantized`
and only after assess_shippable passes every existing gate. Deltas versus the fp32
graph are reported. They are not thresholds, and no gate is lowered.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import tempfile
from pathlib import Path

from evaluate import (
    DATA_DIR,
    assemble_report,
    choose_threshold,
    id_validation_energies,
    preprocessed_batch,
    prediction_from_logits,
)
from import_external import published_rows
from manifest import LABELS_PATH, ROOT, load_manifest
from recognition_math import HIGH_STAKES_IDS
from ship_gates import TFLITE_AGREEMENT_MIN, assess_shippable, blank_delegate_release, fetch_report_file, sha256_file

ARTIFACTS = ROOT / "training" / "artifacts"
MODEL_DEST = ROOT / "assets" / "models" / "mushrooms_model.tflite"
ATTRIBUTION_DEST = ROOT / "assets" / "models" / "attributions.jsonl"
PACKAGE_MODULE = ROOT / "src" / "services" / "modelPackage.ts"
# fp16 is the phone path. int8, dynamic-range, and an explicit fp32 graph are opt-in.
DEFAULT_QUANTIZATIONS = ("fp16",)
FLOAT_REFERENCE = "fp32"
QUANTIZED_EXPORTS = ("int8", "dynamic", "fp16")
SUMMARY_KEYS = (
    "macro_top1",
    "macro_top3",
    "confident_toxic_as_edible",
    "id_keep_rate_test",
    "ood_reject_rate_test",
    "top1_agreement_with_fp32",
    "high_risk_top1_agreement",
)


def attribution_row(row: dict) -> dict:
    source = row.get("source_url") or row.get("gbif_occurrence") or ""
    slim = {
        "file": row.get("prepared_file") or row.get("file") or "",
        "class_id": row.get("class_id") or "",
        "creator": row.get("creator") or "",
        "license": row.get("license") or "",
        "license_normalized": row.get("license_normalized") or "",
        "image_url": row.get("image_url") or "",
        "source_url": source,
        "gbif_occurrence": row.get("gbif_occurrence") or "",
        "taxon_name": row.get("taxon_name") or "",
    }
    usage = row.get("usage")
    if isinstance(usage, str) and usage:
        slim["usage"] = usage
    license_url = row.get("license_url")
    if isinstance(license_url, str) and license_url.strip():
        slim["license_url"] = license_url.strip()
    if row.get("unverified") is True:
        slim["unverified"] = True
    return slim


def write_attribution_file(rows: list[dict], path: Path) -> None:
    """One JSON line per image: author, license, and source URL.

    Every train, val, and test row is written, including CC BY-NC, CC BY-SA,
    and DF20. Each line keeps the author (``creator``), the licence text, and
    ``license_normalized``. A CC BY-NC or CC BY-SA line also keeps the https
    ``license_url`` from that photo. A DF20 line is the dataset row: author
    and ``df20``, with no per-photo licence URL. CC BY-NC and CC BY-SA may
    train a released model and do not block the ship gate. DF20 is written
    only when the run opted in, and the ship gate stays closed until
    ``DF20_CONSENT_CONFIRMED`` is true. The gallery check is
    separate and still shows only CC0 and CC BY. An image or source URL that
    is not https is refused. Counts by licence and source are written beside
    this file as ``license_breakdown.json``.
    """
    for row in rows:
        for field in ("image_url", "source_url"):
            value = row.get(field)
            if isinstance(value, str) and value.strip() and not value.strip().lower().startswith("https://"):
                raise RuntimeError(f"{field} must be an https URL, got {value!r}")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(attribution_row(row), ensure_ascii=False) + "\n")
    from license_policy import license_breakdown

    summary = {"train_val_test": license_breakdown(rows)}
    path.with_name("license_breakdown.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def calibration_rows(splits: dict) -> list[dict]:
    """Train split only. Val and test never calibrate int8 ranges."""
    if not isinstance(splits, dict):
        raise RuntimeError("int8 representative dataset requires the train split")
    rows = []
    for row in splits.get("train") or []:
        if not isinstance(row, dict):
            raise RuntimeError("int8 representative dataset rows must be image records")
        split = row.get("split")
        if split in {"val", "test"}:
            raise RuntimeError("int8 representative dataset may only use the train split, never val or test")
        rows.append(row)
    return rows


def attribution_rows_for_publication(rows: list[dict]) -> list[dict]:
    """Credits for the atlas gallery, ``site/``, and comparison photos.

    CC BY-NC, CC BY-SA, and DF20 are omitted. This is not the ship-gate file.
    """
    return [attribution_row(row) for row in published_rows(rows)]


def representative_dataset(rows: list[dict], image_size: int, data_dir: Path):
    """int8 calibration photos. Empty input is an error; noise is not a substitute."""
    if not rows:
        raise RuntimeError("int8 representative dataset requires real training images, not noise")
    for row in rows:
        split = row.get("split") if isinstance(row, dict) else None
        if split in {"val", "test"}:
            raise RuntimeError("int8 representative dataset may only use the train split, never val or test")

    def samples():
        for row in rows:
            yield [preprocessed_batch(row, image_size, data_dir)]

    return samples


def convert_and_load(model, quantization: str, image_size: int, class_count: int, train_rows: list[dict], data_dir: Path):
    import numpy as np
    import tensorflow as tf

    if not train_rows:
        raise RuntimeError("int8 representative dataset requires real training images, not noise")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    if quantization == "int8":
        # Full-integer ops. Float input and output keep the MobileNetV3 preprocess.
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.representative_dataset = representative_dataset(train_rows, image_size, data_dir)
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.float32
        converter.inference_output_type = tf.float32
    elif quantization == "dynamic":
        # Int8 weights, float activations. No representative dataset, so val and test stay out.
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    elif quantization == "fp16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
    elif quantization == "fp32":
        pass
    else:
        raise ValueError(quantization)
    payload = converter.convert()
    interpreter = tf.lite.Interpreter(model_content=payload)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    sample = preprocessed_batch(train_rows[0], image_size, data_dir)
    interpreter.set_tensor(input_details[0]["index"], sample)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"])
    if tuple(output.shape) != (1, class_count):
        raise RuntimeError(f"unexpected TFLite output shape {output.shape}")
    if not np.isfinite(output).all():
        raise RuntimeError("TFLite output is not finite")
    return payload, interpreter


def score_interpreter(model, interpreter, rows: list[dict], image_size: int, data_dir: Path):
    """TFLite logits on real photos, plus top-1 matches against the Keras model."""
    import numpy as np

    if not rows:
        raise RuntimeError("TFLite scoring requires real photos, not noise")
    input_index = interpreter.get_input_details()[0]["index"]
    output_index = interpreter.get_output_details()[0]["index"]
    predictions = []
    matches = 0
    risk_matches = 0
    risk_total = 0
    high_risk = set(HIGH_STAKES_IDS)
    for row in rows:
        batch = preprocessed_batch(row, image_size, data_dir)
        keras_logits = np.asarray(model.predict(batch, verbose=0)[0], dtype=np.float64)
        interpreter.set_tensor(input_index, batch)
        interpreter.invoke()
        lite_logits = np.asarray(interpreter.get_tensor(output_index)[0], dtype=np.float64)
        if lite_logits.shape != keras_logits.shape:
            raise RuntimeError(f"TFLite output rank does not match Keras for {row.get('file')}")
        if not np.isfinite(lite_logits).all() or not np.isfinite(keras_logits).all():
            raise RuntimeError(f"non-finite logits for {row.get('file')}")
        agree = int(int(np.argmax(keras_logits)) == int(np.argmax(lite_logits)))
        matches += agree
        if row.get("class_id") in high_risk:
            risk_total += 1
            risk_matches += agree
        predictions.append(prediction_from_logits(row, lite_logits.tolist()))
    return predictions, matches, risk_matches, risk_total


def _numeric_delta(left: object, right: object) -> float | None:
    if isinstance(left, bool) or isinstance(right, bool):
        return None
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        if math.isfinite(left) and math.isfinite(right):
            return float(right) - float(left)
    return None


def summary_metrics(report: dict) -> dict:
    ood = report.get("ood") if isinstance(report.get("ood"), dict) else {}
    tflite = report.get("tflite") if isinstance(report.get("tflite"), dict) else {}
    return {
        "macro_top1": report.get("macro_top1"),
        "macro_top3": report.get("macro_top3"),
        "confident_toxic_as_edible": report.get("confident_toxic_as_edible"),
        "id_keep_rate_test": ood.get("id_keep_rate_test"),
        "ood_reject_rate_test": ood.get("ood_reject_rate_test"),
        "top1_agreement_with_fp32": tflite.get("top1_agreement_with_fp32"),
        "high_risk_top1_agreement": tflite.get("high_risk_top1_agreement"),
    }


def metric_delta(float_report: dict, quantized_report: dict) -> dict:
    """Quantized minus fp32. Reporting only. Ship gates do not read this."""
    left = summary_metrics(float_report)
    right = summary_metrics(quantized_report)
    return {key: _numeric_delta(left[key], right[key]) for key in SUMMARY_KEYS}


def choose_install_target(*, select_quantized: bool, primary_shippable: bool, quantized_shippable: bool) -> str:
    """The quantized file is installed only when every existing ship gate passed."""
    if select_quantized:
        if quantized_shippable:
            return "quantized"
        return "refuse"
    if primary_shippable:
        return "primary"
    return "refuse"


def assess_export(report: dict, payload: bytes, artifact_dir: Path) -> tuple[bool, list[str]]:
    """Run the unchanged ship gates on one exported graph."""
    directory = Path(tempfile.mkdtemp(prefix="tflite-gates-"))
    try:
        tflite_path = directory / "mushrooms_model.tflite"
        tflite_path.write_bytes(payload)
        keras = artifact_dir / "model.keras"
        if not keras.is_file():
            return False, ["model.keras is missing, so the quantized export cannot be gated"]
        shutil.copyfile(keras, directory / "model.keras")
        attribution = artifact_dir / "attributions.jsonl"
        if attribution.is_file():
            shutil.copyfile(attribution, directory / "attributions.jsonl")
        fetch = fetch_report_file(artifact_dir)
        if fetch is not None:
            shutil.copyfile(fetch, directory / "fetch_report.json")
        metrics = json.loads(json.dumps(report))
        fetch_copy = directory / "fetch_report.json"
        metrics["artifacts"] = {
            "model_keras_sha256": sha256_file(directory / "model.keras"),
            "tflite_sha256": sha256_file(tflite_path),
            "fetch_report_sha256": sha256_file(fetch_copy) if fetch_copy.is_file() else None,
        }
        return assess_shippable(metrics, directory)
    except (OSError, TypeError, ValueError) as error:
        return False, [f"quantized ship gate could not be evaluated: {error}"]
    finally:
        shutil.rmtree(directory, ignore_errors=True)


def score_quantization(
    model,
    quantization: str,
    image_size: int,
    class_count: int,
    train_rows: list[dict],
    val_rows: list[dict],
    test_rows: list[dict],
    data_dir: Path,
    manifest: dict,
    splits: dict,
) -> dict:
    payload, interpreter = convert_and_load(model, quantization, image_size, class_count, train_rows, data_dir)
    val_pred, val_matches, val_risk_matches, val_risk = score_interpreter(
        model, interpreter, val_rows, image_size, data_dir
    )
    test_pred, test_matches, test_risk_matches, test_risk = score_interpreter(
        model, interpreter, test_rows, image_size, data_dir
    )
    total = len(val_rows) + len(test_rows)
    risk_images = val_risk + test_risk
    agreement = (val_matches + test_matches) / total
    risk_agreement = ((val_risk_matches + test_risk_matches) / risk_images) if risk_images else None
    report = assemble_report(manifest, splits, val_pred, test_pred)
    report["tflite"] = {
        "loaded": True,
        "quantization": quantization,
        "top1_agreement_with_fp32": agreement,
        "agreement_images": total,
        "agreement_source": "val_and_test_photos",
        "high_risk_top1_agreement": risk_agreement,
        "high_risk_agreement_images": risk_images,
        "errors": [],
    }
    # Same floor as TFLITE_AGREEMENT_MIN in training/ship_gates.py. Not a lower bar.
    # Install still calls assess_shippable, which repeats this check with the other gates.
    meets_agreement_floor = (
        agreement >= TFLITE_AGREEMENT_MIN
        and risk_agreement is not None
        and risk_agreement >= TFLITE_AGREEMENT_MIN
    )
    if quantization == "int8":
        id_energies = id_validation_energies(val_pred)
        threshold = choose_threshold(val_pred)
        if report["ood"]["energy_threshold"] != threshold:
            raise RuntimeError("int8 energy threshold was not taken from its own validation logits")
        report["energy_recalibration"] = {
            "quantization": "int8",
            "source": "validation_split",
            "copied_from_float": False,
            "threshold": threshold,
            "id_validation_energies": id_energies,
        }
    return {
        "ok": True,
        "quantization": quantization,
        "payload": payload,
        "report": report,
        "meets_agreement_floor": meets_agreement_floor,
        "error": None,
    }


def try_score(
    model,
    quantization: str,
    image_size: int,
    class_count: int,
    train_rows: list[dict],
    val_rows: list[dict],
    test_rows: list[dict],
    data_dir: Path,
    manifest: dict,
    splits: dict,
) -> dict:
    try:
        return score_quantization(
            model,
            quantization,
            image_size,
            class_count,
            train_rows,
            val_rows,
            test_rows,
            data_dir,
            manifest,
            splits,
        )
    except Exception as error:  # noqa: BLE001 — record the failure and leave the app unchanged
        return {
            "ok": False,
            "quantization": quantization,
            "payload": None,
            "report": None,
            "meets_agreement_floor": False,
            "error": f"{quantization} failed: {error}",
        }


def quantized_comparison(float_result: dict | None, quantized_result: dict | None, artifact_dir: Path) -> dict:
    quant_report = quantized_result.get("report") if quantized_result and quantized_result.get("ok") else None
    float_report = float_result.get("report") if float_result and float_result.get("ok") else None
    if quant_report is not None and quantized_result and quantized_result.get("payload"):
        shippable, reasons = assess_export(quant_report, quantized_result["payload"], artifact_dir)
    elif quantized_result and quantized_result.get("error"):
        shippable = False
        reasons = [str(quantized_result["error"])]
    else:
        shippable = False
        reasons = ["quantized export was not produced"]
    errors = []
    if float_result and not float_result.get("ok") and float_result.get("error"):
        errors.append(float_result["error"])
    if quantized_result and not quantized_result.get("ok") and quantized_result.get("error"):
        errors.append(quantized_result["error"])
    quantization = quantized_result.get("quantization") if quantized_result else None
    return {
        "requested": quantization,
        "quantization": quantization,
        "float_reference": FLOAT_REFERENCE,
        "shippable": shippable,
        "ship_blockers": reasons,
        "selectable_for_shipping": shippable is True,
        "delta_vs_float": metric_delta(float_report, quant_report) if float_report and quant_report else None,
        "float_metrics": summary_metrics(float_report) if float_report else None,
        "quantized_metrics": summary_metrics(quant_report) if quant_report else None,
        "errors": errors,
        "file": "mushrooms_model_quantized.tflite",
    }


def replace_file(path: Path, payload: bytes | None) -> None:
    if payload:
        path.write_bytes(payload)
    elif path.is_file():
        path.unlink()


def write_packaged_module(enabled: bool, path: Path | None = None) -> None:
    # Resolve the path at call time so tests can redirect PACKAGE_MODULE.
    if path is None:
        path = PACKAGE_MODULE
    if enabled:
        body = (
            "/**\n"
            " * Rewritten by training/export_tflite.py after ship gates passed.\n"
            " * Metro bundles the TFLite file because of this static require.\n"
            " */\n"
            "export const PACKAGED_MODEL_MODULE: number | null = "
            "require('../../assets/models/mushrooms_model.tflite');\n"
        )
    else:
        body = (
            "/**\n"
            " * No calibrated TFLite file is bundled.\n"
            " * training/export_tflite.py replaces this module only after the ship gates pass.\n"
            " * A labels file is not a model.\n"
            " */\n"
            "export const PACKAGED_MODEL_MODULE: number | null = null;\n"
        )
    path.write_text(body, encoding="utf-8")


def install_calibrated_model(payload: bytes, quantization: str, metrics: dict) -> None:
    manifest = load_manifest()
    ood = metrics["ood"]
    manifest["model_packaged"] = True
    manifest["recognition_available"] = True
    manifest["quantization"] = quantization
    manifest["model_sha256"] = hashlib.sha256(payload).hexdigest()
    # A new file invalidates every on-device delegate measurement.
    manifest["delegate_sample_sha256"] = None
    manifest["delegate_release"] = blank_delegate_release()
    manifest["ood"].update(
        {
            "calibrated": True,
            "energy_threshold": ood["energy_threshold"],
            "temperature": ood.get("temperature", 1),
            "min_softmax_for_accept": ood["min_softmax_for_accept"],
            "min_top1_softmax_for_high_confidence": ood["min_top1_softmax_for_high_confidence"],
            "min_margin": ood["min_margin"],
            "id_keep_rate_at_threshold": ood["id_keep_rate_test"],
            "id_keep_rate_val": ood.get("id_keep_rate_val"),
            "ood_reject_rate_at_threshold": ood["ood_reject_rate_test"],
            "softmax_above_0_5_still_rejected_rate": ood["softmax_above_0_5_still_rejected_rate"],
        }
    )
    manifest["note"] = (
        "Packaged by training/export_tflite.py after the ship gates passed. "
        "The scanner must still refuse an edibility verdict. "
        "unknown_mushroom is not a species and not an edibility verdict. "
        "Per-image attribution is assets/models/attributions.jsonl. "
        "Licence counts are assets/models/license_breakdown.json. "
        "Photos shown in the app stay CC0 or CC BY."
    )
    breakdown = metrics.get("license_breakdown")
    if isinstance(breakdown, dict):
        manifest["license_breakdown"] = breakdown
    MODEL_DEST.write_bytes(payload)
    # Credits stay in the jsonl asset. Do not rewrite attributionPackage.ts:
    # that module loads the jsonl and inlining the rows deletes the loader.
    shutil.copyfile(ARTIFACTS / "attributions.jsonl", ATTRIBUTION_DEST)
    breakdown_path = ARTIFACTS / "license_breakdown.json"
    if breakdown_path.is_file():
        shutil.copyfile(breakdown_path, ATTRIBUTION_DEST.with_name("license_breakdown.json"))
    LABELS_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_packaged_module(True)


def _failure_metrics(metrics_path: Path, keras_path: Path, tflite_path: Path, errors: list[str]) -> dict:
    metrics: dict = {}
    if metrics_path.is_file():
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    metrics["tflite"] = {
        "loaded": False,
        "quantization": None,
        "top1_agreement_with_fp32": None,
        "agreement_images": 0,
        "agreement_source": None,
        "high_risk_top1_agreement": None,
        "high_risk_agreement_images": 0,
        "errors": errors,
    }
    fetch_report = fetch_report_file(ARTIFACTS)
    metrics["artifacts"] = {
        "model_keras_sha256": sha256_file(keras_path),
        "tflite_sha256": sha256_file(tflite_path) if tflite_path.is_file() else None,
        "fetch_report_sha256": sha256_file(fetch_report) if fetch_report is not None else None,
    }
    return metrics


def _success_metrics(scored: dict, chosen: str, errors: list[str], keras_path: Path, tflite_path: Path) -> dict:
    metrics = scored
    tflite = dict(scored["tflite"])
    tflite["quantization"] = chosen
    tflite["errors"] = errors
    metrics["tflite"] = tflite
    fetch_report = fetch_report_file(ARTIFACTS)
    metrics["artifacts"] = {
        "model_keras_sha256": sha256_file(keras_path),
        "tflite_sha256": sha256_file(tflite_path),
        "fetch_report_sha256": sha256_file(fetch_report) if fetch_report is not None else None,
    }
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Export TFLite and optionally install it into the app")
    parser.add_argument("--install-into-app", action="store_true")
    parser.add_argument(
        "--quantization",
        choices=("fp32", "fp16", "dynamic", "int8"),
        default="fp16",
        help="Primary graph. fp16 is the default. fp32 is the unquantized float reference.",
    )
    parser.add_argument(
        "--also-export",
        choices=QUANTIZED_EXPORTS,
        default=None,
        help=(
            "Also export this quantized graph beside the primary model. "
            "int8 is full-integer ops with a train-split representative dataset. "
            "dynamic is dynamic-range. fp16 is float16 weights. "
            "Evaluated with the same ship gates. Installed only with --select-quantized."
        ),
    )
    parser.add_argument(
        "--select-quantized",
        action="store_true",
        help="Install the --also-export model. Refused unless that model passes every existing ship gate.",
    )
    args = parser.parse_args()
    if args.select_quantized and not args.also_export:
        raise SystemExit("--select-quantized requires --also-export")
    if args.also_export and args.also_export == args.quantization:
        raise SystemExit("--also-export must be a different graph from --quantization")

    import tensorflow as tf

    manifest = load_manifest()
    class_count = len(manifest["classes"])
    image_size = int(manifest["input"]["size"])
    keras_path = ARTIFACTS / "model.keras"
    model = tf.keras.models.load_model(keras_path)
    splits = json.loads((DATA_DIR / "splits.json").read_text(encoding="utf-8"))
    train_rows = calibration_rows(splits)
    val_rows = list(splits.get("val") or [])
    test_rows = list(splits.get("test") or [])
    if not train_rows or not val_rows or not test_rows:
        raise SystemExit("export needs real train, val, and test photos; refusing synthetic inputs")

    primary = try_score(
        model, args.quantization, image_size, class_count, train_rows, val_rows, test_rows, DATA_DIR, manifest, splits
    )
    float_result = None
    quantized_result = None
    if args.also_export:
        if args.quantization == FLOAT_REFERENCE:
            float_result = primary
        else:
            float_result = try_score(
                model,
                FLOAT_REFERENCE,
                image_size,
                class_count,
                train_rows,
                val_rows,
                test_rows,
                DATA_DIR,
                manifest,
                splits,
            )
        quantized_result = try_score(
            model,
            args.also_export,
            image_size,
            class_count,
            train_rows,
            val_rows,
            test_rows,
            DATA_DIR,
            manifest,
            splits,
        )

    chosen = None
    payload = None
    scored = None
    errors: list[str] = []
    if primary["ok"] and primary["meets_agreement_floor"]:
        chosen = args.quantization
        payload = primary["payload"]
        scored = primary["report"]
    elif primary["ok"]:
        agreement = primary["report"]["tflite"]["top1_agreement_with_fp32"]
        risk = primary["report"]["tflite"]["high_risk_top1_agreement"]
        errors.append(
            f"{args.quantization} loaded but agreement on val/test was {agreement:.3f} (high-risk {risk})"
        )
    elif primary.get("error"):
        errors.append(str(primary["error"]))

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    tflite_path = ARTIFACTS / "mushrooms_model.tflite"
    metrics_path = ARTIFACTS / "metrics.json"
    attribution_path = ARTIFACTS / "attributions.jsonl"
    write_attribution_file(train_rows + val_rows + test_rows, attribution_path)
    if payload is not None and chosen is not None and scored is not None:
        tflite_path.write_bytes(payload)
        metrics = _success_metrics(scored, chosen, errors, keras_path, tflite_path)
    else:
        if tflite_path.is_file():
            tflite_path.unlink()
        metrics = _failure_metrics(metrics_path, keras_path, tflite_path, errors)

    if args.also_export:
        float_payload = float_result.get("payload") if float_result and float_result.get("ok") else None
        quant_payload = quantized_result.get("payload") if quantized_result and quantized_result.get("ok") else None
        replace_file(ARTIFACTS / "mushrooms_model_float.tflite", float_payload)
        replace_file(ARTIFACTS / "mushrooms_model_quantized.tflite", quant_payload)
        comparison = quantized_comparison(float_result, quantized_result, ARTIFACTS)
    else:
        replace_file(ARTIFACTS / "mushrooms_model_float.tflite", None)
        replace_file(ARTIFACTS / "mushrooms_model_quantized.tflite", None)
        comparison = None
    metrics["quantized_export"] = comparison
    from component_share import blockers_from_manifest_file

    metrics["component_share_blockers"] = blockers_from_manifest_file(DATA_DIR / "dataset_manifest.json")
    shippable, reasons = assess_shippable(metrics)
    metrics["shippable"] = shippable
    metrics["ship_blockers"] = reasons
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (ARTIFACTS / "export_report.json").write_text(json.dumps(metrics["tflite"], indent=2), encoding="utf-8")
    quantized_shippable = bool(comparison and comparison.get("shippable"))
    print(
        json.dumps(
            {
                "shippable": shippable,
                "quantization": chosen,
                "blockers": reasons[:8],
                "quantized_export": None
                if comparison is None
                else {
                    "quantization": comparison["quantization"],
                    "shippable": comparison["shippable"],
                    "selectable_for_shipping": comparison["selectable_for_shipping"],
                    "delta_vs_float": comparison["delta_vs_float"],
                },
            },
            indent=2,
        )
    )

    if not args.install_into_app:
        print("model left in training/artifacts/. The app bundle was not changed.")
        return
    target = choose_install_target(
        select_quantized=bool(args.select_quantized),
        primary_shippable=bool(shippable and payload is not None and chosen is not None),
        quantized_shippable=quantized_shippable,
    )
    if target == "quantized" and quantized_result and quantized_result.get("payload") and comparison:
        install_calibrated_model(quantized_result["payload"], str(args.also_export), quantized_result["report"])
        print(f"installed quantized {args.also_export} at {MODEL_DEST}")
        return
    if target != "primary" or payload is None or chosen is None:
        if args.select_quantized:
            raise SystemExit(
                "refusing to install quantized model: ship gates did not pass, so the scanner stays unavailable"
            )
        raise SystemExit("refusing to install: ship gates did not pass, so the scanner stays unavailable")
    install_calibrated_model(payload, chosen, metrics)
    print(f"installed {MODEL_DEST}")


if __name__ == "__main__":
    main()
