"""Export a float-input TFLite model and refuse to install it unless ship gates pass.

Internal weights may be int8 or fp16. The interpreter is actually loaded here.
Input and output stay float32: pixels are already MobileNetV3-normalized, and
the output is logits.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from manifest import LABELS_PATH, ROOT, load_manifest
from ship_gates import assess_shippable

ARTIFACTS = ROOT / "training" / "artifacts"
MODEL_DEST = ROOT / "assets" / "models" / "mushrooms_model.tflite"
PACKAGE_MODULE = ROOT / "src" / "services" / "modelPackage.ts"


def representative_dataset(image_size: int, class_count: int):
    import numpy as np

    def samples():
        rng = np.random.default_rng(42)
        for _ in range(32):
            yield [rng.uniform(-1.0, 1.0, size=(1, image_size, image_size, 3)).astype(np.float32)]

    return samples


def convert_and_load(model, quantization: str, image_size: int, class_count: int):
    import numpy as np
    import tensorflow as tf

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    if quantization == "int8":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.representative_dataset = representative_dataset(image_size, class_count)
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
    sample = np.zeros((1, image_size, image_size, 3), dtype=np.float32)
    interpreter.set_tensor(input_details[0]["index"], sample)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"])
    if tuple(output.shape) != (1, class_count):
        raise RuntimeError(f"unexpected TFLite output shape {output.shape}")
    if not np.isfinite(output).all():
        raise RuntimeError("TFLite output is not finite")
    return payload, interpreter


def agreement(model, interpreter, image_size: int, samples: int = 16) -> float:
    import numpy as np
    import tensorflow as tf

    rng = np.random.default_rng(0)
    input_index = interpreter.get_input_details()[0]["index"]
    output_index = interpreter.get_output_details()[0]["index"]
    matches = 0
    for _ in range(samples):
        batch = rng.uniform(-1.0, 1.0, size=(1, image_size, image_size, 3)).astype(np.float32)
        keras_top = int(np.argmax(model.predict(batch, verbose=0)[0]))
        interpreter.set_tensor(input_index, batch)
        interpreter.invoke()
        lite_top = int(np.argmax(interpreter.get_tensor(output_index)[0]))
        matches += int(keras_top == lite_top)
    return matches / samples


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
            "id_keep_rate_at_threshold": ood["id_keep_rate_val"],
            "ood_reject_rate_at_threshold": ood["ood_reject_rate_test"],
            "softmax_above_0_5_still_rejected_rate": ood["softmax_above_0_5_still_rejected_rate"],
        }
    )
    manifest["note"] = (
        "Packaged by training/export_tflite.py after the ship gates passed. "
        "The scanner must still refuse an edibility verdict. "
        "Per-image CC0/CC-BY attribution is training/data/attributions.jsonl."
    )
    MODEL_DEST.write_bytes(payload)
    LABELS_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_packaged_module(True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export TFLite and optionally install it into the app")
    parser.add_argument("--install-into-app", action="store_true")
    args = parser.parse_args()

    import tensorflow as tf

    manifest = load_manifest()
    class_count = len(manifest["classes"])
    image_size = int(manifest["input"]["size"])
    model = tf.keras.models.load_model(ARTIFACTS / "model.keras")
    metrics = json.loads((ARTIFACTS / "metrics.json").read_text(encoding="utf-8"))

    chosen = None
    payload = None
    score = None
    errors = []
    for quantization in ("int8", "fp16"):
        try:
            candidate, interpreter = convert_and_load(model, quantization, image_size, class_count)
            score = agreement(model, interpreter, image_size)
            if score >= 0.99:
                chosen = quantization
                payload = candidate
                break
            errors.append(f"{quantization} loaded but top-1 agreement was {score:.3f}")
        except Exception as error:  # noqa: BLE001 — try the next quantization
            errors.append(f"{quantization} failed: {error}")

    report = {
        "loaded": payload is not None,
        "quantization": chosen,
        "top1_agreement_with_fp32": score if payload is not None else None,
        "errors": errors,
    }
    if payload is not None and chosen is not None:
        (ARTIFACTS / "mushrooms_model.tflite").write_bytes(payload)
    metrics["tflite"] = report
    shippable, reasons = assess_shippable(metrics)
    metrics["shippable"] = shippable
    metrics["ship_blockers"] = reasons
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (ARTIFACTS / "export_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
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
