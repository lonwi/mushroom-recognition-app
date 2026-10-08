import hashlib
import json
import math
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluate import (
    choose_threshold,
    confident_toxic_as_edible,
    deadly_probe_taxa,
    image_counts,
    open_set_metrics,
    outcome_is_confident_edible,
    outcome_is_strict_top1_edible,
    poisonous_sample_reasons,
)
from export_tflite import DEFAULT_QUANTIZATIONS, representative_dataset
from manifest import ROOT, load_manifest, poisonous_heldout_taxa
from preprocess import ImageReadError, load_oriented_rgb, model_rgb_uint8, preprocess_rgb_uint8, resize_to_width
from recognition_math import (
    DANGEROUS_GENERA,
    DANGEROUS_GENUS_MIN_PROBABILITY,
    DANGEROUS_PAIRS,
    EDIBLE_LOOKALIKE_IDS,
    HIGH_STAKES_IDS,
    decide,
    energy_score,
    softmax,
)
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

    def test_preview_width_keeps_aspect_ratio(self):
        portrait = np.zeros((24, 16, 3), dtype=np.uint8)
        portrait[:, :8] = 255
        preview = resize_to_width(portrait, 8)
        self.assertEqual(preview.shape, (12, 8, 3))
        self.assertGreater(preview.shape[0], preview.shape[1])

    def test_half_pixel_rounds_like_javascript(self):
        """10.5 and 2.5 must become 11 and 3. numpy.rint would emit 10 and 2."""
        half = np.array(
            [
                [[10, 10, 10], [11, 11, 11]],
                [[10, 10, 10], [11, 11, 11]],
            ],
            dtype=np.uint8,
        )
        self.assertEqual(int(np.rint(10.5)), 10)
        self.assertEqual(model_rgb_uint8(half, 1).reshape(-1).tolist(), [11, 11, 11])
        two_and_half = np.array(
            [
                [[2, 2, 2], [3, 3, 3]],
                [[2, 2, 2], [3, 3, 3]],
            ],
            dtype=np.uint8,
        )
        self.assertEqual(int(np.rint(2.5)), 2)
        self.assertEqual(model_rgb_uint8(two_and_half, 1).reshape(-1).tolist(), [3, 3, 3])
        payload = {
            "width": 2,
            "height": 2,
            "size": 1,
            "rgb": half.reshape(-1).tolist(),
            "expected_uint8": [11, 11, 11],
        }
        fixture = ROOT / "training" / "fixtures" / "round_half_up_2x2_to_1.json"
        self.assertEqual(json.loads(fixture.read_text(encoding="utf-8")), payload)

    def test_matches_committed_bilinear_fixture(self):
        payload = json.loads(PREPROCESS_FIXTURE.read_text(encoding="utf-8"))
        rgb = np.asarray(payload["rgb"], dtype=np.uint8).reshape(payload["height"], payload["width"], 3)
        output = preprocess_rgb_uint8(rgb, payload["size"]).reshape(-1)
        self.assertTrue(np.allclose(output, np.asarray(payload["expected"], dtype=np.float32), atol=1e-5))

    def test_downsample_is_antialiased_and_exif_is_applied(self):
        from PIL import Image

        checker = np.zeros((8, 8, 3), dtype=np.uint8)
        checker[::2, ::2] = 255
        checker[1::2, 1::2] = 255
        area = model_rgb_uint8(checker, 2)
        self.assertEqual(area.shape, (2, 2, 3))
        self.assertTrue(np.all(np.abs(area.astype(np.int16) - 128) <= 1))
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            turned = Image.new("RGB", (4, 2), (0, 0, 0))
            turned.putpixel((0, 0), (255, 0, 0))
            exif = Image.Exif()
            exif[274] = 6
            path = directory / "turned.jpg"
            turned.save(path, exif=exif)
            oriented = load_oriented_rgb(path)
            self.assertEqual(oriented.shape[0], 4)
            self.assertEqual(oriented.shape[1], 2)
            broken = directory / "broken.jpg"
            broken.write_bytes(b"this is not a jpeg")
            with self.assertRaises(ImageReadError):
                load_oriented_rgb(broken)


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
                self.assertTrue(all(item["id"] not in ("not_a_mushroom", "unknown_mushroom") for item in result["top3"]))

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
        # Closed list. A new atlas card with no model class fails until it is
        # added here with a reason. labels.json is not the place to hide the gap.
        cards_without_model_class = {
            "hydnum_repandum": "Unfinished hedgehog card. The class contract does not include it.",
            "inocybe_erubescens": "Deadly fibrecap is an atlas look-alike card, not a model class.",
        }
        unexpected = [
            species_id
            for species_id in atlas
            if species_id not in ids and species_id not in cards_without_model_class
        ]
        self.assertEqual(unexpected, [])
        for species_id, reason in cards_without_model_class.items():
            self.assertTrue(reason.strip())
            self.assertIn(species_id, atlas)
            self.assertNotIn(species_id, ids)
        for species_id in atlas:
            if species_id in cards_without_model_class:
                continue
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
            "unknown_mushroom",
            "not_a_mushroom",
        ):
            self.assertIn(species_id, ids)
        self.assertEqual(ids[-2], "unknown_mushroom")
        self.assertEqual(ids[-1], "not_a_mushroom")
        self.assertEqual(manifest["ood"]["unknown_class_id"], "unknown_mushroom")
        unknown = manifest["classes"][-2]
        self.assertGreaterEqual(len(unknown["sampling"]["held_out_gbif_names"]), 8)
        self.assertNotIn("edibility", unknown)
        self.assertNotIn("status", unknown)
        self.assertFalse(manifest["model_packaged"])
        self.assertFalse(manifest["recognition_available"])
        self.assertEqual(manifest["backbone"]["pretrained_weights_license"], "see training/README.md")
        self.assertEqual(manifest["input"]["formula"], "(pixel / 127.5) - 1")
        self.assertFalse(manifest["ood"]["calibrated"])
        self.assertIsNone(manifest["quantization"])
        self.assertFalse((ROOT / "assets" / "models" / "mushrooms_model.tflite").exists())
        self.assertEqual(set(DANGEROUS_GENERA), set(manifest["dangerous_genera"]))
        self.assertEqual(manifest["dangerous_genus_min_probability"], DANGEROUS_GENUS_MIN_PROBABILITY)
        probes = manifest["toxic_probes"]
        self.assertEqual(probes["per_taxon_cap"], 80)
        self.assertEqual(probes["minimum_poisonous_held_out_images"], 300)
        self.assertNotIn("Galerina sulcipes", poisonous_heldout_taxa(manifest))
        self.assertNotIn("Galerina sulciceps", poisonous_heldout_taxa(manifest))
        self.assertIn("Conocybe rugosa", poisonous_heldout_taxa(manifest))
        self.assertIn("Lepiota castanea", poisonous_heldout_taxa(manifest))
        self.assertIn("Inosperma erubescens", poisonous_heldout_taxa(manifest))
        promoted = {
            "Hypholoma fasciculare",
            "Tricholoma equestre",
            "Agaricus xanthodermus",
            "Neoboletus luridiformis",
            "Neoboletus erythropus",
            "Xerocomellus chrysenteron",
            "Leccinum aurantiacum",
            "Leccinum versipelle",
            "Lactarius deterrimus",
            "Armillaria ostoyae",
            "Armillaria gallica",
            "Boletus reticulatus",
            "Boletus pinophilus",
            "Xerocomus subtomentosus",
            "Suillus grevillei",
            "Suillus bovinus",
            "Suillus variegatus",
            "Suillus granulatus",
        }
        self.assertTrue(promoted.isdisjoint(unknown["gbif_names"]))
        self.assertTrue(promoted.isdisjoint(unknown["sampling"]["held_out_gbif_names"]))
        scarletina = next(item for item in manifest["classes"] if item["id"] == "neoboletus_luridiformis")
        self.assertEqual(
            scarletina["gbif_names"],
            ["Neoboletus luridiformis", "Neoboletus erythropus"],
        )
        self.assertEqual(scarletina["gbif_keys"], [8208185, 9723190])
        self.assertEqual(scarletina["safety_tag"], "edible")
        held = {taxon["name"]: taxon for taxon in unknown["sampling"]["taxa"]}
        self.assertTrue(held["Agaricus moelleri"]["held_out"])
        self.assertTrue(held["Agaricus moelleri"]["toxic"])
        self.assertEqual(held["Agaricus moelleri"]["gbif_key"], 5243496)
        self.assertEqual(held["Agaricus moelleri"]["relation"], "unknown_species_of_known_genus")
        for name in ("Hypholoma capnoides", "Pholiota squarrosa", "Amanita regalis", "Amanita gemmata"):
            self.assertIn(name, unknown["gbif_names"])
            self.assertFalse(held[name]["held_out"])
        self.assertTrue(held["Amanita regalis"]["toxic"])
        self.assertTrue(held["Amanita gemmata"]["toxic"])
        self.assertFalse(held["Hypholoma capnoides"]["toxic"])
        self.assertEqual(held["Tricholoma portentosum"]["relation"], "unknown_species_of_known_genus")
        probe_names = [taxon["name"] for taxon in probes["taxa"]]
        self.assertNotIn("Tricholoma equestre", probe_names)
        self.assertIn("Tricholoma pardinum", probe_names)
        self.assertIn("Rubroboletus satanas", probe_names)
        self.assertEqual(
            [group["id"] for group in probes["visual_groups"]],
            ["lepiota_lookalikes", "conocybe_pholiotina", "omphalotus", "inocybe_muscarine"],
        )
        for group in probes["visual_groups"]:
            if group["id"] in ("lepiota_lookalikes", "conocybe_pholiotina"):
                self.assertIs(group["strict_top1_edible"], True)
        inocybe = next(group for group in probes["visual_groups"] if group["id"] == "inocybe_muscarine")
        self.assertEqual(inocybe["minimum_images"], 80)
        self.assertEqual(inocybe["taxa"], ["Inosperma erubescens", "Inocybe geophylla"])
        self.assertIn("tricholoma_equestre", probes["known_class_not_probed"])
        self.assertIn("tricholoma_equestre", HIGH_STAKES_IDS)
        self.assertNotIn(("galerina_marginata", "hypholoma_fasciculare"), DANGEROUS_PAIRS)
        self.assertIn(("agaricus_xanthodermus", "agaricus_campestris"), DANGEROUS_PAIRS)
        self.assertIn(("lactarius_torminosus", "lactarius_deliciosus"), DANGEROUS_PAIRS)
        self.assertIn(("hypholoma_fasciculare", "kuehneromyces_mutabilis"), DANGEROUS_PAIRS)
        self.assertIn(("hypholoma_fasciculare", "armillaria_mellea"), DANGEROUS_PAIRS)
        self.assertIn(("cortinarius_orellanus", "cantharellus_cibarius"), DANGEROUS_PAIRS)
        self.assertIn(("cortinarius_rubellus", "cantharellus_cibarius"), DANGEROUS_PAIRS)
        exceptions = {item["taxon"]: item for item in probes["rare_taxon_exceptions"]}
        self.assertEqual(list(exceptions), ["Lepiota brunneoincarnata", "Inosperma erubescens"])
        self.assertNotIn("Conocybe filaris", exceptions)
        self.assertEqual(exceptions["Lepiota brunneoincarnata"]["gbif_licensed_count"], 16)
        self.assertEqual(exceptions["Lepiota brunneoincarnata"]["date_checked"], "2026-10-08")
        self.assertEqual(exceptions["Lepiota brunneoincarnata"]["group_id"], "lepiota_lookalikes")
        filaris = next(item for item in probes["taxa"] if item["name"] == "Conocybe filaris")
        self.assertIn("78", filaris["note"])
        self.assertEqual(exceptions["Inosperma erubescens"]["gbif_licensed_count"], 44)
        self.assertEqual(exceptions["Inosperma erubescens"]["group_id"], "inocybe_muscarine")
        names = {item["id"]: item["name"] for item in manifest["classes"]}
        self.assertEqual(names["cortinarius_orellanus"], "Zasłonak rudy")
        self.assertEqual(names["cortinarius_rubellus"], "Zasłonak rudawy")
        deadly = deadly_probe_taxa(manifest)
        self.assertIn("Amanita verna", deadly)
        self.assertIn("Lepiota brunneoincarnata", deadly)
        # Cristata has no amatoxin flag. It stays in the strict set because the
        # Lepiota look-alike group requires strict_top1_edible.
        self.assertIn("Lepiota cristata", deadly)
        cristata = next(item for item in probes["taxa"] if item["name"] == "Lepiota cristata")
        self.assertNotIn("deadly", cristata)
        self.assertNotIn("Omphalotus olearius", deadly)

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
            item["id"]: 160 if item["id"] in ("not_a_mushroom", "unknown_mushroom") else 80
            for item in manifest["classes"]
        }
        val_images = {item["id"]: 8 for item in manifest["classes"]}
        test_images = {item["id"]: 24 for item in manifest["classes"]}
        pair_rates = {}
        for left, right in DANGEROUS_PAIRS:
            pair_rates[f"{left}->{right}"] = 0.0
            pair_rates[f"{right}->{left}"] = 0.0
        report = {
            "per_class": per_class,
            "macro_top1": 0.91,
            "macro_top3": 0.97,
            "dangerous_pair_rates": pair_rates,
            "coverage": {"train_images": train_images, "val_images": val_images, "test_images": test_images},
            "confident_toxic_as_edible": 0,
            "open_set": {
                "held_out_support": 400,
                "safe_count": 380,
                "confident_edible_count": 2,
                "poisonous_held_out_support": 50 * len(poisonous_heldout_taxa()),
                "poisonous_held_out_confident_edible": 0,
                "deadly_probe_strict_top1_edible": 0,
                "poisonous_per_taxon": [
                    {"taxon": name, "support": 50, "confident_edible": 0}
                    for name in poisonous_heldout_taxa()
                ],
            },
            "unknown_mushroom": {
                "held_out_support": 200,
                "held_out_recall": 0.10,
                "taxa_with_at_least_10": 10,
                "per_taxon_recall_lower_bound_min": 0.05,
                "known_support": 200,
                "known_predicted_as_unknown_rate": 0.02,
                "high_stakes_steal": {
                    species_id: {"support": 40, "rate": 0.0} for species_id in HIGH_STAKES_IDS
                },
                "diagnostic_only": True,
            },
            "ood": {
                "id_keep_rate_val": 0.97,
                "id_keep_rate_test": 0.96,
                "ood_reject_rate_test": 0.97,
                "held_out_not_a_mushroom_support": 24,
                "held_out_not_a_mushroom_reject_rate": 0.95,
                "ood_test_softmax_above_0_5": 40,
                "softmax_above_0_5_still_rejected_rate": 0.95,
            },
            "tflite": {
                "loaded": True,
                "top1_agreement_with_fp32": 1.0,
                "agreement_source": "val_and_test_photos",
                "agreement_images": len(manifest["classes"]) * 32,
                "high_risk_top1_agreement": 1.0,
                "high_risk_agreement_images": len(HIGH_STAKES_IDS) * 32,
            },
            "artifacts": {
                "model_keras_sha256": hashlib.sha256(keras_bytes).hexdigest(),
                "tflite_sha256": hashlib.sha256(tflite_bytes).hexdigest(),
            },
            "attributions_complete": True,
        }
        self._write_attributions(artifact_dir, report)
        return report

    def _write_attributions(self, artifact_dir: Path, report: dict) -> None:
        coverage = report["coverage"]
        count = (
            sum(coverage["train_images"].values())
            + sum(coverage["val_images"].values())
            + sum(coverage["test_images"].values())
        )
        lines = []
        for index in range(count):
            lines.append(
                json.dumps(
                    {
                        "creator": "Ada",
                        "license": "https://creativecommons.org/licenses/by/4.0/",
                        "license_normalized": "cc-by-4.0",
                        "image_url": f"https://example.test/{index}.jpg",
                        "source_url": f"https://example.test/source/{index}",
                        "gbif_occurrence": f"https://www.gbif.org/occurrence/{index}",
                        "class_id": "boletus_edulis",
                        "file": f"images/{index}.jpg",
                    }
                )
            )
        (artifact_dir / "attributions.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")

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

    def test_energy_threshold_is_an_order_statistic(self):
        energies = [float(value) for value in range(8)]
        linear = float(np.quantile(np.asarray(energies), 0.95))
        self.assertLess(sum(energy <= linear for energy in energies) / 8, 0.95)
        predictions = [{"class_id": "boletus_edulis", "energy": energy} for energy in energies]
        threshold = choose_threshold(predictions)
        self.assertGreaterEqual(sum(energy <= threshold for energy in energies) / 8, 0.95)
        self.assertEqual(threshold, 7.0)

    def test_unknown_mushroom_is_not_a_species_result(self):
        classes = _classes(
            ["boletus_edulis", "unknown_mushroom", "not_a_mushroom"],
            ["Boletus", "", ""],
        )
        ood = {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "unknown_class_id": "unknown_mushroom",
            "temperature": 1,
            "energy_threshold": 0.0,
            "min_softmax_for_accept": 0.40,
            "min_top1_softmax_for_high_confidence": 0.70,
            "min_margin": 0.15,
        }
        result = decide([0.0, 8.0, -2.0], classes, ood)
        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["reason"], "unknown_mushroom")
        self.assertNotIn("top3", result)
        self.assertNotIn("edibility", result)
        self.assertGreater(result["max_softmax"], 0.9)
        skipped = decide([5.0, 1.0, -2.0], classes, ood)
        self.assertEqual(skipped["status"], "candidates")
        self.assertNotIn("unknown_mushroom", [item["id"] for item in skipped["top3"]])

    def test_confident_toxic_photo_shown_as_edible_is_counted(self):
        classes = _classes(
            ["macrolepiota_procera", "boletus_edulis", "not_a_mushroom"],
            ["Macrolepiota", "Boletus", ""],
        )
        ood = {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "unknown_class_id": "unknown_mushroom",
            "temperature": 1,
            "energy_threshold": 5.0,
            "min_softmax_for_accept": 0.40,
            "min_top1_softmax_for_high_confidence": 0.70,
            "min_margin": 0.15,
        }
        confident = {
            "class_id": "amanita_phalloides",
            "toxic": True,
            "logits": [8.0, 0.0, -4.0],
        }
        unsure = {
            "class_id": "amanita_phalloides",
            "toxic": True,
            "logits": [1.2, 1.3, 0.0],
        }
        edible = {"macrolepiota_procera"}
        self.assertEqual(confident_toxic_as_edible([confident], classes, ood, edible), 1)
        self.assertEqual(confident_toxic_as_edible([unsure], classes, ood, edible), 0)
        held_out = {
            "class_id": "unknown_mushroom",
            "taxon_name": "Amanita verna",
            "toxic": True,
            "held_out_taxon": True,
            "logits": [0.0, 8.0, -4.0],
        }
        classes_with_suillus = _classes(
            ["unknown_mushroom", "suillus_luteus", "not_a_mushroom"],
            ["", "Suillus", ""],
        )
        self.assertNotIn("suillus_luteus", EDIBLE_LOOKALIKE_IDS)
        counted = confident_toxic_as_edible(
            [held_out],
            classes_with_suillus,
            ood,
            {"suillus_luteus"},
        )
        self.assertEqual(counted, 1)
        warned = {
            "class_id": "unknown_mushroom",
            "toxic": True,
            "logits": [0.2, 8.0, -4.0],
        }
        amanita_edible = _classes(
            ["unknown_mushroom", "amanita_rubescens", "not_a_mushroom"],
            ["", "Amanita", ""],
        )
        self.assertEqual(
            confident_toxic_as_edible([warned], amanita_edible, ood, {"amanita_rubescens"}),
            0,
        )

    def test_keep_rate_gate_uses_the_test_split(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            report["ood"]["id_keep_rate_val"] = 1.0
            report["ood"]["id_keep_rate_test"] = 0.5
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("test in-distribution keep rate" in reason for reason in reasons))

    def test_agreement_must_cover_every_val_and_test_photo(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            report["tflite"]["agreement_images"] = 4
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("full val+test" in reason for reason in reasons))
            report = self._passing_report(artifact_dir)
            report["tflite"]["high_risk_agreement_images"] = 1
            report["tflite"]["high_risk_top1_agreement"] = 1.0
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("high-risk" in reason for reason in reasons))

    def test_unknown_recall_is_diagnostic_and_poisonous_sample_is_a_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            report["unknown_mushroom"]["held_out_recall"] = 0.0
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            short = self._passing_report(artifact_dir)
            short["open_set"]["poisonous_per_taxon"] = [
                {"taxon": "Lepiota brunneoincarnata", "support": 0, "confident_edible": 0}
            ]
            short["open_set"]["poisonous_held_out_support"] = 0
            short["open_set"]["deadly_probe_strict_top1_edible"] = 0
            ok, reasons = assess_shippable(short, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("Lepiota brunneoincarnata" in reason for reason in reasons))

    def test_open_set_lists_a_poisonous_taxon_with_no_photos(self):
        metrics = open_set_metrics([], [], {}, set(), ["Lepiota brunneoincarnata"])
        self.assertEqual(
            metrics["poisonous_per_taxon"],
            [
                {
                    "taxon": "Lepiota brunneoincarnata",
                    "support": 0,
                    "confident_edible": 0,
                    "strict_top1_edible": 0,
                    "confident_edible_wilson_high": None,
                    "confident_edible_bootstrap_high": None,
                }
            ],
        )
        self.assertIn("Lepiota brunneoincarnata", metrics["taxa_below_minimum"])
        self.assertEqual(metrics["deadly_probe_strict_top1_edible"], 0)

    def _quota_rows(self, **overrides: dict) -> list[dict]:
        rows = [
            {"taxon": name, "support": 50, "confident_edible": 0}
            for name in poisonous_heldout_taxa()
        ]
        for name, patch in overrides.items():
            for row in rows:
                if row["taxon"] == name:
                    row.update(patch)
        return rows

    def test_rare_exception_below_five_fails(self):
        probes = load_manifest()["toxic_probes"]
        reasons = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Lepiota brunneoincarnata": {
                        "support": 4,
                        "accepted": 16,
                        "gbif_licensed_count": 16,
                        "exhausted_reason": "end_of_records",
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Lepiota brunneoincarnata" in reason and "at least 5" in reason for reason in reasons))

    def test_rare_exception_with_a_confident_edible_fails(self):
        probes = load_manifest()["toxic_probes"]
        reasons = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Inosperma erubescens": {
                        "support": 44,
                        "confident_edible": 1,
                        "accepted": 44,
                        "gbif_licensed_count": 44,
                        "exhausted_reason": "end_of_records",
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(
            any("Inosperma erubescens" in reason and "confident edible" in reason for reason in reasons)
        )

    def test_exception_without_an_exhausted_pool_keeps_the_fifty_floor(self):
        probes = load_manifest()["toxic_probes"]
        capped = poisonous_sample_reasons(
            self._quota_rows(
                **{"Lepiota brunneoincarnata": {"support": 15, "accepted": 80, "gbif_licensed_count": 16}}
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in capped))
        filaris = poisonous_sample_reasons(
            self._quota_rows(
                **{"Conocybe filaris": {"support": 33, "accepted": 72, "gbif_licensed_count": 78}}
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Conocybe filaris" in reason and "need 50" in reason for reason in filaris))
        self.assertFalse(any("Conocybe filaris" in reason and "at least 5" in reason for reason in filaris))
        exhausted = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Lepiota brunneoincarnata": {
                        "support": 15,
                        "accepted": 16,
                        "gbif_licensed_count": 16,
                        "exhausted_reason": "end_of_records",
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertFalse(any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in exhausted))
        self.assertFalse(any("at least 5" in reason for reason in exhausted))

    def test_failed_download_does_not_apply_the_rare_taxon_exception(self):
        """The audited pool was enumerated, and one licensed photo failed to download.

        gbif_licensed_count matches the audit. accepted is one short of that
        count, so the 5-photo floor stays closed and the taxon still needs 50.
        The gate copies both numbers from the fetch report.
        """
        from evaluate import attach_fetch_evidence

        probes = load_manifest()["toxic_probes"]
        merged = attach_fetch_evidence(
            [
                {
                    "taxon": "Lepiota brunneoincarnata",
                    "support": 15,
                    "accepted": 80,
                    "gbif_licensed_count": 80,
                }
            ],
            {
                "taxa": [
                    {
                        "taxon": "Lepiota brunneoincarnata",
                        "accepted": 15,
                        "gbif_licensed_count": 16,
                        "shortfall": 65,
                    }
                ]
            },
        )
        self.assertEqual(merged[0]["accepted"], 15)
        self.assertEqual(merged[0]["gbif_licensed_count"], 16)
        reasons = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Lepiota brunneoincarnata": {
                        "support": 15,
                        "accepted": merged[0]["accepted"],
                        "gbif_licensed_count": merged[0]["gbif_licensed_count"],
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons))
        self.assertFalse(any("at least 5" in reason for reason in reasons))

    def test_max_pages_does_not_apply_the_rare_taxon_exception(self):
        probes = load_manifest()["toxic_probes"]
        reasons = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Lepiota brunneoincarnata": {
                        "support": 16,
                        "accepted": 16,
                        "gbif_licensed_count": 16,
                        "exhausted_reason": "max_pages",
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons))
        self.assertFalse(any("at least 5" in reason for reason in reasons))

    def test_replacement_budget_does_not_apply_the_rare_taxon_exception(self):
        """A host that rejects every photo is not an exhausted licensed pool.

        accepted equals a licensed count under 50, and the cap is not filled.
        replacement_budget still keeps the 50-photo floor.
        """
        probes = load_manifest()["toxic_probes"]
        reasons = poisonous_sample_reasons(
            self._quota_rows(
                **{
                    "Lepiota brunneoincarnata": {
                        "support": 16,
                        "accepted": 16,
                        "gbif_licensed_count": 16,
                        "exhausted_reason": "replacement_budget",
                    }
                }
            ),
            probes,
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons))
        self.assertFalse(any("at least 5" in reason for reason in reasons))

    def test_verna_exception_without_a_group_fails_validation_and_the_gate(self):
        import copy

        from manifest import validate_toxic_probes

        manifest = copy.deepcopy(load_manifest())
        manifest["toxic_probes"]["rare_taxon_exceptions"].append(
            {
                "taxon": "Amanita verna",
                "gbif_key": 5240320,
                "reason": "Reviewer regression: five photos and a null group must not pass.",
                "gbif_licensed_count": 5,
                "date_checked": "2026-10-08",
                "group_id": None,
            }
        )
        with self.assertRaises(ValueError) as raised:
            validate_toxic_probes(manifest)
        self.assertIn("must belong to a visual group", str(raised.exception))
        rows = self._quota_rows(
            **{"Amanita verna": {"support": 5, "accepted": 5, "gbif_licensed_count": 5}}
        )
        reasons = poisonous_sample_reasons(
            rows,
            manifest["toxic_probes"],
            expected_names=poisonous_heldout_taxa(),
        )
        self.assertTrue(any("closed exception list" in reason and "Amanita verna" in reason for reason in reasons))
        self.assertTrue(any("Amanita verna" in reason and "need 50" in reason for reason in reasons))

    def test_moving_a_taxon_or_clearing_deadly_fails_validation(self):
        import copy

        from manifest import validate_toxic_probes

        moved = copy.deepcopy(load_manifest())
        groups = moved["toxic_probes"]["visual_groups"]
        lepiota = next(group for group in groups if group["id"] == "lepiota_lookalikes")
        omphalotus = next(group for group in groups if group["id"] == "omphalotus")
        lepiota["taxa"].remove("Lepiota cristata")
        omphalotus["taxa"].append("Lepiota cristata")
        with self.assertRaises(ValueError) as moved_error:
            validate_toxic_probes(moved)
        self.assertIn("lepiota_lookalikes taxa must stay", str(moved_error.exception))

        cleared = copy.deepcopy(load_manifest())
        verna = next(
            taxon
            for item in cleared["classes"]
            if item["id"] == "unknown_mushroom"
            for taxon in item["sampling"]["taxa"]
            if taxon["name"] == "Amanita verna"
        )
        verna["deadly"] = False
        with self.assertRaises(ValueError) as cleared_error:
            validate_toxic_probes(cleared)
        self.assertIn("Amanita verna must stay deadly", str(cleared_error.exception))

    def test_fetch_report_overwrites_row_counts_and_is_hashed(self):
        from evaluate import attach_fetch_evidence

        rows = [
            {
                "taxon": "Lepiota brunneoincarnata",
                "support": 16,
                "accepted": 80,
                "gbif_licensed_count": 80,
                "exhausted_reason": "max_pages",
            }
        ]
        merged = attach_fetch_evidence(
            rows,
            {
                "taxa": [
                    {
                        "taxon": "Lepiota brunneoincarnata",
                        "accepted": 16,
                        "gbif_licensed_count": 16,
                        "exhausted_reason": "end_of_records",
                    }
                ]
            },
        )
        self.assertEqual(merged[0]["accepted"], 16)
        self.assertEqual(merged[0]["gbif_licensed_count"], 16)
        self.assertEqual(merged[0]["exhausted_reason"], "end_of_records")
        unrelated = {
            "taxon": "Amanita verna",
            "support": 5,
            "accepted": 5,
            "gbif_licensed_count": 5,
        }
        partial = attach_fetch_evidence(
            [rows[0], unrelated],
            {"taxa": [{"taxon": "Lepiota brunneoincarnata", "accepted": 16}]},
        )
        self.assertEqual(partial[0]["accepted"], 16)
        self.assertNotIn("gbif_licensed_count", partial[0])
        self.assertNotIn("accepted", partial[1])
        self.assertNotIn("gbif_licensed_count", partial[1])
        with tempfile.TemporaryDirectory() as tmp:
            missing = attach_fetch_evidence(rows, report_path=Path(tmp) / "absent.json")
            self.assertEqual(missing[0]["support"], 16)
            self.assertNotIn("accepted", missing[0])
            self.assertNotIn("gbif_licensed_count", missing[0])
            broken = Path(tmp) / "fetch_report.json"
            broken.write_text("{", encoding="utf-8")
            unreadable = attach_fetch_evidence(rows, report_path=broken)
            self.assertNotIn("accepted", unreadable[0])
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            payload = b'{"taxa":[]}\n'
            (artifact_dir / "fetch_report.json").write_bytes(payload)
            report["artifacts"]["fetch_report_sha256"] = hashlib.sha256(payload).hexdigest()
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            (artifact_dir / "fetch_report.json").write_bytes(b'{"taxa":[{"taxon":"Amanita verna"}]}\n')
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("fetch_report sha256" in reason for reason in reasons))

    def test_missing_fetch_report_does_not_trust_metrics_license_counts(self):
        rows = self._quota_rows(
            **{"Lepiota brunneoincarnata": {"support": 16, "accepted": 16, "gbif_licensed_count": 16}}
        )
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            report["open_set"]["poisonous_per_taxon"] = rows
            report["open_set"]["poisonous_held_out_support"] = sum(row["support"] for row in rows)
            report["open_set"]["poisonous_held_out_confident_edible"] = 0
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(
                any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons),
                reasons,
            )
            payload = json.dumps(
                {
                    "toxic_probes": [
                        {
                            "taxon": "Lepiota brunneoincarnata",
                            "accepted": 16,
                            "gbif_licensed_count": 16,
                            "exhausted_reason": "end_of_records",
                        }
                    ]
                }
            ).encode()
            (artifact_dir / "fetch_report.json").write_bytes(payload)
            report["artifacts"]["fetch_report_sha256"] = hashlib.sha256(payload).hexdigest()
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            self.assertFalse(
                any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons)
            )

    def test_strict_top1_flag_is_required_on_lepiota_and_conocybe(self):
        import copy

        from manifest import validate_toxic_probes

        manifest = copy.deepcopy(load_manifest())
        for group in manifest["toxic_probes"]["visual_groups"]:
            if group["id"] == "lepiota_lookalikes":
                group["strict_top1_edible"] = False
        with self.assertRaises(ValueError) as raised:
            validate_toxic_probes(manifest)
        self.assertIn("strict_top1_edible", str(raised.exception))

    def test_strict_edible_counts_deadly_class_photos_and_held_out_verna(self):
        classes = _classes(
            ["amanita_phalloides", "macrolepiota_procera", "unknown_mushroom", "not_a_mushroom"],
            ["Amanita", "Macrolepiota", "", ""],
        )
        ood = {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "unknown_class_id": "unknown_mushroom",
            "temperature": 1,
            "energy_threshold": -1.0,
            "min_softmax_for_accept": 0.4,
            "min_top1_softmax_for_high_confidence": 0.7,
            "min_margin": 0.15,
        }
        edible = {"macrolepiota_procera"}
        death_cap = {
            "class_id": "amanita_phalloides",
            "logits": [1.0, 8.0, -3.0, -3.0],
            "toxic": True,
        }
        metrics = open_set_metrics([death_cap], classes, ood, edible, [], [])
        self.assertEqual(metrics["deadly_probe_strict_top1_edible"], 1)
        verna = {
            "class_id": "unknown_mushroom",
            "taxon_name": "Amanita verna",
            "held_out_taxon": True,
            "toxic": True,
            "logits": [1.0, 8.0, 2.0, -3.0],
        }
        metrics = open_set_metrics([verna], classes, ood, edible, ["Amanita verna"], ["Amanita verna"])
        self.assertEqual(metrics["deadly_probe_strict_top1_edible"], 1)

    def test_visual_group_below_minimum_fails(self):
        probes = {
            "other_taxon_minimum": 50,
            "rare_exception_minimum": 5,
            "minimum_poisonous_held_out_images": 60,
            "per_taxon_cap": 80,
            "visual_groups": [
                {
                    "id": "lepiota_lookalikes",
                    "minimum_images": 200,
                    "taxa": ["Lepiota brunneoincarnata", "Lepiota cristata"],
                }
            ],
            "rare_taxon_exceptions": [
                {
                    "taxon": "Lepiota brunneoincarnata",
                    "gbif_key": 2535390,
                    "reason": "scarce on GBIF",
                    "gbif_licensed_count": 16,
                    "date_checked": "2026-10-08",
                    "group_id": "lepiota_lookalikes",
                }
            ],
        }
        rows = [
            {
                "taxon": "Lepiota brunneoincarnata",
                "support": 10,
                "confident_edible": 0,
                "accepted": 16,
                "gbif_licensed_count": 16,
                "exhausted_reason": "end_of_records",
            },
            {"taxon": "Lepiota cristata", "support": 50, "confident_edible": 0},
        ]
        reasons = poisonous_sample_reasons(rows, probes, expected_names=[row["taxon"] for row in rows])
        self.assertTrue(any("visual group lepiota_lookalikes" in reason for reason in reasons))
        self.assertFalse(any("need 50" in reason for reason in reasons))
        self.assertFalse(any("at least 5" in reason for reason in reasons))

    def test_gbif_higher_rank_match_stops_the_fetch(self):
        import fetch_gbif

        original = fetch_gbif._get_json
        fetch_gbif._KEY_CACHE.clear()

        def fake(_url):
            return {
                "matchType": "HIGHERRANK",
                "rank": "KINGDOM",
                "scientificName": "Fungi",
                "usageKey": 5,
            }

        fetch_gbif._get_json = fake
        original_sleep = fetch_gbif.time.sleep
        fetch_gbif.time.sleep = lambda _seconds: None
        try:
            with self.assertRaises(SystemExit) as raised:
                fetch_gbif.resolve_accepted_keys(["Helvella crispa"])
        finally:
            fetch_gbif._get_json = original
            fetch_gbif.time.sleep = original_sleep
            fetch_gbif._KEY_CACHE.clear()
        self.assertIn("HIGHERRANK", str(raised.exception))

    def test_safety_tag_matches_atlas_edibility(self):
        import re

        text = (ROOT / "src" / "data" / "mushrooms.ts").read_text(encoding="utf-8")
        found = re.findall(
            r"id: '([a-z0-9_]+)'[\s\S]*?status: '(EDIBLE|INEDIBLE|POISONOUS|DEADLY_POISONOUS)'",
            text,
        )
        self.assertGreaterEqual(len(found), 18)
        expected = {
            "EDIBLE": "edible",
            "INEDIBLE": "other",
            "POISONOUS": "toxic",
            "DEADLY_POISONOUS": "toxic",
        }
        tags = {item["id"]: item.get("safety_tag") for item in load_manifest()["classes"]}
        checked_ids = []
        for species_id, status in found:
            if species_id not in tags:
                continue
            checked_ids.append(species_id)
            self.assertEqual(tags[species_id], expected[status], species_id)
        self.assertGreaterEqual(len(checked_ids), 18)
        for species_id in (
            "amanita_rubescens",
            "amanita_citrina",
            "cortinarius_orellanus",
            "cortinarius_rubellus",
        ):
            self.assertIn(species_id, checked_ids)

    def test_small_third_place_dangerous_genus_does_not_clear_a_strict_edible(self):
        classes = _classes(
            ["macrolepiota_procera", "boletus_edulis", "amanita_phalloides", "not_a_mushroom"],
            ["Macrolepiota", "Boletus", "Amanita", ""],
        )
        ood = {
            "calibrated": True,
            "background_class_id": "not_a_mushroom",
            "temperature": 1,
            "energy_threshold": -4.0,
            "min_softmax_for_accept": 0.4,
            "min_top1_softmax_for_high_confidence": 0.7,
            "min_margin": 0.15,
        }
        below = decide([8.0, 5.0, 4.2, -2.0], classes, ood)
        edible = {"macrolepiota_procera"}
        self.assertFalse(below["dangerous_genus"])
        self.assertFalse(below["low_confidence"])
        self.assertTrue(outcome_is_confident_edible(below, edible))
        self.assertTrue(outcome_is_strict_top1_edible(below, edible))
        warned = decide([7.712318, 5.879736, 5.792725, 4.087977], classes, ood)
        self.assertTrue(warned["dangerous_genus"])
        self.assertFalse(outcome_is_confident_edible(warned, edible))
        self.assertTrue(outcome_is_strict_top1_edible(warned, edible))

    def test_gbif_key_collision_is_rejected(self):
        from manifest import _claim_key

        owner: dict[int, str] = {}
        _claim_key(owner, 7832732, "imleria_badia")
        _claim_key(owner, 7832732, "imleria_badia")
        with self.assertRaises(ValueError) as raised:
            _claim_key(owner, 7832732, "boletus_edulis")
        self.assertIn("7832732", str(raised.exception))

    def test_fp16_is_the_default_export(self):
        self.assertEqual(DEFAULT_QUANTIZATIONS, ("fp16",))
        source = (ROOT / "training" / "export_tflite.py").read_text(encoding="utf-8")
        self.assertIn('default="fp16"', source)
        self.assertNotIn('for quantization in ("int8", "fp16")', source)

    @contextmanager
    def _installed_repo_copy(self):
        import export_tflite

        real_module = ROOT / "src" / "services" / "attributionPackage.ts"
        real_model = ROOT / "src" / "services" / "modelPackage.ts"
        real_jsonl = ROOT / "assets" / "models" / "attributions.jsonl"
        before = {
            real_module: real_module.read_bytes(),
            real_model: real_model.read_bytes(),
            real_jsonl: real_jsonl.read_bytes(),
        }
        saved = {
            "ARTIFACTS": export_tflite.ARTIFACTS,
            "MODEL_DEST": export_tflite.MODEL_DEST,
            "LABELS_PATH": export_tflite.LABELS_PATH,
            "PACKAGE_MODULE": export_tflite.PACKAGE_MODULE,
            "ATTRIBUTION_DEST": export_tflite.ATTRIBUTION_DEST,
        }
        parent = Path(tempfile.mkdtemp(prefix="install-copy-"))
        copy_root = parent / "app"
        try:
            shutil.copytree(
                ROOT,
                copy_root,
                symlinks=True,
                ignore=shutil.ignore_patterns(
                    "node_modules",
                    ".git",
                    "storybook-static",
                    "dist",
                    "coverage",
                    ".cache",
                ),
            )
            (copy_root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
            module = copy_root / "src" / "services" / "attributionPackage.ts"
            model_module = copy_root / "src" / "services" / "modelPackage.ts"
            jsonl_dest = copy_root / "assets" / "models" / "attributions.jsonl"
            original_module = module.read_text(encoding="utf-8")
            artifacts = copy_root / "artifacts"
            artifacts.mkdir()
            (artifacts / "attributions.jsonl").write_text(
                json.dumps(
                    {
                        "creator": "Ada L.",
                        "license": "https://creativecommons.org/licenses/by/4.0/",
                        "license_normalized": "cc-by-4.0",
                        "image_url": "https://example.test/a.jpg",
                        "source_url": "https://example.test/obs/1",
                        "class_id": "boletus_edulis",
                        "taxon_name": "Boletus edulis",
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            export_tflite.ARTIFACTS = artifacts
            export_tflite.MODEL_DEST = copy_root / "assets" / "models" / "mushrooms_model.tflite"
            export_tflite.LABELS_PATH = copy_root / "assets" / "models" / "labels.json"
            export_tflite.PACKAGE_MODULE = model_module
            export_tflite.ATTRIBUTION_DEST = jsonl_dest
            export_tflite.install_calibrated_model(
                b"tflite-bytes",
                "fp16",
                {
                    "ood": {
                        "energy_threshold": -4.0,
                        "temperature": 1,
                        "min_softmax_for_accept": 0.4,
                        "min_top1_softmax_for_high_confidence": 0.7,
                        "min_margin": 0.15,
                        "id_keep_rate_test": 0.96,
                        "id_keep_rate_val": 0.97,
                        "ood_reject_rate_test": 0.97,
                        "softmax_above_0_5_still_rejected_rate": 0.95,
                    }
                },
            )
            self.assertEqual(module.read_text(encoding="utf-8"), original_module)
            packaged = model_module.read_text(encoding="utf-8")
            self.assertIn("mushrooms_model.tflite", packaged)
            self.assertIn("require('../../assets/models/mushrooms_model.tflite')", packaged)
            for name in ("loadPhotoCredits", "creditsFromJsonl", "creditLicenseUrl"):
                self.assertIn(name, original_module)
            self.assertNotIn("PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = [", original_module)
            self.assertIn("Ada L.", jsonl_dest.read_text(encoding="utf-8"))
            for path, payload in before.items():
                self.assertEqual(path.read_bytes(), payload)
            yield copy_root
        finally:
            for key, value in saved.items():
                setattr(export_tflite, key, value)
            shutil.rmtree(parent, ignore_errors=True)

    def test_install_writes_jsonl_on_a_repo_copy(self):
        with self._installed_repo_copy():
            pass

    @unittest.skipUnless(
        os.environ.get("REQUIRE_PNPM") == "1" or shutil.which("pnpm"),
        "pnpm is required to typecheck the credit module",
    )
    def test_install_writes_jsonl_and_leaves_the_credit_module_typecheckable(self):
        import subprocess

        pnpm = shutil.which("pnpm")
        if pnpm is None:
            self.fail("REQUIRE_PNPM=1 but pnpm is not on PATH")
        with self._installed_repo_copy() as copy_root:
            generated = (copy_root / "src" / "services" / "modelPackage.ts").read_text(encoding="utf-8")
            self.assertNotEqual(generated, (ROOT / "src" / "services" / "modelPackage.ts").read_text(encoding="utf-8"))
            proc = subprocess.run(
                [pnpm, "exec", "tsc", "--noEmit", "--pretty", "false"],
                cwd=copy_root,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, proc.stdout + "\n" + proc.stderr)


class StatsReferenceTest(unittest.TestCase):
    def test_wilson_interval_matches_the_reference_values(self):
        from stats import wilson_interval

        low, high = wilson_interval(81, 100)
        self.assertAlmostEqual(low, 0.7222115462093562, places=10)
        self.assertAlmostEqual(high, 0.8748524849023126, places=10)
        zero_low, zero_high = wilson_interval(0, 300)
        self.assertEqual(zero_low, 0.0)
        self.assertAlmostEqual(zero_high, 0.012642971224546036, places=10)

    def test_bootstrap_quantiles_match_the_seeded_reference(self):
        from stats import bootstrap_rate_lower, bootstrap_rate_upper

        self.assertEqual(bootstrap_rate_lower(40, 50, seed=1, draws=2000), 0.7)
        self.assertEqual(bootstrap_rate_upper(40, 50, seed=1, draws=2000), 0.88)


if __name__ == "__main__":
    unittest.main()
