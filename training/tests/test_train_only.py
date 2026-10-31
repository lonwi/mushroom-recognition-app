"""Commons category photos are training-only and must not leak a linking key.

Owner decision A (#74): a row with ``source`` ``commons_category`` may be
used for training and must not remain in val or test. The splitter still
assigns each identity component once. Linking keys are unchanged. When that
component lands in val or test, the train-only rows are dropped from the run
with reason ``train_only_in_heldout_component``. They are not moved to train:
a shared author or observation would then sit in two splits.

Train-only rows do not count toward val or test budgets. Thresholds stay
where they are.
"""

import sys
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path

_TESTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_TESTS.parent))
sys.path.insert(0, str(_TESTS))

from component_share import COMPONENT_SHARE_LIMIT
from dataset_manifest import build_dataset_manifest
from prepare_data import write_prepare_outputs
from salt_fixture import FIXTURE_SALT
from split import (
    MIN_TEST_COUNT,
    TEST_SHARE_TOLERANCE,
    TEST_SPLIT_RATIO,
    VAL_SPLIT_RATIO,
    component_ids,
    identity_keys,
    measure_test_balance,
    split_by_observation,
)
from test_split_balance import _bundle, _counts, _photo, _singletons

_DROP_REASON = "train_only_in_heldout_component"
_REASON = "commons_category"


def _split(records, **kwargs):
    dropped: list[dict] = kwargs.pop("train_only_dropped", None)
    if dropped is None:
        dropped = []
    kwargs.setdefault("val_ratio", VAL_SPLIT_RATIO)
    kwargs.setdefault("test_ratio", TEST_SPLIT_RATIO)
    kwargs.setdefault("seed", 42)
    kwargs.setdefault("salt", FIXTURE_SALT)
    splits = split_by_observation(records, train_only_dropped=dropped, **kwargs)
    return splits, dropped


def _train_only(row: dict) -> bool:
    reason = row.get("train_only_reason")
    if isinstance(reason, str) and reason.strip():
        return True
    source = row.get("source")
    return isinstance(source, str) and source.strip().casefold() == _REASON


