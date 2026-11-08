"""Delegate release gate. No packaged model is required."""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from delegate_sample import calibration_sample, sample_sha256
from score_delegate_dump import apply_delegate_release, main, score_device_dump
from ship_gates import TFLITE_AGREEMENT_MIN, assess_delegate_release


def _classes() -> list[dict]:
    return [
        {"id": "boletus_edulis", "name": "Boletus", "name_latin": "Boletus edulis", "genus": "Boletus"},
        {"id": "amanita_phalloides", "name": "Death cap", "name_latin": "Amanita phalloides", "genus": "Amanita"},
        {"id": "not_a_mushroom", "name": "Not a mushroom", "name_latin": "", "genus": ""},
    ]


def _manifest(model_hash: str) -> dict:
    return {
        "model_sha256": model_hash,
        "classes": _classes(),
        "ood": {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "unknown_class_id": "unknown_mushroom",
            "temperature": 1,
            "energy_threshold": -1.0,
            "min_softmax_for_accept": 0.4,
            "min_top1_softmax_for_high_confidence": 0.7,
            "min_margin": 0.15,
        },
        "dangerous_genera": ["Amanita", "Cortinarius", "Galerina", "Gyromitra"],
    }


def _sample() -> list[dict]:
    return calibration_sample(
        {
            "val": [
                {"file": "val/bolete.png", "class_id": "boletus_edulis", "split": "val"},
                {"file": "val/cap.png", "class_id": "amanita_phalloides", "split": "val"},
            ],
            "test": [
                {"file": "test/bolete.png", "class_id": "boletus_edulis", "split": "test"},
                {"file": "test/cap.png", "class_id": "amanita_phalloides", "split": "test"},
            ],
        }
    )


def _dump(sample: list[dict], model_hash: str, delegate_logits=None) -> dict:
    logits = [8.0, 1.0, -2.0]
    images = []
    for row in sample:
        images.append(
            {
                "file": row["file"],
                "split": row["split"],
                "class_id": row["class_id"],
                "cpu_logits": logits,
                "delegate_logits": delegate_logits or logits,
            }
        )
    return {
        "measured_on": "device",
        "platform": "android-gpu",
        "model_sha256": model_hash,
        "images": images,
    }


