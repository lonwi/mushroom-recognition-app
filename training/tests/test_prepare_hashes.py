"""Perceptual hashes stay equal to the pure-Python reference and resize once."""

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dedup import difference_hash_bits, perceptual_hash_bits
from prepare_data import _perceptual_hashes, _phash_from_gray32


def _reference_hashes(rgb: np.ndarray) -> tuple[int, int]:
    from PIL import Image

    gray = Image.fromarray(rgb, mode="RGB").convert("L")
    dhash_pixels = np.asarray(gray.resize((9, 8))).reshape(-1).tolist()
    dhash_grid = [dhash_pixels[offset : offset + 9] for offset in range(0, 72, 9)]
    phash_pixels = np.asarray(gray.resize((32, 32))).reshape(-1).tolist()
    phash_grid = [phash_pixels[offset : offset + 32] for offset in range(0, 1024, 32)]
    return difference_hash_bits(dhash_grid), perceptual_hash_bits(phash_grid)


class PerceptualHashTest(unittest.TestCase):
    def test_bits_match_the_pure_python_reference(self):
        rng = np.random.default_rng(0)
        images = [
            rng.integers(0, 256, size=(48, 64, 3), dtype=np.uint8),
            rng.integers(0, 256, size=(180, 240, 3), dtype=np.uint8),
            np.full((32, 32, 3), 40, dtype=np.uint8),
            np.zeros((17, 19, 3), dtype=np.uint8),
        ]
        gradient = np.arange(90 * 70 * 3, dtype=np.uint16).reshape(90, 70, 3) % 256
        images.append(gradient.astype(np.uint8))
        for image in images:
            self.assertEqual(_perceptual_hashes(image), _reference_hashes(image))

    def test_flat_grid_matches_the_reference_dct(self):
        for value in (0, 1, 10, 128, 255):
            grid = [[value] * 32 for _ in range(32)]
            self.assertEqual(_phash_from_gray32(np.asarray(grid)), perceptual_hash_bits(grid))
        ramp = [[(x * 3 + y * 5) % 256 for x in range(32)] for y in range(32)]
        self.assertEqual(_phash_from_gray32(np.asarray(ramp)), perceptual_hash_bits(ramp))

    def test_resize_runs_once_per_hash_not_once_per_row(self):
        from PIL import Image

        calls: list[tuple[int, int]] = []
        original = Image.Image.resize

        def wrapped(image, size, *args, **kwargs):
            calls.append(tuple(size))
            return original(image, size, *args, **kwargs)

        Image.Image.resize = wrapped
        try:
            rgb = np.zeros((40, 50, 3), dtype=np.uint8)
            _perceptual_hashes(rgb)
        finally:
            Image.Image.resize = original
        self.assertEqual(calls, [(9, 8), (32, 32)])


if __name__ == "__main__":
    unittest.main()