class CommonsCategoryTrainOnlyTest(unittest.TestCase):
    def test_thresholds_stay_put(self):
        self.assertEqual(TEST_SPLIT_RATIO, 0.15)
        self.assertEqual(VAL_SPLIT_RATIO, 0.15)
        self.assertEqual(TEST_SHARE_TOLERANCE, 0.05)
        self.assertEqual(MIN_TEST_COUNT, 8)
        self.assertEqual(COMPONENT_SHARE_LIMIT, 0.20)

    def test_no_train_only_row_in_val_or_test_and_linking_keys_stay_together(self):
        """A component that lands in test drops its commons row instead of moving it.

        Every component carries one commons photo, so train-only count does not
        put a cleaner component ahead of this author. The largest component is
        placed first and fits test. Its commons photo is dropped. The author's
        other photos, including the shared observation, stay in test.
        """
        bundle = _bundle("boletus_edulis", "shared_author", 10)
        bundle[0]["source"] = "Commons_Category"
        bundle[0]["inat_observation_id"] = bundle[1]["inat_observation_id"]
        records = []
        for index in range(20):
            group = _bundle("boletus_edulis", f"peer_{index}", 5)
            group[0]["source"] = "commons_category"
            records.extend(group)
        records.extend(bundle)
        splits, dropped = _split(records)

        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertNotIn("train_only_reason", bundle[0])
        authored = [row for row in dropped if row["file"] == bundle[0]["file"]]
        self.assertEqual(len(authored), 1)
        self.assertEqual(authored[0]["drop_reason"], _DROP_REASON)
        self.assertEqual(authored[0]["train_only_reason"], _REASON)
        self.assertEqual(authored[0]["assigned_split"], "test")
        self.assertNotIn(bundle[0]["file"], self._files(splits))
        sibling_files = {row["file"] for row in bundle[1:]}
        self.assertTrue(sibling_files <= {row["file"] for row in splits["test"]})
        self.assertEqual(self._homes(splits)["shared_author"], {"test"})
        observation = f"inat_observation:{bundle[1]['inat_observation_id']}"
        self.assertEqual(self._key_homes(splits)[observation], {"test"})
        self.assertTrue(all(row["drop_reason"] == _DROP_REASON for row in dropped))

        manifest = build_dataset_manifest(
            splits,
            salt=FIXTURE_SALT,
            share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
            train_only_dropped=dropped,
        )
        block = manifest["train_only"]
        self.assertEqual(block["dropped"]["reason"], _DROP_REASON)
        self.assertEqual(block["dropped"]["per_class"]["boletus_edulis"], len(dropped))
        self.assertEqual(block["rows"], block["in_train"]["rows"] + block["dropped"]["rows"])
        self.assertEqual(block["reasons"], {_REASON: block["rows"]})
        self.assertNotIn("train_only_reason", block)
        balance = manifest["test_balance"]["per_class"]["boletus_edulis"]
        eligible = 20 * 4 + 9
        self.assertEqual(balance["rows"], eligible)
        self.assertEqual(balance["test_rows"], round(eligible * TEST_SPLIT_RATIO))
        self.assertEqual(balance["train_only_rows"], block["in_train"]["rows"])
        self.assertNotIn("boletus_edulis", manifest["test_balance"]["hard_stop_classes"])

    def test_shared_observation_stays_in_one_split_when_the_budget_is_met(self):
        """Clean photos fill val and test, so the linked pair stays in train together."""
        regular = _photo("boletus_edulis", "ada", 1)
        commons = _photo("boletus_edulis", "bea", 2, source="commons_category")
        commons["inat_observation_id"] = regular["inat_observation_id"]
        records = [*_singletons("boletus_edulis", 90, "solo"), regular, commons]
        splits, dropped = _split(records)

        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertEqual(dropped, [])
        self.assertNotIn("train_only_reason", commons)
        homes = self._homes(splits)
        self.assertEqual(homes["ada"], {"train"})
        self.assertEqual(homes["bea"], {"train"})
        kept = [row for row in splits["train"] if row["inat_observer"] == "bea"]
        self.assertEqual(kept[0]["train_only_reason"], _REASON)
        observation = f"inat_observation:{regular['inat_observation_id']}"
        self.assertEqual(self._key_homes(splits)[observation], {"train"})

    def test_explicit_train_only_reason_is_dropped_with_its_component(self):
        bundle = _bundle("cantharellus_cibarius", "explicit_author", 10)
        bundle[0]["train_only_reason"] = _REASON
        bundle[0]["source"] = "inat"
        records = []
        for index in range(20):
            group = _bundle("cantharellus_cibarius", f"peer_{index}", 5)
            group[0]["train_only_reason"] = _REASON
            records.extend(group)
        records.extend(bundle)
        splits, dropped = _split(records)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        authored = [row for row in dropped if row["file"] == bundle[0]["file"]]
        self.assertEqual(len(authored), 1)
        self.assertEqual(authored[0]["drop_reason"], _DROP_REASON)
        self.assertEqual(self._homes(splits)["explicit_author"], {"test"})
        self.assertNotIn(bundle[0]["file"], self._files(splits))

    def test_commons_category_in_a_train_component_stays_in_train(self):
        bundle = _bundle("boletus_edulis", "whale", 40)
        bundle[0]["source"] = "commons_category"
        records = [*_singletons("boletus_edulis", 60, "solo"), *bundle]
        splits, dropped = _split(records)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertEqual(dropped, [])
        self.assertEqual(self._homes(splits)["whale"], {"train"})
        kept = [row for row in splits["train"] if row["file"] == bundle[0]["file"]]
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["train_only_reason"], _REASON)

    def test_train_only_rows_do_not_count_toward_val_or_test_budgets(self):
        records = [
            *_singletons("boletus_edulis", 80, "solo"),
            *_singletons("boletus_edulis", 200, "commons", source="commons_category"),
        ]
        splits, dropped = _split(records)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertEqual(dropped, [])
        counts = _counts(splits, "boletus_edulis")
        commons_in_train = [row for row in splits["train"] if _train_only(row)]
        self.assertEqual(len(commons_in_train), 200)
        self.assertTrue(all(row["train_only_reason"] == _REASON for row in commons_in_train))
        eligible_test = sum(1 for row in splits["test"] if not _train_only(row))
        eligible_val = sum(1 for row in splits["val"] if not _train_only(row))
        self.assertEqual(eligible_test, round(80 * TEST_SPLIT_RATIO))
        self.assertEqual(eligible_val, round(80 * VAL_SPLIT_RATIO))
        self.assertNotEqual(counts["test"], round(280 * TEST_SPLIT_RATIO))
        report = measure_test_balance(splits)
        info = report["per_class"]["boletus_edulis"]
        self.assertEqual(info["rows"], 80)
        self.assertEqual(info["test_rows"], 12)
        self.assertEqual(info["train_only_rows"], 200)
        self.assertEqual(report["hard_stop_classes"], [])

    def test_excluding_train_only_rows_still_stops_a_test_set_below_the_minimum(self):
        """Six eligible photos cannot fill a test set of 8. The minimum stays 8.

        Eighty ordinary photos would clear the minimum. Seventy-four of them
        are commons category rows, so they are not a val or test budget.
        """
        records = [
            *_singletons("agaricus_campestris", 6, "solo"),
            *_singletons("agaricus_campestris", 74, "commons", source="commons_category"),
        ]
        splits, dropped = _split(records)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertEqual(dropped, [])
        report = measure_test_balance(splits)
        info = report["per_class"]["agaricus_campestris"]
        self.assertEqual(info["rows"], 6)
        self.assertLess(info["test_rows"], MIN_TEST_COUNT)
        self.assertTrue(info["below_minimum"])
        self.assertIn("agaricus_campestris", report["hard_stop_classes"])
        self.assertTrue(any("minimum 8" in item for item in report["ship_blockers"]))
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for name in ("splits.json", "dataset_manifest.json", "dedup_report.json", "attributions.dedup.jsonl"):
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
                    train_only_dropped=dropped,
                    salt=FIXTURE_SALT,
                    share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
                    model_png_size=224,
                )
            self.assertIn("No split files were written", str(raised.exception))
            self.assertFalse((directory / "splits.json").exists())

    def test_gallery_block_still_keeps_the_component_out_of_test(self):
        bundle = _bundle("amanita_phalloides", "gallery_author", 10)
        for row in bundle:
            row["gallery"] = True
        bundle[0]["source"] = "commons_category"
        records = [*_singletons("amanita_phalloides", 90, "solo"), *bundle]
        splits, dropped = _split(records, test_blocked=lambda row: row.get("gallery") is True)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        for row in splits["test"]:
            self.assertFalse(row.get("gallery"))
        self.assertEqual(dropped, [])
        self.assertEqual(self._homes(splits)["gallery_author"], {"train"})
        kept = [row for row in splits["train"] if row["file"] == bundle[0]["file"]]
        self.assertEqual(kept[0]["train_only_reason"], _REASON)

    def test_commons_heavy_component_stays_in_train_when_the_budget_is_met(self):
        """One normal photo plus many commons rows must not be placed first.

        Counting every row would put this component ahead of the singletons
        and into test, then drop the commons photos. Fewer train-only rows
        win, the singletons fill val and test, and nothing is dropped.
        """
        heavy = _bundle("boletus_edulis", "commons_heavy", 41)
        for row in heavy[1:]:
            row["source"] = "commons_category"
        self.assertGreater(len(heavy), 1)
        records = [*_singletons("boletus_edulis", 80, "solo"), *heavy]
        splits, dropped = _split(records)
        self._assert_no_train_only_held_out(splits)
        self._assert_linking_keys_once(splits)
        self.assertEqual(dropped, [])
        self.assertEqual(self._homes(splits)["commons_heavy"], {"train"})
        train_files = {row["file"] for row in splits["train"]}
        self.assertTrue({row["file"] for row in heavy} <= train_files)
        manifest = build_dataset_manifest(
            splits,
            salt=FIXTURE_SALT,
            share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
            train_only_dropped=dropped,
        )
        self.assertEqual(manifest["train_only"]["dropped"]["rows"], 0)
        self.assertEqual(manifest["train_only"]["dropped"]["per_class"], {})
        self.assertEqual(manifest["train_only"]["in_train"]["per_class"]["boletus_edulis"], 40)
        self.assertEqual(manifest["train_only"]["reasons"], {_REASON: 40})
        info = manifest["test_balance"]["per_class"]["boletus_edulis"]
        eligible = 81
        self.assertEqual(info["rows"], eligible)
        self.assertEqual(info["test_rows"], round(eligible * TEST_SPLIT_RATIO))
        self.assertEqual(info["val_rows"], round(eligible * VAL_SPLIT_RATIO))
        self.assertNotIn("boletus_edulis", manifest["test_balance"]["hard_stop_classes"])

    def test_commons_category_only_class_stops_on_the_test_minimum(self):
        """Eighty category photos would clear the minimum if they counted as eligible.

        They are train-only, so the class has no val or test rows. Prepare
        stops because the test count is below 8. The minimum is not lowered.
        """
        records = _singletons("cortinarius_orellanus", 80, "commons", source="commons_category")
        splits, dropped = _split(records)
        self.assertEqual(splits["val"], [])
        self.assertEqual(splits["test"], [])
        self.assertEqual(dropped, [])
        self.assertEqual(len(splits["train"]), 80)
        report = measure_test_balance(splits)
        info = report["per_class"]["cortinarius_orellanus"]
        self.assertEqual(info["rows"], 0)
        self.assertEqual(info["test_rows"], 0)
        self.assertEqual(info["train_only_rows"], 80)
        self.assertTrue(info["below_minimum"])
        self.assertIn("cortinarius_orellanus", report["hard_stop_classes"])
        self.assertTrue(
            any("minimum 8" in item and "cortinarius_orellanus" in item for item in report["ship_blockers"])
        )
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for name in ("splits.json", "dataset_manifest.json", "dedup_report.json", "attributions.dedup.jsonl"):
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
                    train_only_dropped=dropped,
                    salt=FIXTURE_SALT,
                    share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
                    model_png_size=224,
                )
            self.assertIn("No split files were written", str(raised.exception))
            self.assertIn("cortinarius_orellanus", str(raised.exception))
            self.assertFalse((directory / "splits.json").exists())

    def test_commons_expert_described_is_not_train_only(self):
        records = _singletons(
            "boletus_edulis",
            80,
            "expert",
            source="commons_expert_described",
            id_confidence="commons_expert_described",
        )
        splits, dropped = _split(records)
        self.assertEqual(dropped, [])
        self.assertGreater(len(splits["val"]), 0)
        self.assertGreater(len(splits["test"]), 0)
        for name in ("val", "test"):
            for row in splits[name]:
                self.assertEqual(row["source"], "commons_expert_described")
                self.assertEqual(row["id_confidence"], "commons_expert_described")
                self.assertFalse(row.get("train_only_reason"))
        self.assertFalse(any(row.get("train_only_reason") for rows in splits.values() for row in rows))
        self._assert_linking_keys_once(splits)
        self._assert_no_train_only_held_out(splits)

    def test_an_ordinary_commons_file_is_not_train_only(self):
        records = _singletons("boletus_edulis", 80, "solo", source="commons")
        splits, dropped = _split(records)
        self.assertEqual(dropped, [])
        self.assertGreater(len(splits["test"]), 0)
        self.assertTrue(any(row.get("source") == "commons" for row in splits["test"]))
        self.assertFalse(any(row.get("train_only_reason") for row in splits["test"]))
        self._assert_linking_keys_once(splits)

    def _assert_no_train_only_held_out(self, splits) -> None:
        for name in ("val", "test"):
            for row in splits[name]:
                self.assertFalse(_train_only(row), f"{row.get('file')} landed in {name}")

    def _assert_linking_keys_once(self, splits) -> None:
        homes = self._key_homes(splits)
        for key, names in homes.items():
            self.assertEqual(len(names), 1, key)
        flat_rows: list[dict] = []
        flat_names: list[str] = []
        for name in ("train", "val", "test"):
            for row in splits[name]:
                flat_rows.append(row)
                flat_names.append(name)
        if not flat_rows:
            return
        seen: dict[str, str] = {}
        for cid, name in zip(component_ids(flat_rows, FIXTURE_SALT), flat_names):
            previous = seen.get(cid)
            self.assertTrue(previous is None or previous == name, cid)
            seen[cid] = name

    def _key_homes(self, splits) -> dict[str, set[str]]:
        found: dict[str, set[str]] = defaultdict(set)
        for name, rows in splits.items():
            for row in rows:
                for key in identity_keys(row):
                    found[key].add(name)
        return found

    def _homes(self, splits) -> dict[str, set[str]]:
        found: dict[str, set[str]] = defaultdict(set)
        for name, rows in splits.items():
            for row in rows:
                found[row["inat_observer"]].add(name)
        return found

    def _files(self, splits) -> set[str]:
        return {row["file"] for rows in splits.values() for row in rows}


if __name__ == "__main__":
    unittest.main()
