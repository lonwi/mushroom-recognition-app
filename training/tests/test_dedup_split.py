import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dedup import average_hash_bits, dedup_records, hamming
from split import split_by_observation


class DedupAndSplitTest(unittest.TestCase):
    def test_average_hash_and_exact_duplicate(self):
        split = [[0] * 8 for _ in range(4)] + [[255] * 8 for _ in range(4)]
        uniform = [[10] * 8 for _ in range(8)]
        self.assertEqual(hamming(average_hash_bits(split), average_hash_bits(uniform)), 32)
        self.assertEqual(hamming(average_hash_bits(split), average_hash_bits(split)), 0)

        records = [
            {"class_id": "boletus_edulis", "occurrence_key": 1, "sha256": "abc", "bytes": 10, "average_hash": 1},
            {"class_id": "boletus_edulis", "occurrence_key": 2, "sha256": "abc", "bytes": 50, "average_hash": 1},
            {"class_id": "boletus_edulis", "occurrence_key": 3, "sha256": "def", "bytes": 40, "average_hash": 1},
        ]
        kept, dropped = dedup_records(records, hash_distance=4)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["occurrence_key"], 2)
        self.assertEqual(len(dropped), 1)
        self.assertEqual(dropped[0]["drop_reason"], "perceptual_near_duplicate")

    def test_unknown_near_duplicates_do_not_cross_taxa(self):
        records = [
            {
                "class_id": "unknown_mushroom",
                "taxon_name": "Conocybe filaris",
                "sha256": "a",
                "bytes": 10,
                "average_hash": 1,
            },
            {
                "class_id": "unknown_mushroom",
                "taxon_name": "Amanita verna",
                "sha256": "b",
                "bytes": 10,
                "average_hash": 1,
            },
            {
                "class_id": "unknown_mushroom",
                "taxon_name": "Conocybe filaris",
                "sha256": "c",
                "bytes": 9,
                "average_hash": 1,
            },
        ]
        kept, dropped = dedup_records(records, hash_distance=4)
        self.assertEqual(sorted(row["taxon_name"] for row in kept), ["Amanita verna", "Conocybe filaris"])
        self.assertEqual(len(dropped), 1)
        self.assertEqual(dropped[0]["taxon_name"], "Conocybe filaris")

    def test_split_keeps_an_observation_together(self):
        records = []
        for occurrence in range(12):
            for photo in range(2):
                records.append(
                    {
                        "class_id": "amanita_phalloides",
                        "occurrence_key": occurrence,
                        "file": f"{occurrence}_{photo}.jpg",
                    }
                )
        splits = split_by_observation(records, val_ratio=0.15, test_ratio=0.15, seed=42)
        seen = {}
        for name, rows in splits.items():
            grouped = {}
            for row in rows:
                grouped.setdefault(row["occurrence_key"], []).append(row)
            for key, photos in grouped.items():
                self.assertNotIn(key, seen)
                self.assertEqual(len(photos), 2)
                seen[key] = name
        self.assertEqual(len(seen), 12)
        self.assertGreater(len(splits["train"]), len(splits["val"]))
        self.assertGreater(len(splits["train"]), len(splits["test"]))


if __name__ == "__main__":
    unittest.main()
