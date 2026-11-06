import hashlib
import inspect
import json
import math
import os
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
from contextlib import contextmanager
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluate import (
    choose_threshold,
    id_validation_energies,
    confident_toxic_as_edible,
    deadly_probe_taxa,
    image_counts,
    open_set_metrics,
    outcome_is_confident_edible,
    outcome_is_strict_top1_edible,
    poisonous_sample_reasons,
)
from export_tflite import (
    DEFAULT_QUANTIZATIONS,
    assess_export,
    calibration_rows,
    choose_install_target,
    metric_delta,
    representative_dataset,
)
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
from ship_gates import _df20_release_reasons, _int8_energy_reasons, assess_shippable, sha256_file

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


# Names copied from .gitignore that can hold tokens or signing material.
# `training/data` is matched by directory, not by this basename list, so `src/data` stays.
_REPO_COPY_SECRET_PATTERNS = (
    ".env",
    ".env.*",
    "*.pem",
    "*.jks",
    "*.p8",
    "*.p12",
    "*.key",
    "*.mobileprovision",
    "google-service-account.json",
    "credentials.json",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
)


def _ignore_repo_copy(repo_root: Path):
    """Skip install bulk, `training/data`, and secret-shaped filenames."""
    skip_names = shutil.ignore_patterns(
        "node_modules",
        ".git",
        "storybook-static",
        "dist",
        "coverage",
        ".cache",
        *_REPO_COPY_SECRET_PATTERNS,
    )
    training = (repo_root / "training").resolve()

    def ignore(directory: str, names: list[str]) -> set[str]:
        ignored = set(skip_names(directory, names))
        if Path(directory).resolve() == training and "data" in names:
            ignored.add("data")
        return ignored

    return ignore


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
            "amanita_excelsa": "Inedible look-alike card. The class contract does not include it.",
            "calocybe_gambosa": "Unfinished spring card. The class contract does not include it.",
            "hydnum_repandum": "Unfinished hedgehog card. The class contract does not include it.",
            "hypholoma_capnoides": "Unfinished wood-tuft card. The class contract does not include it.",
            "inocybe_erubescens": "Deadly fibrecap is an atlas look-alike card, not a model class.",
            "rubroboletus_satanas": "Strictly protected poisonous card. The class contract does not include it.",
            "suillellus_luridus": "Poisonous bolete card. The class contract does not include it.",
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
        model_file = ROOT / "assets" / "models" / "mushrooms_model.tflite"
        packaged_hash = sha256_file(model_file)
        if model_file.is_file():
            self.assertEqual(manifest["model_sha256"], packaged_hash)
        else:
            self.assertIsNone(packaged_hash)
            self.assertIsNone(manifest["model_sha256"])
        self.assertIsNone(manifest["delegate_sample_sha256"])
        self.assertFalse(manifest["delegate_release"]["android-gpu"]["passed"])
        self.assertFalse(manifest["delegate_release"]["core-ml"]["passed"])
        self.assertEqual(manifest["delegate_release"]["android-gpu"]["reason"], "not_measured")
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
        self.assertTrue(any("component_share" in reason for reason in reasons))

    def test_component_share_limit_is_pinned(self):
        from component_share import COMPONENT_SHARE_LIMIT

        # Changing this constant is Wojtek's decision only.
        self.assertEqual(COMPONENT_SHARE_LIMIT, 0.20)

    def test_variant_c_leaves_agreement_share_https_and_license_url(self):
        from component_share import COMPONENT_SHARE_LIMIT
        from import_external import photo_license_decision
        from ship_gates import TFLITE_AGREEMENT_MIN
        from url_safety import force_https_url

        self.assertEqual(TFLITE_AGREEMENT_MIN, 0.99)
        self.assertEqual(COMPONENT_SHARE_LIMIT, 0.20)
        gates = (ROOT / "training" / "ship_gates.py").read_text(encoding="utf-8")
        share = (ROOT / "training" / "component_share.py").read_text(encoding="utf-8")
        self.assertIn("TFLITE_AGREEMENT_MIN = 0.99", gates)
        self.assertIn("COMPONENT_SHARE_LIMIT = 0.20", share)
        self.assertNotIn("COMPONENT_SHARE_LIMIT = 0.50", share)
        self.assertEqual(
            force_https_url("http://images.example.test/a.jpg"),
            "https://images.example.test/a.jpg",
        )
        pinned = (
            ("CC BY 4.0", "", "license_url_empty"),
            ("CC BY-NC 4.0", "", "license_url_empty"),
            ("CC BY-SA 4.0", "", "license_url_empty"),
            ("CC BY-NC 4.0", "http://creativecommons.org/licenses/by-nc/4.0/", "license_url_not_https"),
            ("CC BY-SA 4.0", "http://creativecommons.org/licenses/by-sa/4.0/", "license_url_not_https"),
            ("CC BY-NC 4.0", "https://creativecommons.org/licenses/by/4.0/", "license_url_mismatch"),
            ("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-nc/4.0/", "license_url_mismatch"),
            ("CC BY 4.0", "https://creativecommons.org/licenses/by/2.0/", "license_url_mismatch"),
        )
        for text, url, reason in pinned:
            decision, got = photo_license_decision(text, url)
            self.assertIsNone(decision, text)
            self.assertEqual(got, reason, text)
        nc, nc_reason = photo_license_decision(
            "CC BY-NC",
            "https://creativecommons.org/licenses/by-nc/2.0/",
        )
        self.assertEqual(nc_reason, "")
        self.assertEqual((nc["license_normalized"], nc["usage"]), ("cc-by-nc-2.0", "training_only"))
        sa, sa_reason = photo_license_decision(
            "CC BY-SA 4.0",
            "https://creativecommons.org/licenses/by-sa/4.0/",
        )
        self.assertEqual(sa_reason, "")
        self.assertEqual((sa["license_normalized"], sa["usage"]), ("cc-by-sa-4.0", "training_only"))

    def test_prepare_report_counts_rejections_per_class(self):
        """Every row prepare skips or drops is counted by class and reason."""
        from component_share import COMPONENT_SHARE_LIMIT
        from prepare_data import _rejected_per_class, write_prepare_outputs
        from salt_fixture import FIXTURE_SALT

        skipped = [
            {"class_id": "boletus_edulis", "skip_reason": "unverified", "file": "a.jpg"},
            {"class_id": "boletus_edulis", "skip_reason": "unverified", "file": "b.jpg"},
            {"class_id": "amanita_phalloides", "skip_reason": "df20_opt_out", "file": "c.jpg"},
            {"class_id": "", "skip_reason": "corrupt", "file": "d.jpg"},
        ]
        identity_dropped = [
            {"class_id": "boletus_edulis", "drop_reason": "duplicate_photo_id", "file": "e.jpg"},
            {"class_id": "boletus_edulis", "drop_reason": "looser_license", "file": "f.jpg"},
        ]
        dropped = [
            {"class_id": "cantharellus_cibarius", "drop_reason": "perceptual_near_duplicate", "file": "g.jpg"},
        ]
        silent = [{"class_id": "boletus_edulis", "file": "h.jpg"}]
        counted = _rejected_per_class(skipped, identity_dropped, dropped, silent)
        self.assertEqual(counted["boletus_edulis"]["unverified"], 2)
        self.assertEqual(counted["boletus_edulis"]["duplicate_photo_id"], 1)
        self.assertEqual(counted["boletus_edulis"]["looser_license"], 1)
        self.assertEqual(counted["boletus_edulis"]["unknown"], 1)
        self.assertEqual(counted["amanita_phalloides"]["df20_opt_out"], 1)
        self.assertEqual(counted["cantharellus_cibarius"]["perceptual_near_duplicate"], 1)
        self.assertEqual(counted["unmapped"]["corrupt"], 1)
        total = sum(count for reasons in counted.values() for count in reasons.values())
        self.assertEqual(total, len(skipped) + len(identity_dropped) + len(dropped) + len(silent))
        self.assertTrue(all(reason and count > 0 for reasons in counted.values() for reason, count in reasons.items()))

        balanced = []
        for index in range(10):
            balanced.append(
                {
                    "class_id": "boletus_edulis",
                    "inat_observer": f"login_{index}",
                    "author": f"Author {index}",
                    "license": "CC BY 4.0",
                    "license_normalized": "cc-by-4.0",
                    "license_url": "https://creativecommons.org/licenses/by/4.0/",
                    "image_url": f"https://images.example.test/boletus_edulis/{index}.jpg",
                    "file": f"boletus_edulis_{index}.jpg",
                    "occurrence_key": f"boletus_edulis-{index}",
                    "inat_photo_id": str(index),
                    "inat_observation_id": f"obs-{index}",
                }
            )
        splits = {"train": balanced[:6], "val": balanced[6:8], "test": balanced[8:]}
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            write_prepare_outputs(
                out,
                prepared=balanced,
                splits=splits,
                dropped=dropped,
                identity_dropped=identity_dropped,
                skipped=skipped + silent,
                withheld=[],
                salt=FIXTURE_SALT,
                share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
                model_png_size=224,
            )
            report = json.loads((out / "dedup_report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["rejected_per_class"], counted)
        reported = sum(count for reasons in report["rejected_per_class"].values() for count in reasons.values())
        self.assertEqual(reported, len(skipped) + len(identity_dropped) + len(dropped) + len(silent))

    def test_nc_sa_nd_and_nc_nd_are_rejected_for_training(self):
        from evaluate import attributions_complete
        from license_policy import allowed_for_training

        rejected = (
            ("cc-by-nc-sa-4.0", "CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"),
            ("cc-by-nd-4.0", "CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/"),
            ("cc-by-nc-nd-4.0", "CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"),
        )
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            path = artifact_dir / "attributions.jsonl"
            lines = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
            for license_id, text, url in rejected:
                self.assertFalse(allowed_for_training(license_id), license_id)
                self.assertFalse(
                    attributions_complete(
                        [
                            {
                                "creator": "Ada",
                                "license": text,
                                "license_normalized": license_id,
                                "license_url": url,
                                "image_url": "https://images.example.test/a.jpg",
                                "source_url": "https://example.test/a",
                            }
                        ]
                    ),
                    license_id,
                )
                blocked = [dict(line) for line in lines]
                blocked[0]["license"] = text
                blocked[0]["license_normalized"] = license_id
                blocked[0]["license_url"] = url
                path.write_text("".join(json.dumps(line) + "\n" for line in blocked), encoding="utf-8")
                ok, reasons = assess_shippable(report, artifact_dir)
                self.assertFalse(ok, license_id)
                self.assertTrue(any("license" in reason for reason in reasons), license_id)

    def test_versioned_cc_by_sa_rows_leave_the_release_shippable(self):
        """Share-alike does not cover weights (2026-10-23 12:17, variant B, register 0004)."""
        from license_policy import EXACT_LICENSE_USAGE, TRAINING_ONLY, allowed_for_display

        versions = ("1.0", "2.0", "2.5", "3.0", "4.0")
        for version in versions:
            license_id = f"cc-by-sa-{version}"
            self.assertEqual(EXACT_LICENSE_USAGE[license_id], TRAINING_ONLY, license_id)
            self.assertFalse(allowed_for_display(license_id), license_id)
        policy = (ROOT / "training" / "license_policy.py").read_text(encoding="utf-8")
        gates = (ROOT / "training" / "ship_gates.py").read_text(encoding="utf-8")
        self.assertIn("2026-10-23 12:17", policy)
        self.assertIn("not cover model weights", policy)
        self.assertNotIn("cc-by-sa", gates)
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            path = artifact_dir / "attributions.jsonl"
            lines = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
            for index, version in enumerate(versions):
                url = f"https://creativecommons.org/licenses/by-sa/{version}/"
                lines[index]["license"] = f"CC BY-SA {version}"
                lines[index]["license_normalized"] = f"cc-by-sa-{version}"
                lines[index]["license_url"] = url
                lines[index]["usage"] = "training_only"
            path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)

    def test_any_df20_row_blocks_release_even_if_consent_is_patched(self):
        from import_external import import_directory
        from license_policy import DF20_CONSENT_CONFIRMED, EXACT_LICENSE_USAGE, TRAINING_ONLY
        from prepare_data import _usable_records

        policy = (ROOT / "training" / "license_policy.py").read_text(encoding="utf-8")
        gates = (ROOT / "training" / "ship_gates.py").read_text(encoding="utf-8")
        self.assertFalse(DF20_CONSENT_CONFIRMED)
        self.assertEqual(EXACT_LICENSE_USAGE["df20"], TRAINING_ONLY)
        self.assertEqual(EXACT_LICENSE_USAGE["cc-by-nc-4.0"], TRAINING_ONLY)
        self.assertEqual(EXACT_LICENSE_USAGE["cc-by-sa-4.0"], TRAINING_ONLY)
        self.assertIs(inspect.signature(import_directory).parameters["include_df20"].default, False)
        self.assertIs(inspect.signature(_usable_records).parameters["include_df20"].default, False)
        self.assertIn("DF20_CONSENT_CONFIRMED = False", policy)
        self.assertIn("pending", policy.casefold())
        self.assertIn("Svampeatlas", policy)
        self.assertNotIn("if DF20_CONSENT_CONFIRMED", gates)
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            path = artifact_dir / "attributions.jsonl"
            lines = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
            lines[0]["license"] = "CC BY-NC 4.0"
            lines[0]["license_normalized"] = "cc-by-nc-4.0"
            lines[0]["license_url"] = "https://creativecommons.org/licenses/by-nc/4.0/"
            lines[0]["usage"] = "training_only"
            lines[1]["license"] = "CC BY-SA 4.0"
            lines[1]["license_normalized"] = "cc-by-sa-4.0"
            lines[1]["license_url"] = "https://creativecommons.org/licenses/by-sa/4.0/"
            lines[1]["usage"] = "training_only"
            path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            lines[2]["license_normalized"] = "df20"
            lines[2]["license"] = "DF20 training-only; no per-image licence"
            lines[2]["source"] = "df20"
            lines[2]["usage"] = "training_only"
            lines[2]["license_url"] = ""
            path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("experimental" in reason for reason in reasons))
            with patch("license_policy.DF20_CONSENT_CONFIRMED", True):
                ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("experimental" in reason for reason in reasons))

    def test_df20_gate_blocks_when_the_attribution_file_cannot_be_read(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)
            path = artifact_dir / "attributions.jsonl"
            path.unlink()
            missing = _df20_release_reasons(artifact_dir)
            self.assertTrue(any("missing" in reason for reason in missing))
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("missing" in reason for reason in reasons))
            path.write_text("{not json\n", encoding="utf-8")
            broken = _df20_release_reasons(artifact_dir)
            self.assertTrue(any("not valid jsonl" in reason for reason in broken))
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("not valid jsonl" in reason for reason in reasons))

    def test_df20_marker_alone_blocks_release(self):
        from component_share import is_df20_row

        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            path = artifact_dir / "attributions.jsonl"
            lines = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
            lines[0]["ImageUniqueID"] = "2237858559-1"
            self.assertNotEqual(lines[0].get("source"), "df20")
            self.assertNotEqual(lines[0].get("license_normalized"), "df20")
            self.assertTrue(is_df20_row(lines[0]))
            path.write_text("".join(json.dumps(line) + "\n" for line in lines), encoding="utf-8")
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("experimental" in reason for reason in reasons))

    def test_marker_only_df20_row_blocks_release_after_write_attribution_file(self):
        """A DF20 marker must still block after the real export writer, not only a hand-edited jsonl."""
        from component_share import is_df20_row
        from export_tflite import write_attribution_file

        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            coverage = report["coverage"]
            count = (
                sum(coverage["train_images"].values())
                + sum(coverage["val_images"].values())
                + sum(coverage["test_images"].values())
            )
            rows = []
            for index in range(count):
                rows.append(
                    {
                        "creator": "Ada",
                        "license": "CC BY 4.0",
                        "license_normalized": "cc-by-4.0",
                        "license_url": "https://creativecommons.org/licenses/by/4.0/",
                        "image_url": f"https://example.test/{index}.jpg",
                        "source_url": f"https://example.test/source/{index}",
                        "gbif_occurrence": f"https://www.gbif.org/occurrence/{index}",
                        "class_id": "boletus_edulis",
                        "file": f"images/{index}.jpg",
                    }
                )
            path = artifact_dir / "attributions.jsonl"
            write_attribution_file(rows, path)
            self.assertEqual(_df20_release_reasons(artifact_dir), [])
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertTrue(ok, reasons)

            marker = dict(rows[0])
            marker["ImageUniqueID"] = "2237858559-1"
            self.assertNotEqual(marker.get("source"), "df20")
            self.assertNotEqual(marker.get("license_normalized"), "df20")
            self.assertIsNone(marker.get("df20_image_id"))
            self.assertIsNone(marker.get("df20_image_path"))
            self.assertIsNone(marker.get("licence_note"))
            self.assertIsNone(marker.get("license_note"))
            self.assertIsNone(marker.get("dataset"))
            self.assertIsNone(marker.get("collection"))
            self.assertTrue(is_df20_row(marker))
            exported_rows = [marker, *rows[1:]]
            write_attribution_file(exported_rows, path)
            df20_reasons = _df20_release_reasons(artifact_dir)
            self.assertTrue(any("experimental" in reason for reason in df20_reasons), df20_reasons)
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("experimental" in reason for reason in reasons), reasons)

    def test_attribution_row_preserves_every_field_is_df20_row_reads(self):
        """Export and the DF20 check share one field tuple, so a new marker cannot be dropped."""
        import ast
        import textwrap

        from component_share import is_df20_row
        from export_tflite import attribution_row
        from publication import (
            DF20_DATASET_FIELDS,
            DF20_DETECTION_FIELDS,
            DF20_NORMALIZED_LICENSE_FIELD,
            DF20_NOTE_FIELDS,
            DF20_PRESENT_FIELDS,
            DF20_SOURCE_FIELD,
            _df20_marker,
        )

        def body_nodes(func):
            source = textwrap.dedent(inspect.getsource(func))
            func_def = ast.parse(source).body[0]
            body = func_def.body
            if (
                body
                and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)
            ):
                body = body[1:]
            return body

        def code_strings(func) -> set[str]:
            found = set()
            for node in body_nodes(func):
                for child in ast.walk(node):
                    if isinstance(child, ast.Constant) and isinstance(child.value, str):
                        found.add(child.value)
            return found

        def code_names(func) -> set[str]:
            found = set()
            for node in body_nodes(func):
                for child in ast.walk(node):
                    if isinstance(child, ast.Name):
                        found.add(child.id)
            return found

        self.assertEqual(
            DF20_DETECTION_FIELDS,
            (
                *DF20_PRESENT_FIELDS,
                *DF20_NOTE_FIELDS,
                *DF20_DATASET_FIELDS,
                DF20_NORMALIZED_LICENSE_FIELD,
            ),
        )
        self.assertEqual(len(DF20_DETECTION_FIELDS), len(set(DF20_DETECTION_FIELDS)))
        self.assertIn(DF20_SOURCE_FIELD, DF20_DATASET_FIELDS)
        self.assertEqual(code_strings(is_df20_row), {"", "df20"})
        self.assertEqual(code_strings(_df20_marker), {"df20"})
        self.assertEqual(
            code_names(is_df20_row),
            {
                "isinstance",
                "row",
                "dict",
                "source",
                "DF20_SOURCE_FIELD",
                "str",
                "normalized",
                "DF20_NORMALIZED_LICENSE_FIELD",
                "_df20_marker",
            },
        )
        self.assertEqual(
            code_names(_df20_marker),
            {
                "any",
                "row",
                "field",
                "DF20_PRESENT_FIELDS",
                "value",
                "DF20_NOTE_FIELDS",
                "isinstance",
                "str",
                "DF20_DATASET_FIELDS",
                "_DF20_DATASETS",
            },
        )
        export_source = inspect.getsource(attribution_row)
        self.assertIn("DF20_DETECTION_FIELDS", export_source)
        for field in DF20_DETECTION_FIELDS:
            self.assertNotIn(f'"{field}"', export_source)
            self.assertNotIn(f"'{field}'", export_source)

        def marker_value(field: str) -> str:
            if field in DF20_PRESENT_FIELDS:
                return "2237858559-1"
            if field in DF20_NOTE_FIELDS:
                return "DF20 training-only; no per-image licence"
            if field == DF20_SOURCE_FIELD:
                return "df20"
            if field in DF20_DATASET_FIELDS:
                return "Danish Fungi 2020"
            if field == DF20_NORMALIZED_LICENSE_FIELD:
                return "df20"
            raise AssertionError(field)

        base = {
            "creator": "Ada",
            "license": "CC BY 4.0",
            "license_normalized": "cc-by-4.0",
            "license_url": "https://creativecommons.org/licenses/by/4.0/",
            "image_url": "https://example.test/a.jpg",
            "source_url": "https://example.test/a",
            "file": "images/a.jpg",
            "class_id": "boletus_edulis",
        }
        self.assertFalse(is_df20_row(base))
        self.assertFalse(is_df20_row(attribution_row(base)))
        for field in DF20_DETECTION_FIELDS:
            row = dict(base)
            value = marker_value(field)
            row[field] = value
            self.assertTrue(is_df20_row(row), field)
            exported = attribution_row(row)
            self.assertEqual(exported.get(field), value, field)
            self.assertTrue(is_df20_row(exported), field)

    def test_missing_component_share_blockers_key_blocks_shipping(self):
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            report = self._passing_report(artifact_dir)
            del report["component_share_blockers"]
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("component_share_blockers" in reason for reason in reasons))
            report["component_share_blockers"] = ["boletus_edulis: acknowledged. The model is not shippable."]
            ok, reasons = assess_shippable(report, artifact_dir)
            self.assertFalse(ok)
            self.assertTrue(any("boletus_edulis" in reason for reason in reasons))

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
            "component_share_blockers": [],
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
        """A host that rejects photos is not an exhausted licensed pool.

        The fetch report for that unit omits gbif_licensed_count. The pool is
        under 50. rare_exception_applies is false for the report row, and it
        stays false even if a licensed count equal to accepted is supplied.
        The ship gate keeps the 50-photo floor in both cases.
        """
        import fetch_gbif
        from evaluate import attach_fetch_evidence, rare_exception_applies

        probes = load_manifest()["toxic_probes"]
        groups = [group for group in (probes.get("visual_groups") or []) if isinstance(group, dict)]
        audit = next(
            item for item in probes["rare_taxon_exceptions"] if item["taxon"] == "Lepiota brunneoincarnata"
        )
        cap = int(probes["per_taxon_cap"])
        pool_size = 16
        self.assertLess(pool_size, 50)
        self.assertLess(pool_size, cap)
        attempted = [{"downloaded": False, "_failure_reason": "http_404"} for _ in range(pool_size)]
        pool = fetch_gbif._Pool("Lepiota brunneoincarnata", attempted, None, None, {}, finite=True)
        pool.budget_exhausted = True
        stats = fetch_gbif._stats_for(pool, [], attempted, cap, dry_run=False)
        report_row = fetch_gbif._taxon_report_row(
            "Lepiota brunneoincarnata",
            cap,
            stats,
            "unknown_mushroom",
            audit.get("gbif_key"),
        )
        self.assertEqual(report_row["exhausted_reason"], "replacement_budget")
        self.assertEqual(report_row["pool"], pool_size)
        self.assertNotIn("gbif_licensed_count", report_row)

        merged = attach_fetch_evidence(
            [
                {
                    "taxon": "Lepiota brunneoincarnata",
                    "support": 16,
                    "accepted": 16,
                    "gbif_licensed_count": 16,
                    "exhausted_reason": "end_of_records",
                }
            ],
            {"taxa": [report_row]},
        )
        self.assertNotIn("gbif_licensed_count", merged[0])
        self.assertEqual(merged[0]["exhausted_reason"], "replacement_budget")
        self.assertFalse(rare_exception_applies("Lepiota brunneoincarnata", audit, merged[0], probes, groups))
        supplied = {
            "taxon": "Lepiota brunneoincarnata",
            "accepted": 16,
            "gbif_licensed_count": 16,
            "exhausted_reason": "replacement_budget",
            "support": 16,
            "confident_edible": 0,
        }
        self.assertFalse(rare_exception_applies("Lepiota brunneoincarnata", audit, supplied, probes, groups))

        cases = (
            (
                "report",
                {
                    "support": 16,
                    "accepted": merged[0]["accepted"],
                    "exhausted_reason": merged[0]["exhausted_reason"],
                },
            ),
            (
                "supplied",
                {
                    "support": 16,
                    "accepted": 16,
                    "gbif_licensed_count": 16,
                    "exhausted_reason": "replacement_budget",
                },
            ),
        )
        for label, patch in cases:
            reasons = poisonous_sample_reasons(
                self._quota_rows(**{"Lepiota brunneoincarnata": patch}),
                probes,
                expected_names=poisonous_heldout_taxa(),
            )
            self.assertTrue(
                any("Lepiota brunneoincarnata" in reason and "need 50" in reason for reason in reasons),
                label,
            )
            self.assertFalse(any("at least 5" in reason for reason in reasons), label)

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

    def test_quantized_export_keeps_train_calibration_and_existing_floors(self):
        source = (ROOT / "training" / "export_tflite.py").read_text(encoding="utf-8")
        gates = (ROOT / "training" / "ship_gates.py").read_text(encoding="utf-8")
        self.assertIn("train_rows = calibration_rows(splits)", source)
        self.assertIn("converter.representative_dataset = representative_dataset(train_rows, image_size, data_dir)", source)
        self.assertEqual(source.count("representative_dataset("), 2)
        self.assertNotIn("representative_dataset(val_rows", source)
        self.assertNotIn("representative_dataset(test_rows", source)
        self.assertIn("TFLITE_BUILTINS_INT8", source)
        self.assertIn("inference_input_type = tf.float32", source)
        self.assertIn("inference_output_type = tf.float32", source)
        self.assertIn('quantization == "dynamic"', source)
        self.assertIn('"--also-export"', source)
        self.assertIn('"--select-quantized"', source)
        self.assertIn("TFLITE_AGREEMENT_MIN", source)
        self.assertIn("agreement >= TFLITE_AGREEMENT_MIN", source)
        self.assertNotIn("agreement >= 0.99", source)
        self.assertNotIn("agreement >= 0.98", source)
        self.assertIn("copied_from_float", source)
        self.assertIn("energy_recalibration", source)
        self.assertIn("macro_top1 < 0.80", gates)
        self.assertIn("macro_top3 < 0.90", gates)
        self.assertIn("TFLITE_AGREEMENT_MIN = 0.99", gates)
        self.assertIn("agreement < TFLITE_AGREEMENT_MIN", gates)
        self.assertIn("high_risk_agreement < TFLITE_AGREEMENT_MIN", gates)
        self.assertIn("id_keep < 0.95", gates)
        self.assertIn("OPEN_SET_SAFE_MIN = 0.90", gates)
        self.assertIn("OPEN_SET_CONFIDENT_EDIBLE_MAX = 0.02", gates)
        splits = {
            "train": [{"file": "train.png", "split": "train"}],
            "val": [{"file": "val.png", "split": "val"}],
            "test": [{"file": "test.png", "split": "test"}],
        }
        self.assertEqual([row["file"] for row in calibration_rows(splits)], ["train.png"])
        with self.assertRaises(RuntimeError):
            representative_dataset([{"file": "test.png", "split": "test"}], 8, Path("."))
        with self.assertRaises(RuntimeError):
            representative_dataset([{"file": "val.png", "split": "val"}], 8, Path("."))
        with self.assertRaises(RuntimeError):
            calibration_rows({"train": [{"file": "hidden.png", "split": "test"}]})

    def test_quantized_model_is_selectable_only_when_existing_gates_pass(self):
        float_report = {"macro_top1": 0.91, "macro_top3": 0.97, "confident_toxic_as_edible": 0}
        quantized_report = {"macro_top1": 0.90, "macro_top3": 0.96, "confident_toxic_as_edible": 0}
        delta = metric_delta(float_report, quantized_report)
        self.assertAlmostEqual(delta["macro_top1"], -0.01)
        self.assertAlmostEqual(delta["macro_top3"], -0.01)
        self.assertEqual(delta["confident_toxic_as_edible"], 0)
        self.assertEqual(
            choose_install_target(select_quantized=False, primary_shippable=True, quantized_shippable=True),
            "primary",
        )
        self.assertEqual(
            choose_install_target(select_quantized=True, primary_shippable=True, quantized_shippable=True),
            "quantized",
        )
        self.assertEqual(
            choose_install_target(select_quantized=True, primary_shippable=True, quantized_shippable=False),
            "refuse",
        )
        self.assertEqual(
            choose_install_target(select_quantized=False, primary_shippable=False, quantized_shippable=True),
            "refuse",
        )
        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            passing = self._passing_report(artifact_dir)
            ok, reasons = assess_shippable(passing, artifact_dir)
            self.assertTrue(ok, reasons)
            payload = (artifact_dir / "mushrooms_model.tflite").read_bytes()
            gated, gate_reasons = assess_export(passing, payload, artifact_dir)
            self.assertTrue(gated, gate_reasons)
            lowered = json.loads(json.dumps(passing))
            lowered["macro_top1"] = 0.79
            refused, refuse_reasons = assess_export(lowered, payload, artifact_dir)
            self.assertFalse(refused)
            self.assertTrue(any("0.80" in reason for reason in refuse_reasons))
            still_ok, still_reasons = assess_shippable(passing, artifact_dir)
            self.assertTrue(still_ok, still_reasons)
            int8 = json.loads(json.dumps(passing))
            int8["tflite"]["quantization"] = "int8"
            int8["ood"]["energy_threshold"] = -4.0
            refused_int8, int8_reasons = assess_shippable(int8, artifact_dir)
            self.assertFalse(refused_int8)
            self.assertTrue(any("recalibrat" in reason for reason in int8_reasons))
            energies = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
            from evaluate import choose_threshold

            threshold = choose_threshold([{"class_id": "species", "energy": energy} for energy in energies])
            int8["ood"]["energy_threshold"] = threshold
            int8["energy_recalibration"] = {
                "quantization": "int8",
                "source": "validation_split",
                "copied_from_float": False,
                "threshold": threshold,
                "id_validation_energies": energies,
            }
            recalibrated, recalibrated_reasons = assess_shippable(int8, artifact_dir)
            self.assertTrue(recalibrated, recalibrated_reasons)
            copied = json.loads(json.dumps(int8))
            copied["energy_recalibration"]["copied_from_float"] = True
            copied["energy_recalibration"]["threshold"] = -4.0
            copied["ood"]["energy_threshold"] = -4.0
            copied_ok, copied_reasons = assess_shippable(copied, artifact_dir)
            self.assertFalse(copied_ok)
            self.assertTrue(any("do not carry over" in reason or "order statistic" in reason for reason in copied_reasons))

    def test_int8_threshold_matches_when_validation_includes_background(self):
        """Export and the int8 gate share the ID-only order statistic.

        A background energy above every ID energy would move the threshold if
        it were counted. Both paths skip it, so they stay equal.
        """
        from recognition_math import BACKGROUND_CLASS_ID

        id_rows = [{"class_id": "boletus_edulis", "energy": float(energy)} for energy in range(1, 9)]
        val_pred = id_rows + [{"class_id": BACKGROUND_CLASS_ID, "energy": 100.0}]
        export_threshold = choose_threshold(val_pred)
        stored = id_validation_energies(val_pred)
        gate_threshold = choose_threshold([{"class_id": "species", "energy": energy} for energy in stored])
        counted_background = choose_threshold(
            [{"class_id": "species", "energy": energy} for energy in [*stored, 100.0]]
        )
        self.assertEqual(stored, [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0])
        self.assertEqual(export_threshold, gate_threshold)
        self.assertEqual(export_threshold, 8.0)
        self.assertEqual(counted_background, 100.0)
        self.assertNotEqual(export_threshold, counted_background)
        reasons = _int8_energy_reasons(
            {
                "tflite": {"quantization": "int8"},
                "ood": {"energy_threshold": export_threshold},
                "energy_recalibration": {
                    "quantization": "int8",
                    "source": "validation_split",
                    "copied_from_float": False,
                    "threshold": export_threshold,
                    "id_validation_energies": stored,
                },
            }
        )
        self.assertEqual(reasons, [])

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
                ignore=_ignore_repo_copy(ROOT),
            )
            self.assertFalse((copy_root / "training" / "data").exists())
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
        with self._installed_repo_copy() as copy_root:
            labels = json.loads((copy_root / "assets" / "models" / "labels.json").read_text(encoding="utf-8"))
            self.assertEqual(labels["model_sha256"], hashlib.sha256(b"tflite-bytes").hexdigest())
            self.assertIsNone(labels["delegate_sample_sha256"])
            self.assertFalse(labels["delegate_release"]["android-gpu"]["passed"])
            self.assertFalse(labels["delegate_release"]["core-ml"]["passed"])
            self.assertEqual(labels["delegate_release"]["android-gpu"]["reason"], "not_measured")

    def test_repo_copy_ignores_training_data_and_secret_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "repo"
            (source / "training" / "data" / "images").mkdir(parents=True)
            (source / "training" / "data" / "images" / "a.jpg").write_bytes(b"jpg")
            (source / "training" / "data" / ".env").write_text("TOKEN=1\n", encoding="utf-8")
            (source / "training" / "prepare_data.py").write_text("print('ok')\n", encoding="utf-8")
            (source / "src" / "data").mkdir(parents=True)
            (source / "src" / "data" / "mushrooms.ts").write_text("export {}\n", encoding="utf-8")
            (source / ".env").write_text("EXPO_TOKEN=1\n", encoding="utf-8")
            (source / ".env.local").write_text("LOCAL=1\n", encoding="utf-8")
            (source / "google-service-account.json").write_text("{}\n", encoding="utf-8")
            (source / "certs").mkdir()
            (source / "certs" / "store.p12").write_bytes(b"p12")
            (source / "certs" / "readme.txt").write_text("keep\n", encoding="utf-8")
            dest = Path(tmp) / "copy"
            shutil.copytree(source, dest, ignore=_ignore_repo_copy(source))
            self.assertFalse((dest / "training" / "data").exists())
            self.assertTrue((dest / "training" / "prepare_data.py").is_file())
            self.assertEqual(
                (dest / "src" / "data" / "mushrooms.ts").read_text(encoding="utf-8"),
                "export {}\n",
            )
            self.assertFalse((dest / ".env").exists())
            self.assertFalse((dest / ".env.local").exists())
            self.assertFalse((dest / "google-service-account.json").exists())
            self.assertFalse((dest / "certs" / "store.p12").exists())
            self.assertTrue((dest / "certs" / "readme.txt").is_file())

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
