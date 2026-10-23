"""A multi-class component must not drag a later class past its test target.

On 1e6f6e7 with seed 0 this fixture puts 58 of 80 ``zzz_later`` photos in
test (the rounded target is 12) and 9 of 28 ``aaa_first`` photos (target 4).
The shared photographer is locked to test by the earlier class, and the
greedy ``test_count < test_target`` check then admits the rest of that
component into the later class.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from salt_fixture import FIXTURE_SALT
from split import split_by_observation


def _photo(class_id: str, observer: str, index: int) -> dict:
    return {
        "class_id": class_id,
        "inat_observer": observer,
        "occurrence_key": f"{class_id}-{observer}-{index}",
        "inat_observation_id": f"obs-{class_id}-{observer}-{index}",
        "inat_photo_id": f"photo-{class_id}-{observer}-{index}",
        "file": f"{class_id}_{observer}_{index}.jpg",
        "image_url": f"https://images.example.test/{class_id}/{observer}/{index}.jpg",
    }


def _singletons(class_id: str, count: int, prefix: str) -> list[dict]:
    return [_photo(class_id, f"{prefix}_{index}", index) for index in range(count)]


def _bundle(class_id: str, observer: str, count: int) -> list[dict]:
    return [_photo(class_id, observer, index) for index in range(count)]


class SplitBalanceTest(unittest.TestCase):
    def test_multiclass_component_does_not_drag_later_classes_into_test(self):
        shared = "prolific"
        records = [
            *_singletons("aaa_first", 20, "first"),
            *_bundle("aaa_first", shared, 8),
            *_singletons("zzz_later", 30, "later"),
            *_bundle("zzz_later", shared, 50),
        ]
        splits = split_by_observation(records, val_ratio=0.15, test_ratio=0.15, seed=0, salt=FIXTURE_SALT)
        later = sum(1 for row in splits["test"] if row["class_id"] == "zzz_later")
        first = sum(1 for row in splits["test"] if row["class_id"] == "aaa_first")
        self.assertLessEqual(
            later,
            round(80 * 0.15),
            "on 1e6f6e7 seed 0, zzz_later test count is 58, above the target 12",
        )
        self.assertLessEqual(first, round(28 * 0.15))


if __name__ == "__main__":
    unittest.main()
