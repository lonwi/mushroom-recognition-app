import hashlib
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluate import image_counts
from export_tflite import representative_dataset
from manifest import ROOT, load_manifest
from preprocess import preprocess_rgb_uint8
from recognition_math import DANGEROUS_GENERA, DANGEROUS_PAIRS, decide, energy_score, softmax
from ship_gates import assess_shippable

FIXTURE = ROOT / "training" / "fixtures" / "decision_cases.json"
PREPROCESS_FIXTURE = ROOT / "training" / "fixtures" / "preprocess_2x2_to_4.json"


def _classes(ids, genera):
    return [
        {"id": species_id, "name": species_id, "name_latin": species_id, "genus": genus}
        for species_id, genus in zip(ids, genera)
    ]


class PreprocessTest(unittest.TestCase):
    def test_uniform_red_is_mobilenet_normalized(self):
        rgb = np.zeros((6, 5, 3), dtype=np.uint8)
        rgb[..., 0] = 255
        output = preprocess_rgb_uint8(rgb, 16)
        self.assertEqual(output.shape, (16, 16, 3))
        self.assertTrue(np.allclose(output[..., 0], 1.0))
        self.assertTrue(np.allclose(output[..., 1], -1.0))
        self.assertTrue(np.allclose(output[..., 2], -1.0))

    def test_same_size_resize_is_identity(self):
        rgb = np.array(
            [
                [[255, 0, 0], [0, 255, 0]],
                [[0, 0, 255], [128, 64, 32]],
            ],
            dtype=np.uint8,
        )
        output = preprocess_rgb_uint8(rgb, 2)
        expected = rgb.astype(np.float64) / 127.5 - 1.0
        self.assertTrue(np.allclose(output, expected, atol=1e-6))

    def test_matches_committed_bilinear_fixture(self):
        payload = json.loads(PREPROCESS_FIXTURE.read_text(encoding="utf-8"))
        rgb = np.asarray(payload["rgb"], dtype=np.uint8).reshape(payload["height"], payload["width"], 3)
        output = preprocess_rgb_uint8(rgb, payload["size"]).reshape(-1)
        self.assertTrue(np.allclose(output, np.asarray(payload["expected"], dtype=np.float32), atol=1e-5))


class DecisionTest(unittest.TestCase):
    def test_committed_cases(self):
        payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        for case in payload["cases"]:
            classes = _classes(case["class_ids"], case["genera"])
            result = decide(case["logits"], classes, case["ood"])
            self.assertEqual(result["status"], case["expect"]["status"], case["name"])
            if "reason" in case["expect"]:
                self.assertEqual(result["reason"], case["expect"]["reason"], case["name"])
            if "max_softmax" in case["expect"]:
                self.assertAlmostEqual(result["max_softmax"], case["expect"]["max_softmax"], places=5)
            if "energy" in case["expect"]:
                self.assertAlmostEqual(result["energy"], case["expect"]["energy"], places=5)
            if case["expect"].get("max_softmax_gt") is not None:
                self.assertGreater(result["max_softmax"], case["expect"]["max_softmax_gt"])
            if case["expect"].get("dangerous_genus") is not None:
                self.assertEqual(result["dangerous_genus"], case["expect"]["dangerous_genus"])
            if case["expect"].get("low_confidence") is not None:
                self.assertEqual(result["low_confidence"], case["expect"]["low_confidence"])
            if result["status"] == "rejected":
                self.assertNotIn("top3", result)
            if "top3_ids" in case["expect"]:
                self.assertEqual([item["id"] for item in result["top3"]], case["expect"]["top3_ids"], case["name"])
            if result["status"] == "candidates":
                self.assertNotIn("status", result["top3"][0])
                self.assertNotIn("edibility", result["top3"][0])
                self.assertTrue(all(item["id"] != "not_a_mushroom" for item in result["top3"]))

    def test_nonfinite_logits_are_output_mismatch(self):
        classes = _classes(["boletus_edulis", "not_a_mushroom"], ["Boletus", ""])
        ood = {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "temperature": 1,
            "energy_threshold": -4.0,
            "min_softmax_for_accept": 0.40,
        }
        for bad in (float("nan"), float("inf"), float("-inf")):
            logits = [8.0, bad]
            self.assertFalse(all(math.isfinite(value) for value in logits))
            result = decide(logits, classes, ood)
            self.assertEqual(result, {"status": "unavailable", "reason": "output_mismatch"})
            self.assertNotIn("boletus_edulis", json.dumps(result))

    def test_softmax_below_0_40_is_unclear_until_the_floor_drops(self):
        payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        case = next(item for item in payload["cases"] if item["name"] == "softmax_below_0_40_unclear")
        classes = _classes(case["class_ids"], case["genera"])
        self.assertEqual(case["ood"]["min_softmax_for_accept"], 0.40)
        result = decide(case["logits"], classes, case["ood"])
        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["reason"], "unclear")
        self.assertLess(result["max_softmax"], 0.40)
        self.assertLess(result["energy"], case["ood"]["energy_threshold"])
        self.assertNotIn("top3", result)
        lowered = dict(case["ood"])
        lowered["min_softmax_for_accept"] = 0.20
        accepted = decide(case["logits"], classes, lowered)
        self.assertEqual(accepted["status"], "candidates")
        self.assertNotIn("not_a_mushroom", [item["id"] for item in accepted["top3"]])

    def test_softmax_and_energy_are_stable(self):
        logits = [1.0, 2.0, 0.5]
        probs = softmax(logits)
        self.assertAlmostEqual(sum(probs), 1.0, places=7)
        self.assertAlmostEqual(energy_score(logits), -2.464369, places=5)