class DelegateAgreementTest(unittest.TestCase):
    def test_missing_report_fails_closed(self):
        ok, reasons = assess_delegate_release({})
        self.assertFalse(ok)
        self.assertIn("delegate agreement report is missing", reasons)
        self.assertEqual(TFLITE_AGREEMENT_MIN, 0.99)

    def test_train_rows_are_not_part_of_the_calibration_sample(self):
        with self.assertRaises(RuntimeError):
            calibration_sample(
                {
                    "val": [{"file": "v.png", "class_id": "boletus_edulis", "split": "train"}],
                    "test": [{"file": "e.png", "class_id": "boletus_edulis"}],
                }
            )
        with self.assertRaises(RuntimeError):
            calibration_sample({"val": [], "test": [{"file": "e.png", "class_id": "boletus_edulis"}]})
        sample = calibration_sample(
            {
                "train": [{"file": "secret.png", "class_id": "boletus_edulis", "split": "train"}],
                "val": [{"file": "v.png", "class_id": "boletus_edulis"}],
                "test": [{"file": "e.png", "class_id": "boletus_edulis"}],
            }
        )
        self.assertEqual([row["file"] for row in sample], ["v.png", "e.png"])

    def test_matching_device_dump_passes_and_a_short_dump_is_stale(self):
        sample = _sample()
        model_hash = "ab" * 32
        manifest = _manifest(model_hash)
        measured = score_device_dump(_dump(sample, model_hash), manifest, sample)
        self.assertTrue(measured["passed"], measured["reasons"])
        self.assertGreaterEqual(measured["top1_agreement"], 0.99)
        self.assertGreaterEqual(measured["high_risk_top1_agreement"], 0.99)
        self.assertGreaterEqual(measured["decision_agreement"], 0.99)
        self.assertEqual(measured["decision_fields"], ["status", "top1", "expertVerificationRequired"])
        self.assertGreaterEqual(measured["max_energy_difference"], 0)
        self.assertEqual(measured["images"], 4)
        self.assertEqual(measured["high_risk_images"], 2)

        short = _dump(sample[:1], model_hash)
        refused = score_device_dump(short, manifest, sample)
        self.assertFalse(refused["passed"])
        self.assertTrue(any("stale" in reason or "covered" in reason for reason in refused["reasons"]))

    def test_a_different_top1_or_model_hash_does_not_pass(self):
        sample = _sample()
        model_hash = "cd" * 32
        manifest = _manifest(model_hash)
        flipped = score_device_dump(_dump(sample, model_hash, [1.0, 8.0, -2.0]), manifest, sample)
        self.assertFalse(flipped["passed"])
        self.assertLess(flipped["top1_agreement"], 0.99)
        stale_model = score_device_dump(_dump(sample, "ef" * 32), manifest, sample)
        self.assertFalse(stale_model["passed"])
        self.assertTrue(any("model hash" in reason for reason in stale_model["reasons"]))

    def test_release_entry_is_written_per_platform_without_passing_a_failure(self):
        sample = _sample()
        model_hash = "12" * 32
        manifest = _manifest(model_hash)
        measured = score_device_dump(_dump(sample, model_hash), manifest, sample)
        updated = apply_delegate_release({"delegate_release": {}}, measured, sample_sha256(sample))
        self.assertTrue(updated["delegate_release"]["android-gpu"]["passed"])
        self.assertEqual(updated["delegate_sample_sha256"], sample_sha256(sample))
        failed = dict(measured)
        failed["passed"] = False
        failed["platform"] = "core-ml"
        updated = apply_delegate_release(updated, failed, sample_sha256(sample))
        self.assertFalse(updated["delegate_release"]["core-ml"]["passed"])
        self.assertTrue(updated["delegate_release"]["android-gpu"]["passed"])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "labels.json"
            path.write_text(json.dumps(updated), encoding="utf-8")
            self.assertIn("android-gpu", path.read_text(encoding="utf-8"))

    def test_packaged_file_hash_is_not_the_manifest_copy(self):
        sample = _sample()
        manifest_hash = "bb" * 32
        with tempfile.TemporaryDirectory() as tmp:
            model = Path(tmp) / "mushrooms_model.tflite"
            payload = b"packaged-weights"
            model.write_bytes(payload)
            file_hash = hashlib.sha256(payload).hexdigest()
            self.assertNotEqual(file_hash, manifest_hash)

            copied = score_device_dump(
                _dump(sample, manifest_hash),
                _manifest(manifest_hash),
                sample,
                model_path=model,
            )
            self.assertFalse(copied["passed"])
            self.assertTrue(any("model" in reason and "hash" in reason for reason in copied["reasons"]))

            dump_matches_file = score_device_dump(
                _dump(sample, file_hash),
                _manifest(manifest_hash),
                sample,
                model_path=model,
            )
            self.assertFalse(dump_matches_file["passed"])
            self.assertTrue(any("labels.json" in reason for reason in dump_matches_file["reasons"]))

            agreed = score_device_dump(
                _dump(sample, file_hash),
                _manifest(file_hash),
                sample,
                model_path=model,
            )
            self.assertTrue(agreed["passed"], agreed["reasons"])

            missing = Path(tmp) / "missing.tflite"
            without_file = score_device_dump(
                _dump(sample, manifest_hash),
                _manifest(manifest_hash),
                sample,
                model_path=missing,
            )
            self.assertTrue(without_file["passed"], without_file["reasons"])

    def test_write_refuses_a_missing_model_file(self):
        """--write must not record a gate from the hash copied into labels.json."""
        model_hash = "ab" * 32
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest_path = root / "labels.json"
            manifest_path.write_text('{"model_sha256": "%s"}\n' % model_hash, encoding="utf-8")
            missing = root / "mushrooms_model.tflite"
            before = manifest_path.read_text(encoding="utf-8")
            with self.assertRaises(SystemExit) as raised:
                main(
                    [
                        "--dump",
                        str(root / "delegate-calibration.json"),
                        "--splits",
                        str(root / "splits.json"),
                        "--manifest",
                        str(manifest_path),
                        "--model",
                        str(missing),
                        "--write",
                    ]
                )
            self.assertIn("not on disk", str(raised.exception))
            self.assertIn("labels.json", str(raised.exception))
            self.assertEqual(manifest_path.read_text(encoding="utf-8"), before)
            self.assertFalse(missing.is_file())
