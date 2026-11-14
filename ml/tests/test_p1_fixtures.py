"""Fixture P1 ma pochodzić z ml/preprocess.py, nie z ręcznie wpisanych liczb."""

from __future__ import annotations

import base64
import importlib.util
import json
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))

from preprocess import model_rgb_uint8, preprocess_rgb_uint8, resize_area  # noqa: E402

FIXTURE = ROOT / "ml" / "fixtures" / "p1" / "parity.json"
GENERATOR = ROOT / "scripts" / "generate_p1_fixtures.py"


def _load_generator():
    spec = importlib.util.spec_from_file_location("generate_p1_fixtures", GENERATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError("brak skryptu fixture'ów P1")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _rgb(case: dict) -> np.ndarray:
    raw = base64.b64decode(case["rgbBase64"])
    return np.frombuffer(raw, dtype=np.uint8).reshape(case["height"], case["width"], 3).copy()


def _expected(case: dict) -> np.ndarray:
    raw = base64.b64decode(case["expectedFloat32Base64"])
    size = case["spec"]["inputSize"]
    return np.frombuffer(raw, dtype=np.float32).reshape(size["height"], size["width"], 3).copy()


class P1FixtureTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_file_matches_the_generator(self):
        fresh = json.loads(json.dumps(_load_generator().build_payload()))
        self.assertEqual(self.payload, fresh)
        self.assertIn("preprocess_rgb_uint8", self.payload["description"])

    def test_prototype_cases_match_preprocess_py(self):
        for case in self.payload["cases"]:
            if case["guarantee"] != "p1-preprocess-py":
                continue
            with self.subTest(case=case["name"]):
                got = preprocess_rgb_uint8(_rgb(case), case["modelSize"])
                np.testing.assert_array_equal(got, _expected(case))

    def test_derived_cases_use_preprocess_geometry(self):
        for case in self.payload["cases"]:
            if case["guarantee"] != "p1-derived":
                continue
            with self.subTest(case=case["name"]):
                rgb = _rgb(case)
                kind = case["derived"]
                norm = case["spec"]["normalization"]
                if kind == "mean_std":
                    uint8 = model_rgb_uint8(rgb, case["modelSize"])
                    got = (
                        (
                            uint8.astype(np.float64) * norm.get("pixelScale", 1.0)
                            - np.array(norm["mean"], dtype=np.float64)
                        )
                        / np.array(norm["std"], dtype=np.float64)
                    ).astype(np.float32)
                elif kind == "bgr":
                    got = preprocess_rgb_uint8(rgb, case["modelSize"])[..., ::-1]
                elif kind == "none_float":
                    got = (resize_area(rgb, case["modelSize"]) * norm["scale"] + norm["offset"]).astype(
                        np.float32
                    )
                else:
                    self.fail(f"nieznane pochodzenie {kind}")
                np.testing.assert_array_equal(got, _expected(case))


if __name__ == "__main__":
    unittest.main()
