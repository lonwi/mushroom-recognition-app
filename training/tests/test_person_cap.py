"""Per-person cap inside one class, applied by prepare before the split.

The pending limit is min(60, max(10, round(0.10 * N))). N is the number of
rows of that class still eligible after dedup. This file's first test shows
that prepare on main keeps a person who has 61 of 72 rows.
"""

import sys
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dedup import dedup_by_identity, dedup_records
from split import person_identity_keys


def _row(class_id: str, observer: str, index: int, *, observation: str) -> dict:
    return {
        "class_id": class_id,
        "inat_observer": observer,
        "author": "",
        "license": "CC BY 4.0",
        "image_url": f"https://images.example.test/{class_id}/{observer}/{index}.jpg",
        "file": f"{class_id}-{observer}-{index}.jpg",
        "inat_photo_id": f"{class_id}-{index}",
        "inat_observation_id": observation,
        "occurrence_key": f"{class_id}-{observation}-{index}",
        "sha256": f"sha-{class_id}-{index}",
        "bytes": 100 + index,
    }


def _one_person_61_of_72() -> list[dict]:
    """72 eligible rows. Ada Hunter owns 61, each other person owns one."""
    rows = []
    photo = 0
    for observation in range(20):
        for _frame in range(3):
            rows.append(
                _row(
                    "cortinarius_orellanus",
                    "Ada Hunter",
                    photo,
                    observation=f"ada-obs-{observation}",
                )
            )
            photo += 1
    rows.append(
        _row("cortinarius_orellanus", "Ada Hunter", photo, observation="ada-obs-20")
    )
    for index in range(11):
        rows.append(
            _row(
                "cortinarius_orellanus",
                f"other-{index}",
                1000 + index,
                observation=f"other-obs-{index}",
            )
        )
    return rows


def _rows_prepare_splits_today(rows: list[dict]) -> list[dict]:
    """What prepare passes to the split: merged rows after both dedup passes.

    There is no per-person cap on this path.
    """
    deduped, identity_dropped = dedup_by_identity(rows)
    if identity_dropped:
        raise AssertionError(identity_dropped)
    kept, near_dropped = dedup_records(deduped)
    if near_dropped:
        raise AssertionError(near_dropped)
    return kept


class PersonCapTest(unittest.TestCase):
    def test_prepare_lets_one_person_hold_61_of_72_rows(self):
        rows = _one_person_61_of_72()
        kept = _rows_prepare_splits_today(rows)
        self.assertEqual(len(kept), 72)
        counts: Counter[str] = Counter()
        for row in kept:
            keys = person_identity_keys(row)
            self.assertEqual(keys, [f"person:{row['inat_observer'].casefold()}"])
            counts[keys[0]] += 1
        eligible = sum(1 for row in kept if row["class_id"] == "cortinarius_orellanus")
        cap = min(60, max(10, round(0.10 * eligible)))
        self.assertEqual(eligible, 72)
        self.assertEqual(cap, 10)
        self.assertLessEqual(counts["person:ada hunter"], cap)


if __name__ == "__main__":
    unittest.main()
