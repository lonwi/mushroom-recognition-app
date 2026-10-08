"""Export a float-input TFLite model and refuse to install it unless ship gates pass.

The default is fp16 weights with float32 input and output. react-native-fast-tflite
runs the XNNPACK delegate, which executes that graph. A fully integer int8 graph
(`TFLITE_BUILTINS_INT8`) is about the same accuracy after calibration but XNNPACK
rejects MobileNetV3 ops in that graph on device, so int8 is not the default.
Pass `--quantization int8` only to experiment. Input and output stay float32:
pixels are already MobileNetV3-normalized, and the output is logits.

Agreement, per-class metrics, and the energy threshold are computed from the
interpreter's logits on every val and test photo, including the high-risk classes.
The export also writes attributions.jsonl beside the model.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from evaluate import DATA_DIR, assemble_report, preprocessed_batch, prediction_from_logits
from manifest import LABELS_PATH, ROOT, load_manifest
from recognition_math import HIGH_STAKES_IDS
from ship_gates import assess_shippable, sha256_file

ARTIFACTS = ROOT / "training" / "artifacts"
MODEL_DEST = ROOT / "assets" / "models" / "mushrooms_model.tflite"
ATTRIBUTION_DEST = ROOT / "assets" / "models" / "attributions.jsonl"
PACKAGE_MODULE = ROOT / "src" / "services" / "modelPackage.ts"
ATTRIBUTION_MODULE = ROOT / "src" / "services" / "attributionPackage.ts"
# fp16 is the phone path. int8 stays available as an explicit experiment.
DEFAULT_QUANTIZATIONS = ("fp16",)


def attribution_row(row: dict) -> dict:
    source = row.get("source_url") or row.get("gbif_occurrence") or ""
    return {
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


def write_attribution_file(rows: list[dict], path: Path) -> None:
    """One JSON line per image: author, license, and source URL."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(attribution_row(row), ensure_ascii=False) + "\n")


def representative_dataset(rows: list[dict], image_size: int, data_dir: Path):
    """int8 calibration photos. Empty input is an error; noise is not a substitute."""
    if not rows:
        raise RuntimeError("int8 representative dataset requires real training images, not noise")

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
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.representative_dataset = representative_dataset(train_rows, image_size, data_dir)
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.float32
        converter.inference_output_type = tf.float32
    elif quantization == "fp16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
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


def attribution_module_source(rows: list[dict] | None) -> str:
    """TypeScript the app bundles. Null until a model install copies real credits."""
    header = (
        "/**\n"
        " * Training-photo credits bundled with a shipped model.\n"
        " * training/export_tflite.py rewrites this file from attributions.jsonl on install.\n"
        " * Null means no model is installed, so there is nothing to credit.\n"
        " */\n"
        "export interface PhotoCredit {\n"
        "  creator: string;\n"
        "  license: string;\n"
        "  licenseNormalized: string;\n"
        "  imageUrl: string;\n"
        "  sourceUrl: string;\n"
        "  classId: string;\n"
        "  taxonName: string;\n"
        "}\n\n"
    )
    if not rows:
        return header + "export const PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = null;\n"
    credits = []
    for row in rows:
        slim = attribution_row(row)
        credits.append(
            {
                "creator": slim["creator"],
                "license": slim["license"],
                "licenseNormalized": slim["license_normalized"],
                "imageUrl": slim["image_url"],
                "sourceUrl": slim["source_url"],
                "classId": slim["class_id"],
                "taxonName": slim["taxon_name"],
            }
        )
    body = json.dumps(credits, ensure_ascii=False, indent=2)
    return header + f"export const PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = {body};\n"


def write_attribution_module(rows: list[dict] | None, path: Path = ATTRIBUTION_MODULE) -> None:
    path.write_text(attribution_module_source(rows), encoding="utf-8")


