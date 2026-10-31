"""Per-class test and val shares stay near the requested ratio.

A component is one photographer (or one observation). It may cover many
classes. Variant A (Wojtek, 2026-10-23): it may enter test only when the
added rows do not push any of its classes past that class's test target.
The same budget check applies to val. ``TEST_SHARE_TOLERANCE`` (0.05) and
``MIN_TEST_COUNT`` (8) are the provisional ship gate for the achieved test
share and test count. Counts themselves never pass ``round(n * ratio)``.
"""

import sys
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prepare_data import write_prepare_outputs
from salt_fixture import FIXTURE_SALT
from split import (
    MIN_TEST_COUNT,
    TEST_SHARE_TOLERANCE,
    component_ids,
    measure_test_balance,
    split_by_observation,
    balance_blockers,
)

_MIN_COMPONENTS = 3


def _photo(class_id: str, observer: str, index: int, **extra) -> dict:
    row = {
        "class_id": class_id,
        "inat_observer": observer,
        "occurrence_key": f"{class_id}-{observer}-{index}",
        "inat_observation_id": f"obs-{class_id}-{observer}-{index}",
        "inat_photo_id": f"photo-{class_id}-{observer}-{index}",
        "file": f"{class_id}_{observer}_{index}.jpg",
        "image_url": f"https://images.example.test/{class_id}/{observer}/{index}.jpg",
    }
    row.update(extra)
    return row


def _singletons(class_id: str, count: int, prefix: str, **extra) -> list[dict]:
    return [_photo(class_id, f"{prefix}_{index}", index, **extra) for index in range(count)]


def _bundle(
    class_id: str,
    observer: str,
    count: int,
    *,
    start: int = 0,
    held_out: bool = False,
) -> list[dict]:
    """Several photos, one photographer: one component, even across classes."""
    extra = {"held_out_taxon": True} if held_out else {}
    return [_photo(class_id, observer, start + index, **extra) for index in range(count)]


def _split(records, **kwargs):
    kwargs.setdefault("val_ratio", 0.15)
    kwargs.setdefault("test_ratio", 0.15)
    kwargs.setdefault("seed", 42)
    kwargs.setdefault("salt", FIXTURE_SALT)
    return split_by_observation(records, **kwargs)


def _counts(splits, class_id: str) -> dict[str, int]:
    return {name: sum(1 for row in rows if row["class_id"] == class_id) for name, rows in splits.items()}


def _homes(splits, key) -> dict[str, set[str]]:
    found: dict[str, set[str]] = defaultdict(set)
    for name, rows in splits.items():
        for row in rows:
            found[key(row)].add(name)
    return found


def _files(splits) -> dict[str, list[str]]:
    return {name: [row["file"] for row in rows] for name, rows in splits.items()}


def _class_components(records) -> dict[str, set[str]]:
    grouped: dict[str, set[str]] = defaultdict(set)
    for row, cid in zip(records, component_ids(records, FIXTURE_SALT)):
        grouped[row["class_id"]].add(cid)
    return grouped


