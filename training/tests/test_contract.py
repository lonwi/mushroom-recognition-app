import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from manifest import ROOT, load_manifest
from preprocess import preprocess_rgb_uint8
from recognition_math import DANGEROUS_PAIRS, decide, energy_score, softmax
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
            if result["status"] == "candidates":
                self.assertNotIn("status", result["top3"][0])
                self.assertNotIn("edibility", result["top3"][0])

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

    def test_ship_gates_fail_closed_without_measurements(self):
        ok, reasons = assess_shippable({})
        self.assertFalse(ok)
        self.assertTrue(reasons)

    def test_ship_gates_pass_only_on_a_complete_report(self):
        manifest = load_manifest()
        per_class = {
            item["id"]: {"top1": 0.96, "top3": 0.99, "support": 24} for item in manifest["classes"]
        }
        train_images = {
            item["id"]: 160 if item["id"] == "not_a_mushroom" else 80 for item in manifest["classes"]
        }
        pair_rates = {}
        for left, right in DANGEROUS_PAIRS:
            pair_rates[f"{left}->{right}"] = 0.0
            pair_rates[f"{right}->{left}"] = 0.0
        report = {
            "per_class": per_class,
            "macro_top1": 0.91,
            "macro_top3": 0.97,
            "dangerous_pair_rates": pair_rates,
            "coverage": {"train_images": train_images},
            "ood": {
                "id_keep_rate_val": 0.95,
                "ood_reject_rate_test": 0.97,
                "ood_test_softmax_above_0_5": 40,
                "softmax_above_0_5_still_rejected_rate": 0.95,
            },
            "tflite": {"loaded": True, "top1_agreement_with_fp32": 1.0},
            "attributions_complete": True,
        }
        ok, reasons = assess_shippable(report)
        self.assertTrue(ok, reasons)
        report["ood"]["ood_test_softmax_above_0_5"] = 2
        ok, reasons = assess_shippable(report)
        self.assertFalse(ok)
        self.assertTrue(any("softmax > 0.5" in reason for reason in reasons))


if __name__ == "__main__":
    unittest.main()