def write_packaged_module(enabled: bool, path: Path = PACKAGE_MODULE) -> None:
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
        "Per-image CC0/CC-BY attribution is assets/models/attributions.jsonl."
    )
    MODEL_DEST.write_bytes(payload)
    shutil.copyfile(ARTIFACTS / "attributions.jsonl", ATTRIBUTION_DEST)
    credit_rows = [
        json.loads(line)
        for line in (ARTIFACTS / "attributions.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    write_attribution_module(credit_rows)
    LABELS_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_packaged_module(True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export TFLite and optionally install it into the app")
    parser.add_argument("--install-into-app", action="store_true")
    parser.add_argument(
        "--quantization",
        choices=("fp16", "int8"),
        default="fp16",
        help="fp16 is the default because the on-device XNNPACK delegate runs it. int8 is an experiment.",
    )
    args = parser.parse_args()

    import tensorflow as tf

    manifest = load_manifest()
    class_count = len(manifest["classes"])
    image_size = int(manifest["input"]["size"])
    keras_path = ARTIFACTS / "model.keras"
    model = tf.keras.models.load_model(keras_path)
    splits = json.loads((DATA_DIR / "splits.json").read_text(encoding="utf-8"))
    train_rows = list(splits.get("train") or [])
    val_rows = list(splits.get("val") or [])
    test_rows = list(splits.get("test") or [])
    if not train_rows or not val_rows or not test_rows:
        raise SystemExit("export needs real train, val, and test photos; refusing synthetic inputs")

    chosen = None
    payload = None
    score = None
    risk_score = None
    risk_images = 0
    scored: dict | None = None
    errors = []
    for quantization in (args.quantization,):
        try:
            candidate, interpreter = convert_and_load(
                model, quantization, image_size, class_count, train_rows, DATA_DIR
            )
            val_pred, val_matches, val_risk_matches, val_risk = score_interpreter(
                model, interpreter, val_rows, image_size, DATA_DIR
            )
            test_pred, test_matches, test_risk_matches, test_risk = score_interpreter(
                model, interpreter, test_rows, image_size, DATA_DIR
            )
            total = len(val_rows) + len(test_rows)
            risk_images = val_risk + test_risk
            candidate_score = (val_matches + test_matches) / total
            candidate_risk = ((val_risk_matches + test_risk_matches) / risk_images) if risk_images else None
            if candidate_score >= 0.99 and candidate_risk is not None and candidate_risk >= 0.99:
                chosen = quantization
                payload = candidate
                score = candidate_score
                risk_score = candidate_risk
                scored = assemble_report(manifest, splits, val_pred, test_pred)
                break
            errors.append(
                f"{quantization} loaded but agreement on val/test was {candidate_score:.3f} "
                f"(high-risk {candidate_risk})"
            )
        except Exception as error:  # noqa: BLE001 — record the failure and leave the app unchanged
            errors.append(f"{quantization} failed: {error}")

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    tflite_path = ARTIFACTS / "mushrooms_model.tflite"
    metrics_path = ARTIFACTS / "metrics.json"
    attribution_path = ARTIFACTS / "attributions.jsonl"
    write_attribution_file(train_rows + val_rows + test_rows, attribution_path)
    if payload is not None and chosen is not None and scored is not None:
        tflite_path.write_bytes(payload)
        metrics = scored
        metrics["tflite"] = {
            "loaded": True,
            "quantization": chosen,
            "top1_agreement_with_fp32": score,
            "agreement_images": len(val_rows) + len(test_rows),
            "agreement_source": "val_and_test_photos",
            "high_risk_top1_agreement": risk_score,
            "high_risk_agreement_images": risk_images,
            "errors": errors,
        }
        metrics["artifacts"] = {
            "model_keras_sha256": sha256_file(keras_path),
            "tflite_sha256": sha256_file(tflite_path),
        }
    else:
        if tflite_path.is_file():
            tflite_path.unlink()
        metrics = {}
        if metrics_path.is_file():
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        metrics["tflite"] = {
            "loaded": False,
            "quantization": None,
            "top1_agreement_with_fp32": score,
            "agreement_images": 0,
            "agreement_source": None,
            "high_risk_top1_agreement": risk_score,
            "high_risk_agreement_images": risk_images,
            "errors": errors,
        }
        metrics["artifacts"] = {
            "model_keras_sha256": sha256_file(keras_path),
            "tflite_sha256": sha256_file(tflite_path) if tflite_path.is_file() else None,
        }
    shippable, reasons = assess_shippable(metrics)
    metrics["shippable"] = shippable
    metrics["ship_blockers"] = reasons
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (ARTIFACTS / "export_report.json").write_text(
        json.dumps(metrics["tflite"], indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"shippable": shippable, "quantization": chosen, "blockers": reasons[:8]}, indent=2))

    if not args.install_into_app:
        print("model left in training/artifacts/. The app bundle was not changed.")
        return
    if not shippable or payload is None or chosen is None:
        raise SystemExit("refusing to install: ship gates did not pass, so the scanner stays unavailable")
    install_calibrated_model(payload, chosen, metrics)
    print(f"installed {MODEL_DEST}")


if __name__ == "__main__":
    main()