class ManifestAndShipGateTest(unittest.TestCase):
    def test_class_contract_covers_the_atlas_and_deadly_species(self):
        manifest = load_manifest()
        ids = [item["id"] for item in manifest["classes"]]
        atlas = []
        for line in (ROOT / "src/data/mushrooms.ts").read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("id: '"):
                atlas.append(line.split("'")[1])
        for species_id in atlas:
            self.assertIn(species_id, ids)
        for species_id in (
            "amanita_virosa",
            "amanita_pantherina",
            "cortinarius_orellanus",
            "cortinarius_rubellus",
            "galerina_marginata",
            "kuehneromyces_mutabilis",
            "armillaria_mellea",
            "amanita_rubescens",
            "amanita_citrina",
            "not_a_mushroom",
        ):
            self.assertIn(species_id, ids)
        self.assertFalse(manifest["model_packaged"])
        self.assertFalse(manifest["recognition_available"])
        self.assertEqual(manifest["backbone"]["pretrained_weights_license"], "Apache-2.0")
        self.assertEqual(manifest["input"]["formula"], "(pixel / 127.5) - 1")
        self.assertFalse(manifest["ood"]["calibrated"])
        self.assertIsNone(manifest["quantization"])
        self.assertFalse((ROOT / "assets" / "models" / "mushrooms_model.tflite").exists())
        self.assertEqual(set(DANGEROUS_GENERA), set(manifest["dangerous_genera"]))

    def test_ship_gates_fail_closed_without_measurements(self):
        ok, reasons = assess_shippable({})
        self.assertFalse(ok)
        self.assertTrue(reasons)

    def _passing_report(self, artifact_dir: Path) -> dict:
        manifest = load_manifest()
        keras_bytes = b"keras-checkpoint"
        tflite_bytes = b"tflite-flatbuffer"
        (artifact_dir / "model.keras").write_bytes(keras_bytes)
        (artifact_dir / "mushrooms_model.tflite").write_bytes(tflite_bytes)
        per_class = {
            item["id"]: {"top1": 0.96, "top3": 0.99, "support": 24} for item in manifest["classes"]
        }
        train_images = {
            item["id"]: 160 if item["id"] == "not_a_mushroom" else 80 for item in manifest["classes"]
        }
        test_images = {item["id"]: 24 for item in manifest["classes"]}
        pair_rates = {}
        for left, right in DANGEROUS_PAIRS:
            pair_rates[f"{left}->{right}"] = 0.0
            pair_rates[f"{right}->{left}"] = 0.0
        return {
            "per_class": per_class,
            "macro_top1": 0.91,
            "macro_top3": 0.97,
            "dangerous_pair_rates": pair_rates,
            "coverage": {"train_images": train_images, "test_images": test_images},
            "ood": {
                "id_keep_rate_val": 0.95,
                "ood_reject_rate_test": 0.97,
                "ood_test_softmax_above_0_5": 40,
                "softmax_above_0_5_still_rejected_rate": 0.95,
            },
            "tflite": {
                "loaded": True,
                "top1_agreement_with_fp32": 1.0,
                "agreement_source": "val_and_test_photos",
                "agreement_images": 48,
            },
            "artifacts": {
                "model_keras_sha256": hashlib.sha256(keras_bytes).hexdigest(),
                "tflite_sha256": hashlib.sha256(tflite_bytes).hexdigest(),
            },
            "attributions_complete": True,
        }

    def test_ship_gates_pass_only_on_a_complete_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            report["ood"]["ood_test_softmax_above_0_5"] = 2
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("softmax > 0.5" in reason for reason in reasons))

    def test_ship_gates_require_every_label_class_in_train_and_test(self):
        manifest = load_manifest()
        class_ids = [item["id"] for item in manifest["classes"]]
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            missing = self._passing_report(artifact_dir)
            dropped = class_ids[0]
            del missing["per_class"][dropped]
            del missing["coverage"]["train_images"][dropped]
            del missing["coverage"]["test_images"][dropped]
            ok, reasons = assess_shippable(missing, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any(dropped in reason and "missing" in reason for reason in reasons))

            zeros = self._passing_report(artifact_dir)
            zeros["coverage"]["train_images"]["boletus_edulis"] = 0
            ok, reasons = assess_shippable(zeros, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("boletus_edulis" in reason and "support 0" in reason for reason in reasons))

            test_zero = self._passing_report(artifact_dir)
            test_zero["coverage"]["test_images"]["amanita_phalloides"] = 0
            test_zero["per_class"]["amanita_phalloides"]["support"] = 0
            ok, reasons = assess_shippable(test_zero, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("amanita_phalloides" in reason and "support 0" in reason for reason in reasons))

            high_stakes_only = {
                species_id: {"top1": 0.96, "top3": 0.99, "support": 24}
                for species_id in (
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
            }
            subset = self._passing_report(artifact_dir)
            subset["per_class"] = high_stakes_only
            subset["coverage"] = {
                "train_images": {species_id: 80 for species_id in high_stakes_only},
                "test_images": {species_id: 24 for species_id in high_stakes_only},
            }
            ok, reasons = assess_shippable(subset, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("boletus_edulis" in reason for reason in reasons))

    def test_ship_gates_verify_model_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            (artifact_dir / "mushrooms_model.tflite").write_bytes(b"replaced-weights")
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("tflite sha256" in reason for reason in reasons))
            report["tflite"]["agreement_source"] = "random_noise"
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("val and test" in reason for reason in reasons))

    def test_image_counts_keep_every_class_including_zeros(self):
        counts = image_counts([{"class_id": "boletus_edulis"}, {"class_id": "boletus_edulis"}], ["boletus_edulis", "amanita_phalloides"])
        self.assertEqual(counts, {"boletus_edulis": 2, "amanita_phalloides": 0})

    def test_int8_representative_dataset_uses_training_photos(self):
        from PIL import Image

        source = (ROOT / "training" / "export_tflite.py").read_text(encoding="utf-8")
        self.assertNotIn("np.random", source)
        self.assertNotIn("default_rng", source)
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp)
            Image.new("RGB", (4, 3), (10, 20, 30)).save(data_dir / "train.png")
            rows = [{"file": "train.png", "class_id": "boletus_edulis"}]
            samples = list(representative_dataset(rows, 8, data_dir)())
            self.assertEqual(len(samples), 1)
            self.assertEqual(samples[0][0].shape, (1, 8, 8, 3))
            expected = preprocess_rgb_uint8(np.asarray(Image.open(data_dir / "train.png").convert("RGB")), 8)
            self.assertTrue(np.allclose(samples[0][0][0], expected))
        with self.assertRaises(RuntimeError):
            representative_dataset([], 8, Path("."))


if __name__ == "__main__":
    unittest.main()