class SplitBalanceTest(unittest.TestCase):
    def test_tolerance_is_five_points_and_not_a_share_limit_change(self):
        from component_share import COMPONENT_SHARE_LIMIT

        self.assertEqual(TEST_SHARE_TOLERANCE, 0.05)
        self.assertEqual(MIN_TEST_COUNT, 8)
        self.assertEqual(COMPONENT_SHARE_LIMIT, 0.20)

    def test_multiclass_component_does_not_drag_later_classes_into_test(self):
        """The old loop admitted a component while ``test_count < test_target``.

        On 1e6f6e7 with seed 0 this fixture puts 58 of 80 ``zzz_later`` photos
        in test (target 12) and 9 of 28 ``aaa_first`` photos (target 4). The
        shared component is locked to test by the earlier class. Variant A
        refuses it: 8 exceeds the first target and 50 exceeds the later one.
        """
        shared = "prolific"
        records = [
            *_singletons("aaa_first", 20, "first"),
            *_bundle("aaa_first", shared, 8),
            *_singletons("zzz_later", 30, "later"),
            *_bundle("zzz_later", shared, 50),
        ]
        splits = _split(records, seed=0)
        later = _counts(splits, "zzz_later")
        self.assertLessEqual(
            later["test"],
            round(80 * 0.15),
            "on 1e6f6e7 seed 0, zzz_later test count is 58, above the target 12",
        )
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        homes = _homes(splits, lambda row: row["inat_observer"])
        self.assertEqual(homes[shared], {"train"})
        later = _counts(splits, "zzz_later")
        first = _counts(splits, "aaa_first")
        self.assertEqual(later["test"], round(80 * 0.15))
        self.assertEqual(later["val"], round(80 * 0.15))
        self.assertEqual(first["test"], round(28 * 0.15))
        self.assertEqual(first["val"], round(28 * 0.15))
        self._assert_band(splits, "zzz_later")
        self._assert_band(splits, "aaa_first")
        for seed in range(6):
            seeded = _split(records, seed=seed)
            self._assert_ceilings(records, seeded)
            self._assert_band(seeded, "zzz_later")
            self._assert_band(seeded, "aaa_first")
            self.assertEqual(_homes(seeded, lambda row: row["inat_observer"])[shared], {"train"})

    def test_large_single_class_component_does_not_overshoot_an_empty_bucket(self):
        records = [*_singletons("boletus_edulis", 60, "solo"), *_bundle("boletus_edulis", "whale", 40)]
        splits = _split(records)
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])["whale"], {"train"})
        counts = _counts(splits, "boletus_edulis")
        self.assertEqual(counts["test"], 15)
        self.assertEqual(counts["val"], 15)
        self._assert_band(splits, "boletus_edulis")

    def test_component_that_exceeds_one_class_stays_out_of_test_and_val(self):
        shared = "cross"
        records = [
            *_singletons("alpha_wide", 200, "wide"),
            *_bundle("alpha_wide", shared, 10),
            *_singletons("beta_thin", 20, "thin"),
            *_bundle("beta_thin", shared, 10),
        ]
        splits = _split(records)
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])[shared], {"train"})
        wide = _counts(splits, "alpha_wide")
        thin = _counts(splits, "beta_thin")
        self.assertEqual(wide["test"], round(210 * 0.15))
        self.assertEqual(wide["val"], round(210 * 0.15))
        self.assertEqual(thin["test"], round(30 * 0.15))
        self.assertEqual(thin["val"], round(30 * 0.15))
        self._assert_band(splits, "alpha_wide")
        self._assert_band(splits, "beta_thin")

    def test_multiclass_component_inside_every_budget_can_fill_test(self):
        shared = "modest"
        records = []
        for class_id in ("boletus_edulis", "amanita_muscaria", "cantharellus_cibarius"):
            records.extend(_singletons(class_id, 90, f"solo_{class_id}"))
            records.extend(_bundle(class_id, shared, 10))
        splits = _split(records)
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])[shared], {"test"})
        for class_id in ("boletus_edulis", "amanita_muscaria", "cantharellus_cibarius"):
            counts = _counts(splits, class_id)
            self.assertEqual(counts["test"], 15)
            self.assertEqual(counts["val"], 15)
            self._assert_band(splits, class_id)

    def test_per_class_shares_stay_inside_tolerance_where_the_tail_can_fill(self):
        records = []
        for class_id, singles, whale in (
            ("agaricus_campestris", 80, 25),
            ("morchella_esculenta", 70, 20),
            ("suillus_grevillei", 90, 30),
            ("neoboletus_luridiformis", 60, 18),
        ):
            records.extend(_singletons(class_id, singles, f"solo_{class_id}"))
            records.extend(_bundle(class_id, "one_author", whale))
        splits = _split(records)
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])["one_author"], {"train"})
        for class_id in ("agaricus_campestris", "morchella_esculenta", "suillus_grevillei", "neoboletus_luridiformis"):
            self._assert_band(splits, class_id)

    def test_blocked_component_never_enters_test_and_the_class_still_fills(self):
        shared = "gallery_author"
        records = []
        for class_id in ("amanita_phalloides", "boletus_edulis"):
            records.extend(_singletons(class_id, 90, f"solo_{class_id}"))
            bundle = _bundle(class_id, shared, 10)
            for row in bundle:
                row["gallery"] = True
            records.extend(bundle)
        splits = _split(records, test_blocked=lambda row: row.get("gallery") is True)
        self._assert_one_home(splits)
        self._assert_ceilings(records, splits)
        self.assertNotIn("test", _homes(splits, lambda row: row["inat_observer"])[shared])
        for class_id in ("amanita_phalloides", "boletus_edulis"):
            counts = _counts(splits, class_id)
            self.assertEqual(counts["test"], 15)
            self._assert_band(splits, class_id)
            for row in splits["test"]:
                self.assertFalse(row.get("gallery"))

    def test_fewer_than_three_components_stay_in_train(self):
        records = [_photo("rare_taxon", "ada", 1), _photo("rare_taxon", "bea", 2)]
        splits = _split(records)
        self.assertEqual({row["file"] for row in splits["train"]}, {row["file"] for row in records})
        self.assertEqual(splits["val"], [])
        self.assertEqual(splits["test"], [])

    def test_fewer_than_three_follows_a_component_placed_by_another_class(self):
        records = [
            _photo("rare_taxon", "ada", 1),
            _photo("rare_taxon", "bea", 2),
            _photo("common_taxon", "ada", 1),
            *_singletons("common_taxon", 19, "common"),
        ]
        splits = _split(records)
        self._assert_one_home(splits)
        ada = [row for rows in splits.values() for row in rows if row["inat_observer"] == "ada"]
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])["ada"], {"test"})
        self.assertEqual({row["class_id"] for row in ada}, {"rare_taxon", "common_taxon"})
        bea_home = _homes(splits, lambda row: row["inat_observer"])["bea"]
        self.assertEqual(bea_home, {"train"})
        common = _counts(splits, "common_taxon")
        self.assertLessEqual(common["test"], round(20 * 0.15))
        self.assertLessEqual(common["val"], round(20 * 0.15))

    def test_seed_is_deterministic_and_salt_does_not_move_rows(self):
        records = []
        for class_id in ("boletus_edulis", "amanita_muscaria", "cantharellus_cibarius"):
            records.extend(_singletons(class_id, 40, f"solo_{class_id}"))
            records.extend(_bundle(class_id, "medium_a", 8))
            records.extend(_bundle(class_id, "medium_b", 8))
        first = _split(records, seed=7)
        again = _split(records, seed=7)
        other_salt = _split(records, seed=7, salt=FIXTURE_SALT + "-other")
        self.assertEqual(_files(first), _files(again))
        self.assertEqual(_files(first), _files(other_salt))
        homes = set()
        for seed in range(12):
            splits = _split(records, seed=seed)
            self._assert_one_home(splits)
            self._assert_ceilings(records, splits)
            for class_id in ("boletus_edulis", "amanita_muscaria", "cantharellus_cibarius"):
                counts = _counts(splits, class_id)
                self.assertEqual(counts["test"], round(56 * 0.15))
                self.assertEqual(counts["val"], round(56 * 0.15))
                self._assert_band(splits, class_id)
            home_a = next(iter(_homes(splits, lambda row: row["inat_observer"])["medium_a"]))
            home_b = next(iter(_homes(splits, lambda row: row["inat_observer"])["medium_b"]))
            self.assertEqual({home_a, home_b}, {"test", "val"})
            homes.add(home_a)
        self.assertGreater(len(homes), 1)

    def test_uneven_components_still_respect_every_class_ceiling(self):
        records = []
        layout = {
            "class_a": 70,
            "class_b": 40,
            "class_c": 55,
            "class_d": 25,
        }
        for class_id, count in layout.items():
            records.extend(_singletons(class_id, count, f"solo_{class_id}"))
        records.extend(_bundle("class_a", "blob_ab", 22))
        records.extend(_bundle("class_b", "blob_ab", 16))
        records.extend(_bundle("class_b", "blob_bc", 9))
        records.extend(_bundle("class_c", "blob_bc", 14))
        records.extend(_bundle("class_c", "blob_cd", 6))
        records.extend(_bundle("class_d", "blob_cd", 11))
        records.extend(_bundle("class_a", "blob_all", 4))
        records.extend(_bundle("class_b", "blob_all", 4))
        records.extend(_bundle("class_c", "blob_all", 4))
        records.extend(_bundle("class_d", "blob_all", 4))
        for seed in (1, 2, 3, 9):
            splits = _split(records, seed=seed)
            self._assert_one_home(splits)
            self._assert_ceilings(records, splits)

    def test_component_that_fits_nowhere_stays_in_train_and_a_short_test_is_a_hard_stop(self):
        """61 of 64 photos are one component, the shape of cortinarius_orellanus.

        The real class was 61 of 72. Here the tail is only three photos, so
        the component cannot fit the test target and stays in train. Three
        leftover photos cannot fill a 15% test set of at least 8. That class
        is a prepare hard stop and a ship blocker, not a silent tiny test.
        """
        records = [
            *_bundle("cortinarius_orellanus", "one_author", 61),
            *_singletons("cortinarius_orellanus", 3, "other"),
        ]
        splits = _split(records)
        self.assertEqual(_homes(splits, lambda row: row["inat_observer"])["one_author"], {"train"})
        counts = _counts(splits, "cortinarius_orellanus")
        self.assertLess(counts["test"], MIN_TEST_COUNT)
        self.assertGreater(abs(counts["test"] / 64 - 0.15), TEST_SHARE_TOLERANCE)
        report = measure_test_balance(splits)
        self.assertIn("cortinarius_orellanus", report["hard_stop_classes"])
        self.assertTrue(report["per_class"]["cortinarius_orellanus"]["below_minimum"])
        self.assertTrue(report["per_class"]["cortinarius_orellanus"]["outside_tolerance"])
        self.assertTrue(any("not shippable" in item for item in report["ship_blockers"]))
        self._assert_prepare_writes_nothing(splits, records)

    def test_a_proportional_but_tiny_test_set_still_stops_prepare(self):
        records = _singletons("agaricus_campestris", 20, "solo")
        splits = _split(records)
        counts = _counts(splits, "agaricus_campestris")
        self.assertEqual(counts["test"], round(20 * 0.15))
        self.assertLess(counts["test"], MIN_TEST_COUNT)
        report = measure_test_balance(splits)
        self.assertTrue(report["per_class"]["agaricus_campestris"]["below_minimum"])
        self.assertFalse(report["per_class"]["agaricus_campestris"]["outside_tolerance"])
        self.assertIn("agaricus_campestris", report["hard_stop_classes"])
        self._assert_prepare_writes_nothing(splits, records)

    def test_hand_built_overshoot_is_reported_even_when_the_count_is_large(self):
        rows = [_photo("suillus_grevillei", f"solo_{index}", index) for index in range(40)]
        splits = {"train": rows[:16], "val": rows[16:20], "test": rows[20:]}
        report = measure_test_balance(splits)
        info = report["per_class"]["suillus_grevillei"]
        self.assertEqual(info["test_rows"], 20)
        self.assertTrue(info["outside_tolerance"])
        self.assertFalse(info["below_minimum"])
        self.assertIn("suillus_grevillei", report["hard_stop_classes"])
        self._assert_prepare_writes_nothing(splits, rows)

    def test_a_full_test_set_is_not_a_balance_hard_stop(self):
        records = _singletons("boletus_edulis", 80, "solo")
        splits = _split(records)
        counts = _counts(splits, "boletus_edulis")
        self.assertEqual(counts["test"], 12)
        report = measure_test_balance(splits)
        self.assertEqual(report["hard_stop_classes"], [])
        self.assertEqual(report["ship_blockers"], [])
        self.assertEqual(report["tolerance"], TEST_SHARE_TOLERANCE)
        self.assertEqual(report["minimum_test_count"], MIN_TEST_COUNT)
        info = report["per_class"]["boletus_edulis"]
        self.assertEqual(info["val_rows"], 12)
        self.assertEqual(info["val_share"], 12 / 80)

    def test_missing_test_balance_block_fails_closed(self):
        self.assertTrue(balance_blockers({}))
        self.assertTrue(balance_blockers({"component_share": {"ship_blockers": [], "hard_stop_classes": []}}))
        self.assertEqual(
            balance_blockers(
                {
                    "test_balance": {
                        "ratio": 0.15,
                        "tolerance": TEST_SHARE_TOLERANCE,
                        "minimum_test_count": MIN_TEST_COUNT,
                        "ship_blockers": [],
                        "hard_stop_classes": [],
                    }
                }
            ),
            [],
        )
        widened = balance_blockers(
            {
                "test_balance": {
                    "ratio": 0.15,
                    "tolerance": 0.50,
                    "minimum_test_count": MIN_TEST_COUNT,
                    "ship_blockers": [],
                    "hard_stop_classes": [],
                }
            }
        )
        self.assertTrue(any("TEST_SHARE_TOLERANCE" in item for item in widened))

    def test_held_out_rows_do_not_push_the_eligible_share_out_of_band(self):
        """Targets and the measured share both ignore held-out rows.

        Two hundred held-out photos would make the old target ``round(280 * 0.15) = 42``.
        After those rows are withheld, 42 of the 80 eligible photos would be a
        0.525 test share. The budget is the 80 eligible photos, so test and val
        stay at 12. Held-out photos that ride into test with another component
        stay in the split and still do not move the measured share.
        """
        records = [
            *_singletons("boletus_edulis", 80, "solo"),
            *_bundle("boletus_edulis", "held_author", 200, held_out=True),
        ]
        withheld: list[dict] = []
        splits = _split(records, withheld=withheld)
        self._assert_one_home(splits)
        counts = _counts(splits, "boletus_edulis")
        self.assertEqual(counts["test"], 12)
        self.assertEqual(counts["val"], 12)
        self.assertEqual(sum(counts.values()), 80)
        self.assertNotIn("held_author", _homes(splits, lambda row: row["inat_observer"]))
        self.assertEqual(len(withheld), 200)
        self.assertTrue(all(row.get("held_out_taxon") is True for row in withheld))
        report = measure_test_balance(splits)
        info = report["per_class"]["boletus_edulis"]
        self.assertEqual(info["rows"], 80)
        self.assertEqual(info["test_rows"], 12)
        self.assertEqual(info["test_share"], 12 / 80)
        self.assertEqual(info["val_rows"], 12)
        self.assertEqual(info["val_share"], 12 / 80)
        self.assertEqual(report["hard_stop_classes"], [])

        mixed = [
            *_singletons("cantharellus_cibarius", 70, "solo"),
            *_bundle("cantharellus_cibarius", "mixed_author", 10),
            *_bundle("cantharellus_cibarius", "mixed_author", 40, held_out=True, start=10),
        ]
        mixed_splits = _split(mixed)
        self.assertEqual(_homes(mixed_splits, lambda row: row["inat_observer"])["mixed_author"], {"test"})
        held_in_test = [
            row
            for row in mixed_splits["test"]
            if row["inat_observer"] == "mixed_author" and row.get("held_out_taxon") is True
        ]
        self.assertEqual(len(held_in_test), 40)
        mixed_counts = _counts(mixed_splits, "cantharellus_cibarius")
        self.assertEqual(mixed_counts["test"], 12 + 40)
        mixed_report = measure_test_balance(mixed_splits)
        mixed_info = mixed_report["per_class"]["cantharellus_cibarius"]
        self.assertEqual(mixed_info["rows"], 80)
        self.assertEqual(mixed_info["test_rows"], 12)
        self.assertEqual(mixed_info["test_share"], 12 / 80)
        self.assertEqual(mixed_info["val_rows"], 12)
        self.assertEqual(mixed_info["val_share"], 12 / 80)
        self.assertNotIn("cantharellus_cibarius", mixed_report["hard_stop_classes"])

    def test_tail_that_exactly_fills_test_leaves_val_empty(self):
        """Test is filled before val, so a tail the size of the test target leaves val empty.

        Five components of 17 photos are each too big for ``round(100 * 0.15) = 15``
        and each is 17% of the class, under the 0.20 component-share limit.
        Fifteen singletons fill test and nothing is left for val. Without an
        acknowledgement prepare stops. With one, prepare writes the files and
        the ship gate stays false.
        """
        from component_share import measure_component_share
        from ship_gates import assess_shippable

        records = []
        for blob in range(5):
            records.extend(_bundle("suillus_grevillei", f"blob_{blob}", 17))
        records.extend(_singletons("suillus_grevillei", 15, "tail"))
        splits = _split(records)
        counts = _counts(splits, "suillus_grevillei")
        self.assertEqual(counts, {"train": 85, "val": 0, "test": 15})
        balance = measure_test_balance(splits)
        info = balance["per_class"]["suillus_grevillei"]
        self.assertEqual(info["val_rows"], 0)
        self.assertEqual(info["val_share"], 0.0)
        self.assertFalse(info["outside_tolerance"])
        self.assertFalse(info["below_minimum"])
        self.assertEqual(balance["hard_stop_classes"], [])
        share = measure_component_share(splits, salt=FIXTURE_SALT, acknowledgements={})
        self.assertFalse(share["per_class"]["suillus_grevillei"]["over_limit"])
        self.assertTrue(share["per_class"]["suillus_grevillei"]["missing_val_or_test"])
        self.assertIn("suillus_grevillei", share["hard_stop_classes"])
        self._assert_prepare_writes_nothing(splits, records)

        reason = "the only photos that fit a split filled test, so val is empty"
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            manifest = write_prepare_outputs(
                directory,
                prepared=list(records),
                splits=splits,
                dropped=[],
                identity_dropped=[],
                skipped=[],
                withheld=[],
                salt=FIXTURE_SALT,
                share_config={
                    "limit": 0.20,
                    "acknowledgements": {"suillus_grevillei": reason},
                },
                model_png_size=224,
            )
            self.assertTrue((directory / "splits.json").is_file())
            self.assertTrue((directory / "dataset_manifest.json").is_file())
            self.assertEqual(manifest["component_share"]["hard_stop_classes"], [])
            self.assertEqual(manifest["test_balance"]["hard_stop_classes"], [])
            blockers = manifest["component_share"]["ship_blockers"]
            self.assertTrue(any("val has 0 rows" in item for item in blockers))
            self.assertTrue(any("Acknowledged" in item and "not shippable" in item for item in blockers))
            ok, reasons = assess_shippable(
                {
                    "component_share_blockers": blockers,
                    "test_balance_blockers": manifest["test_balance"]["ship_blockers"],
                },
                directory,
            )
            self.assertFalse(ok)
            self.assertTrue(any("val has 0 rows" in item and "not shippable" in item for item in reasons))

    def _assert_prepare_writes_nothing(self, splits, records) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            planted = (
                "splits.json",
                "dataset_manifest.json",
                "dedup_report.json",
                "attributions.dedup.jsonl",
            )
            for name in planted:
                (directory / name).write_text("{}", encoding="utf-8")
            with self.assertRaises(SystemExit) as raised:
                write_prepare_outputs(
                    directory,
                    prepared=list(records),
                    splits=splits,
                    dropped=[],
                    identity_dropped=[],
                    skipped=[],
                    withheld=[],
                    salt=FIXTURE_SALT,
                    share_config={"limit": 0.20, "acknowledgements": {}},
                    model_png_size=224,
                )
            self.assertIn("No split files were written", str(raised.exception))
            for name in planted:
                self.assertFalse((directory / name).exists(), name)

    def _assert_one_home(self, splits) -> None:
        for observer, names in _homes(splits, lambda row: row["inat_observer"]).items():
            self.assertEqual(len(names), 1, observer)

    def _assert_ceilings(self, records, splits, val_ratio=0.15, test_ratio=0.15) -> None:
        grouped = _class_components(records)
        for class_id, components in grouped.items():
            if len(components) < _MIN_COMPONENTS:
                continue
            counts = _counts(splits, class_id)
            total = sum(counts.values())
            self.assertEqual(total, sum(1 for row in records if row["class_id"] == class_id))
            self.assertLessEqual(counts["test"], round(total * test_ratio), class_id)
            self.assertLessEqual(counts["val"], round(total * val_ratio), class_id)

    def _assert_band(self, splits, class_id: str, val_ratio=0.15, test_ratio=0.15) -> None:
        counts = _counts(splits, class_id)
        total = sum(counts.values())
        for name, ratio in (("test", test_ratio), ("val", val_ratio)):
            share = counts[name] / total
            self.assertLessEqual(
                abs(share - ratio),
                TEST_SHARE_TOLERANCE,
                f"{class_id} {name} share {share:.3f} is outside ±{TEST_SHARE_TOLERANCE} of {ratio}",
            )


if __name__ == "__main__":
    unittest.main()
