import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from train import balanced_class_weights
from sampling import (
    class_fetch_cap,
    collect_licensed_media,
    fill_regional_then_global,
    spread_per_taxon,
    thin_class_report,
)
from split import split_by_observation


def _accept(occurrence):
    return [{"occurrence_key": occurrence["key"], "media_index": index} for index in range(occurrence.get("photos") or 1)]


class SamplingTest(unittest.TestCase):
    def test_rare_class_gets_a_higher_weight(self):
        weights = balanced_class_weights([0, 0, 0, 1], 3)
        self.assertAlmostEqual(weights[1], 2.0)
        self.assertAlmostEqual(weights[0], 4 / 6)
        self.assertEqual(weights[2], 0.0)
        self.assertAlmostEqual(sum(weights[index] * count for index, count in ((0, 3), (1, 1))) / 4, 1.0)
    def test_occurrence_cap_keeps_two_photos(self):
        rows = collect_licensed_media(
            [{"key": 7, "photos": 5}],
            max_items=10,
            max_per_occurrence=2,
            seen=set(),
            accept_media=_accept,
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual({row["occurrence_key"] for row in rows}, {7})

    def test_global_fill_continues_until_the_class_cap(self):
        regional = [[{"key": index, "photos": 1} for index in range(50)]]
        world = [{"key": 1000 + index, "photos": 1} for index in range(20)]
        rows = fill_regional_then_global(
            regional,
            world,
            max_items=60,
            max_per_occurrence=1,
            accept_media=_accept,
        )
        self.assertEqual(len(rows), 60)
        self.assertEqual(sum(1 for row in rows if row["occurrence_key"] >= 1000), 10)
        again = collect_licensed_media(
            regional[0][:3],
            max_items=10,
            max_per_occurrence=1,
            seen={row["occurrence_key"] for row in rows},
            accept_media=_accept,
        )
        self.assertEqual(again, [])

    def test_per_taxon_cap_spreads_a_long_list(self):
        self.assertEqual(spread_per_taxon(2500, 68, 80), 36)
        self.assertEqual(spread_per_taxon(2, 70, 80), 1)

    def test_explicit_max_per_class_overrides_the_aggregate_cap(self):
        species = {"id": "boletus_edulis"}
        aggregate = {"id": "unknown_mushroom", "sampling": {"class_cap": 2500}}
        self.assertEqual(class_fetch_cap(species, None), 500)
        self.assertEqual(class_fetch_cap(aggregate, None), 2500)
        self.assertEqual(class_fetch_cap(aggregate, 2), 2)

    def test_thin_species_are_reported_without_inventing_photos(self):
        notes = thin_class_report(
            {
                "cortinarius_orellanus": {"accepted": 3},
                "cortinarius_rubellus": {"accepted": 0},
                "amanita_virosa": {"accepted": 80},
            }
        )
        by_id = {item["class_id"]: item for item in notes}
        self.assertEqual(by_id["cortinarius_orellanus"]["accepted"], 3)
        self.assertTrue(by_id["cortinarius_orellanus"]["below_species_train_floor"])
        self.assertFalse(by_id["amanita_virosa"]["below_species_train_floor"])
        self.assertEqual(by_id["cortinarius_rubellus"]["accepted"], 0)
        self.assertEqual(thin_class_report({"boletus_edulis": {"accepted": 10}}), [])

    def test_held_out_taxa_stay_in_the_test_split(self):
        records = []
        for occurrence in range(6):
            records.append(
                {
                    "class_id": "unknown_mushroom",
                    "occurrence_key": occurrence,
                    "held_out_taxon": occurrence >= 4,
                    "file": f"{occurrence}.jpg",
                }
            )
        splits = split_by_observation(records, val_ratio=0.15, test_ratio=0.15, seed=42)
        for name in ("train", "val"):
            for row in splits[name]:
                self.assertFalse(row["held_out_taxon"])
        held = [row for row in splits["test"] if row["held_out_taxon"]]
        self.assertEqual(sorted(row["occurrence_key"] for row in held), [4, 5])


if __name__ == "__main__":
    unittest.main()
