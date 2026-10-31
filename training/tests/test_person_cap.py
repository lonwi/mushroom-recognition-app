"""Per-author cap inside one class, applied by prepare before the split.

N is the number of rows of that class after dedup and before the cap.
The limit is min(60, max(10, round(0.10 * N))). The cap counts one key:
creator, otherwise rights_holder, normalized by split.person_identity_keys.
A co-collector on the same row does not take a slot.
"""

import json
import os
import random
import sys
import tempfile
import unittest
from collections import Counter, defaultdict
from pathlib import Path
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from manifest import ROOT
from person_cap import (
    CAP_FRACTION,
    CAP_MAX,
    CAP_MIN,
    MISSING_PERSON_KEY,
    N_DEFINITION,
    PERSON_CAP_SEED,
    apply_person_class_cap,
    cap_author_key,
    person_row_cap,
)
from prepare_data import _usable_records, main, records_for_split
from salt_fixture import FIXTURE_SALT
from sampling import MAX_PER_OCCURRENCE
from import_external import apply_collector_cap
from split import component_ids, observation_identity_keys, person_identity_keys, photo_identity_keys
from split_salt import SALT_ENV
import person_cap
import split


def _row(class_id: str, observer: str, index: int, *, observation: str, **extra) -> dict:
    row = {
        "class_id": class_id,
        "inat_observer": observer,
        "creator": observer,
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
    row.update(extra)
    return row


def _orellanus_61_of_72() -> list[dict]:
    """72 rows. Ada Hunter owns 61 across 21 observations. Eleven people own one."""
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
    rows.append(_row("cortinarius_orellanus", "Ada Hunter", photo, observation="ada-obs-20"))
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


def _boletus_fraction_binds() -> list[dict]:
    """150 rows. Boa has 40. round(0.10 * 150) = 15, under the ceiling of 60."""
    rows = [
        _row("boletus_edulis", "Boa", index, observation=f"boa-{index}")
        for index in range(40)
    ]
    for index in range(110):
        rows.append(
            _row("boletus_edulis", f"bolete-{index}", 5000 + index, observation=f"bolete-obs-{index}")
        )
    return rows


def _unknown_authors() -> list[dict]:
    rows = []
    for index in range(15):
        rows.append(
            _row(
                "amanita_muscaria",
                "",
                index,
                observation=f"unknown-{index}",
                author="Unknown",
                inat_observer="",
            )
        )
    return rows


def _under_cap_class() -> list[dict]:
    return [
        _row("cantharellus_cibarius", f"chanterelle-{index}", index, observation=f"chant-{index}")
        for index in range(4)
    ]


def _merged_fixture() -> list[dict]:
    return _orellanus_61_of_72() + _boletus_fraction_binds() + _unknown_authors() + _under_cap_class()


def _counts(rows: list[dict]) -> dict[str, Counter[str]]:
    found: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        class_id = str(row.get("class_id") or "")
        keys = person_identity_keys(row)
        if not keys:
            found[class_id][MISSING_PERSON_KEY] += 1
        else:
            for key in keys:
                found[class_id][key] += 1
    return found


def _class_rows(rows: list[dict], class_id: str) -> list[dict]:
    return [row for row in rows if row.get("class_id") == class_id]


def _author_class(report: dict, class_id: str) -> dict:
    matches = [item for item in report["author_cap_report"] if item["class_id"] == class_id]
    if len(matches) != 1:
        raise AssertionError(f"{class_id} appears {len(matches)} times in author_cap_report")
    return matches[0]


def _author_person(entry: dict, person_key: str, reason: str | None = None) -> dict:
    matches = [
        item
        for item in entry["persons"]
        if item["person_key"] == person_key and (reason is None or item["reason"] == reason)
    ]
    if len(matches) != 1:
        raise AssertionError(f"{person_key} appears {len(matches)} times")
    return matches[0]


class PersonCapContractTest(unittest.TestCase):
    def test_constants_and_existing_gates_stay_pinned(self):
        self.assertEqual(CAP_MAX, 60)
        self.assertEqual(CAP_MIN, 10)
        self.assertEqual(CAP_FRACTION, 0.10)
        self.assertEqual(PERSON_CAP_SEED, 42)
        self.assertEqual(person_row_cap(72), 10)
        self.assertEqual(person_row_cap(100), 10)
        self.assertEqual(person_row_cap(105), 10)
        self.assertEqual(person_row_cap(115), 12)
        self.assertEqual(person_row_cap(150), 15)
        self.assertEqual(person_row_cap(500), 50)
        self.assertEqual(person_row_cap(595), 60)
        self.assertEqual(person_row_cap(605), 60)
        self.assertEqual(person_row_cap(700), 60)
        self.assertEqual(person_row_cap(0), 10)
        source = (ROOT / "training" / "person_cap.py").read_text(encoding="utf-8")
        self.assertIn("CAP_MAX = 60", source)
        self.assertIn("CAP_MIN = 10", source)
        self.assertIn("CAP_FRACTION = 0.10", source)
        self.assertIn("PERSON_CAP_SEED = 42", source)
        share = (ROOT / "training" / "component_share.py").read_text(encoding="utf-8")
        self.assertIn("COMPONENT_SHARE_LIMIT = 0.20", share)
        self.assertEqual(MAX_PER_OCCURRENCE, 2)

    def test_cap_reuses_the_split_person_key(self):
        self.assertIs(person_cap.person_identity_keys, split.person_identity_keys)
        self.assertIs(person_cap.observation_identity_keys, observation_identity_keys)
        self.assertIs(person_cap.photo_identity_keys, photo_identity_keys)
        row = _row(
            "boletus_edulis",
            "Bea Collector",
            1,
            observation="shared-outing",
            creator="Ada Hunter",
            recorded_by="Cy Recorder",
            rights_holder="Dee Holder",
        )
        self.assertEqual(cap_author_key(row), ("person:ada hunter", False))
        self.assertEqual(
            person_identity_keys({"creator": "ADA HUNTER"}),
            ["person:ada hunter"],
        )
        self.assertCountEqual(
            person_identity_keys(row),
            [
                "person:ada hunter",
                "person:bea collector",
                "person:cy recorder",
                "person:dee holder",
            ],
        )
        holder_only = _row(
            "boletus_edulis",
            "Bea Collector",
            2,
            observation="holder-only",
            creator="",
            rights_holder="Ada Hunter",
        )
        self.assertEqual(cap_author_key(holder_only), ("person:ada hunter", False))
        placeholder = _row(
            "boletus_edulis",
            "",
            3,
            observation="placeholder",
            creator="Unknown",
            rights_holder="ADA HUNTER",
            inat_observer="",
        )
        self.assertEqual(cap_author_key(placeholder), ("person:ada hunter", False))
        self.assertIn("occupies a slot only for the author", person_cap.MISSING_PERSON_RULE)

    def test_cap_key_and_split_link_keys_are_separate_functions(self):
        """The cap reads creator, then rights_holder. The split still links co-collectors.

        ``cap_author_key`` and ``person_identity_keys`` are different functions.
        ``apply_collector_cap`` calls the cap function. It does not link rows,
        and it does not count ``inat_observer``.
        """
        self.assertIsNot(cap_author_key, person_identity_keys)
        self.assertIsNot(cap_author_key, split.person_identity_keys)
        link_source = (ROOT / "training" / "split.py").read_text(encoding="utf-8")
        link_body = link_source.split("def person_identity_keys(", 1)[1].split("\ndef ", 1)[0]
        self.assertLess(link_body.index("inat_observer"), link_body.index('"creator"'))
        self.assertIn("recordedBy", link_body)
        self.assertIn("collector_key", link_body)
        cap_body = (ROOT / "training" / "person_cap.py").read_text(encoding="utf-8")
        cap_fn = cap_body.split("def cap_author_key(", 1)[1].split("\ndef ", 1)[0]
        self.assertIn('for field in ("creator", "rights_holder")', cap_fn)
        self.assertNotIn("inat_observer", cap_fn)
        importer = (ROOT / "training" / "import_external.py").read_text(encoding="utf-8")
        collector_fn = importer.split("def apply_collector_cap(", 1)[1].split("\ndef ", 1)[0]
        self.assertIn("apply_person_class_cap", collector_fn)
        self.assertNotIn("inat_observer", collector_fn)
        self.assertNotIn("person_identity_keys", collector_fn)
        self.assertNotIn("30", collector_fn)

        ada = _row(
            "boletus_edulis",
            "Bea Collector",
            1,
            observation="bea-left",
            creator="Ada Hunter",
            recorded_by="Cy Recorder",
            collector_key="inat:bea collector",
        )
        cara = _row(
            "boletus_edulis",
            "Bea Collector",
            2,
            observation="bea-right",
            creator="Cara Hunter",
            collector_key="inat:bea collector",
        )
        ada_other_observer = _row(
            "boletus_edulis",
            "Dee Collector",
            3,
            observation="dee-obs",
            creator="Ada Hunter",
            collector_key="inat:dee collector",
        )
        self.assertEqual(cap_author_key(ada), ("person:ada hunter", False))
        self.assertEqual(cap_author_key(cara), ("person:cara hunter", False))
        self.assertEqual(cap_author_key(ada), cap_author_key(ada_other_observer))
        self.assertIn("person:bea collector", person_identity_keys(ada))
        self.assertIn("person:cy recorder", person_identity_keys(ada))
        self.assertNotEqual(person_identity_keys(ada), person_identity_keys(ada_other_observer))
        linked = component_ids([ada, cara], FIXTURE_SALT)
        self.assertEqual(linked[0], linked[1])
        unlinked = component_ids([ada_other_observer, cara], FIXTURE_SALT)
        self.assertNotEqual(unlinked[0], unlinked[1])

        crowd = [
            _row(
                "boletus_edulis",
                "Bea Collector",
                10 + index,
                observation=f"crowd-{index}",
                creator="Ada Hunter",
                collector_key="inat:bea collector",
            )
            for index in range(12)
        ]
        with patch("person_cap.cap_author_key", wraps=cap_author_key) as spy:
            kept, dropped = apply_collector_cap(crowd)
        self.assertGreaterEqual(spy.call_count, len(crowd))
        self.assertEqual(len(kept), 10)
        self.assertEqual(len(dropped), 2)
        self.assertTrue(all(cap_author_key(row) == ("person:ada hunter", False) for row in kept))
        self.assertTrue(all("person:bea collector" in person_identity_keys(row) for row in kept))

    def test_prepare_caps_after_merge_and_before_the_split(self):
        text = (ROOT / "training" / "prepare_data.py").read_text(encoding="utf-8")
        body = text.split("def main(", 1)[1].split("\ndef ", 1)[0]
        self.assertLess(body.index("_attribution_sources("), body.index("records_for_split("))
        self.assertLess(body.index("_usable_records("), body.index("records_for_split("))
        self.assertLess(body.index("records_for_split("), body.index("_cache_model_pngs("))
        self.assertLess(body.index("_cache_model_pngs("), body.index("assign_splits("))
        usable = text.split("def _usable_records_one(", 1)[1].split("\ndef ", 1)[0]
        appended = usable.index("records.append(row)")
        self.assertLess(usable.index("training_eligible("), appended)
        self.assertLess(usable.index('"unverified"'), appended)
        cap_step = text.split("def records_for_split(", 1)[1].split("\ndef ", 1)[0]
        self.assertLess(cap_step.index("dedup_by_identity("), cap_step.index("dedup_records("))
        self.assertLess(cap_step.index("dedup_records("), cap_step.index("apply_person_class_cap("))

    def test_n_146_caps_at_15_and_n_95_caps_at_10(self):
        """N is the class size after the unverified filter and both dedups.

        round(0.10 * 146) is 15 and round(0.10 * 95) is 10. Both sit inside
        [10, 60]. Prepare does not apply a per-observation cap of 3 before N.
        """
        from import_external import training_eligible

        self.assertEqual(round(CAP_FRACTION * 146), 15)
        self.assertEqual(round(CAP_FRACTION * 95), 10)
        self.assertEqual(person_row_cap(146), 15)
        self.assertEqual(person_row_cap(95), 10)
        self.assertIn("does not apply a per-observation cap of 3", N_DEFINITION)
        self.assertIn("before this author cap", N_DEFINITION)
        self.assertEqual(MAX_PER_OCCURRENCE, 2)

        def population(class_id: str, total: int, heavy: int, heavy_name: str) -> list[dict]:
            rows = [
                _row(class_id, heavy_name, index, observation=f"{class_id}-heavy-{index}")
                for index in range(heavy)
            ]
            rows.extend(
                _row(
                    class_id,
                    f"{class_id}-solo-{index}",
                    10_000 + index,
                    observation=f"{class_id}-solo-{index}",
                )
                for index in range(total - heavy)
            )
            return rows

        wide = population("n_wide", 146, 30, "Ada Hunter")
        narrow = population("n_narrow", 95, 20, "Boa")
        duplicates = []
        for index, row in enumerate(wide[:4] + narrow[:3]):
            duplicates.append({**row, "sha256": f"dup-sha-{index}", "file": f"dup-{index}.jpg", "bytes": 1})
        unverified = [
            _row("n_wide", "Ada Hunter", 50_000 + index, observation=f"unv-w-{index}", unverified=True)
            for index in range(9)
        ]
        unverified.extend(
            _row("n_narrow", "Boa", 60_000 + index, observation=f"unv-n-{index}", unverified=True)
            for index in range(6)
        )
        raw = wide + narrow + duplicates + unverified
        filtered = [row for row in raw if training_eligible(row)]
        self.assertEqual(len(filtered), 146 + 95 + len(duplicates))
        self.assertEqual(len(raw) - len(filtered), len(unverified))
        _capped, near, identity, _removed, report = records_for_split(filtered)
        self.assertEqual(len(identity), len(duplicates))
        self.assertEqual(near, [])
        self.assertIn("after the unverified filter", report["n_definition"])
        self.assertIn("before this author cap", report["n_definition"])

        wide_report = _author_class(report, "n_wide")
        self.assertEqual(wide_report["n"], 146)
        self.assertEqual(wide_report["cap"], person_row_cap(146))
        self.assertEqual(wide_report["cap"], 15)
        ada = _author_person(wide_report, "person:ada hunter")
        self.assertEqual(ada["kept"], 15)
        self.assertEqual(ada["cut"], 15)
        self.assertEqual(ada["reason"], "person_cap")
        wide_solos = [item for item in wide_report["persons"] if item["person_key"] != "person:ada hunter"]
        self.assertEqual(len(wide_solos), 116)
        self.assertTrue(all(item["kept"] == 1 and item["cut"] == 0 and item["reason"] is None for item in wide_solos))
        self.assertEqual(sum(item["kept"] + item["cut"] for item in wide_report["persons"]), 146)

        narrow_report = _author_class(report, "n_narrow")
        self.assertEqual(narrow_report["n"], 95)
        self.assertEqual(narrow_report["cap"], person_row_cap(95))
        self.assertEqual(narrow_report["cap"], 10)
        boa = _author_person(narrow_report, "person:boa")
        self.assertEqual(boa["kept"], 10)
        self.assertEqual(boa["cut"], 10)
        self.assertEqual(boa["reason"], "person_cap")
        narrow_solos = [item for item in narrow_report["persons"] if item["person_key"] != "person:boa"]
        self.assertEqual(len(narrow_solos), 75)
        self.assertTrue(all(item["kept"] == 1 and item["cut"] == 0 for item in narrow_solos))
        self.assertEqual(sum(item["kept"] + item["cut"] for item in narrow_report["persons"]), 95)
        self.assertEqual(person_row_cap(146 + 9), 16)

    def test_prepare_caps_one_person_at_61_of_72_rows(self):
        rows = _merged_fixture()
        before = json.dumps(rows, sort_keys=True)
        capped, _near, _identity, removed, report = records_for_split(rows)
        self.assertEqual(json.dumps(rows, sort_keys=True), before)
        self.assertTrue(all(row in rows for row in capped))
        self.assertEqual(report["cap_max"], 60)
        self.assertEqual(report["cap_min"], 10)
        self.assertEqual(report["cap_fraction"], 0.10)
        self.assertEqual(report["seed"], PERSON_CAP_SEED)
        self.assertIn("after both dedup passes", report["n_definition"])
        self.assertIn("no grandfathering", report["n_definition"])

        by_class = {item["class_id"]: item for item in report["classes"]}
        self.assertEqual(by_class["cortinarius_orellanus"], {
            "class_id": "cortinarius_orellanus",
            "n": 72,
            "cap": 10,
            "limit": 10,
            "kept": 21,
            "removed": 51,
        })
        self.assertEqual(by_class["boletus_edulis"]["n"], 150)
        self.assertEqual(by_class["boletus_edulis"]["cap"], 15)
        self.assertEqual(by_class["boletus_edulis"]["kept"], 125)
        self.assertEqual(by_class["boletus_edulis"]["removed"], 25)
        self.assertEqual(by_class["amanita_muscaria"], {
            "class_id": "amanita_muscaria",
            "n": 15,
            "cap": 10,
            "limit": 10,
            "kept": 10,
            "removed": 5,
        })
        self.assertEqual(by_class["cantharellus_cibarius"]["removed"], 0)
        self.assertEqual(by_class["cantharellus_cibarius"]["kept"], 4)

        pre = _counts(rows)
        post = _counts(capped)
        for class_id, counts in post.items():
            cap = person_row_cap(sum(pre[class_id].values()))
            for person_key, count in counts.items():
                self.assertLessEqual(count, cap, f"{class_id} {person_key}")
        self.assertEqual(post["cortinarius_orellanus"]["person:ada hunter"], 10)
        self.assertEqual(post["boletus_edulis"]["person:boa"], 15)
        self.assertEqual(post["amanita_muscaria"][MISSING_PERSON_KEY], 10)
        self.assertEqual(sum(post["cortinarius_orellanus"].values()) - post["cortinarius_orellanus"]["person:ada hunter"], 11)

        orellanus = _author_class(report, "cortinarius_orellanus")
        self.assertEqual(orellanus["n"], 72)
        self.assertEqual(orellanus["cap"], 10)
        self.assertEqual(sum(item["kept"] + item["cut"] for item in orellanus["persons"]), 72)
        ada_ids = sorted(
            row["inat_photo_id"]
            for row in removed
            if row.get("class_id") == "cortinarius_orellanus" and row.get("inat_observer") == "Ada Hunter"
        )
        self.assertEqual(_author_person(orellanus, "person:ada hunter"), {
            "person_key": "person:ada hunter",
            "kept": 10,
            "cut": 51,
            "reason": "person_cap",
            "ids": ada_ids,
        })
        self.assertEqual(len(ada_ids), 51)
        for item in orellanus["persons"]:
            if item["person_key"] == "person:ada hunter":
                continue
            self.assertEqual(item["kept"], 1)
            self.assertEqual(item["cut"], 0)
            self.assertIsNone(item["reason"])
            self.assertEqual(item["ids"], [])
        unknown_ids = sorted(
            row["inat_photo_id"] for row in removed if row.get("class_id") == "amanita_muscaria"
        )
        muscaria = _author_class(report, "amanita_muscaria")
        self.assertEqual(muscaria["n"], 15)
        self.assertEqual(muscaria["cap"], 10)
        self.assertEqual(_author_person(muscaria, MISSING_PERSON_KEY), {
            "person_key": MISSING_PERSON_KEY,
            "kept": 10,
            "cut": 5,
            "reason": "no_person_key",
            "ids": unknown_ids,
        })
        for row in _class_rows(capped, "amanita_muscaria"):
            self.assertEqual(person_identity_keys(row), [])
        self.assertEqual(len(removed), 51 + 25 + 5)
        self.assertTrue(all(row.get("drop_reason") for row in removed))
        self.assertNotIn("drop_reason", rows[0])

    def test_round_robin_spreads_ada_across_observations(self):
        rows = _orellanus_61_of_72()
        capped, removed, report = apply_person_class_cap(rows)
        ada = [row for row in capped if row["inat_observer"] == "Ada Hunter"]
        self.assertEqual(len(ada), 10)
        observations = [row["inat_observation_id"] for row in ada]
        self.assertEqual(len(set(observations)), 10)
        self.assertEqual(max(Counter(observations).values()), 1)
        photo_ids = [row["inat_photo_id"] for row in capped]
        reversed_kept, _reversed_removed, reversed_report = apply_person_class_cap(list(reversed(rows)))
        self.assertEqual([row["inat_photo_id"] for row in reversed_kept], photo_ids)
        self.assertEqual(reversed_report["author_cap_report"], report["author_cap_report"])
        other_seed, _other_removed, other_report = apply_person_class_cap(rows, seed=PERSON_CAP_SEED + 1)
        self.assertNotEqual(
            {row["inat_photo_id"] for row in other_seed if row["inat_observer"] == "Ada Hunter"},
            {row["inat_photo_id"] for row in ada},
        )
        self.assertEqual(other_report["seed"], PERSON_CAP_SEED + 1)
        self.assertEqual(report["seed"], PERSON_CAP_SEED)
        self.assertEqual(len(removed), 51)

    def test_creator_spellings_share_one_cap_key_and_collector_key_does_not(self):
        rows = []
        for index in range(6):
            rows.append(
                _row(
                    "suillus_grevillei",
                    "",
                    index,
                    observation=f"spell-{index}",
                    inat_observer="",
                    creator="ADA HUNTER",
                    recordedBy="Bea Collector",
                )
            )
        for index in range(6):
            rows.append(
                _row(
                    "suillus_grevillei",
                    "Cy Collector",
                    100 + index,
                    observation=f"spell-b-{index}",
                    creator="ada hunter",
                )
            )
        self.assertTrue(all(cap_author_key(row) == ("person:ada hunter", False) for row in rows))
        capped, _removed, report = apply_person_class_cap(rows)
        self.assertEqual(len(capped), 10)
        self.assertEqual(sum(1 for row in capped if cap_author_key(row)[0] == "person:ada hunter"), 10)
        self.assertEqual(report["classes"][0]["n"], 12)
        self.assertEqual(report["classes"][0]["cap"], 10)
        spell = _author_class(report, "suillus_grevillei")
        self.assertEqual(spell["n"], 12)
        self.assertEqual(spell["cap"], 10)
        self.assertEqual(_author_person(spell, "person:ada hunter")["kept"], 10)
        self.assertEqual(_author_person(spell, "person:ada hunter")["cut"], 2)

        collector_rows = []
        for index in range(11):
            collector_rows.append(
                _row(
                    "suillus_grevillei",
                    "",
                    200 + index,
                    observation=f"ck-{index}",
                    inat_observer="",
                    creator="",
                    collector_key="author:Ada Hunter",
                )
            )
        self.assertTrue(all(person_identity_keys(row) == ["person:ada hunter"] for row in collector_rows))
        self.assertTrue(all(cap_author_key(row) == (None, False) for row in collector_rows))
        capped_collector, _dropped, collector_report = apply_person_class_cap(collector_rows)
        self.assertEqual(len(capped_collector), 10)
        self.assertEqual(collector_report["removed"][0]["person_key"], MISSING_PERSON_KEY)
        self.assertEqual(collector_report["removed"][0]["reason"], "no_person_key")
        self.assertEqual(collector_report["removed"][0]["count"], 1)

    def test_two_people_on_one_row_count_only_the_author(self):
        shared = []
        for index in range(11):
            shared.append(
                _row(
                    "macrolepiota_procera",
                    "Bea Collector",
                    index,
                    observation=f"shared-{index}",
                    creator="Ada Hunter",
                    recorded_by="Bea Collector",
                )
            )
        bea_own = []
        for index in range(11):
            bea_own.append(
                _row(
                    "macrolepiota_procera",
                    "Bea Collector",
                    100 + index,
                    observation=f"bea-{index}",
                    creator="Bea Collector",
                )
            )
        rows = shared + bea_own
        self.assertEqual(person_row_cap(22), 10)
        for row in shared:
            self.assertEqual(cap_author_key(row), ("person:ada hunter", False))
            self.assertCountEqual(
                person_identity_keys(row),
                ["person:ada hunter", "person:bea collector"],
            )
        capped, removed, report = apply_person_class_cap(rows)
        ada_kept = [row for row in capped if cap_author_key(row)[0] == "person:ada hunter"]
        bea_kept = [row for row in capped if cap_author_key(row)[0] == "person:bea collector"]
        self.assertEqual(len(ada_kept), 10)
        self.assertEqual(len(bea_kept), 10)
        self.assertTrue(all(row["recorded_by"] == "Bea Collector" for row in ada_kept))
        self.assertEqual(sum(1 for row in capped if "person:bea collector" in person_identity_keys(row)), 20)
        procera = _author_class(report, "macrolepiota_procera")
        self.assertEqual(procera["n"], 22)
        self.assertEqual(procera["cap"], 10)
        self.assertEqual({item["person_key"] for item in procera["persons"]}, {"person:ada hunter", "person:bea collector"})
        for item in procera["persons"]:
            self.assertEqual(item["kept"], 10)
            self.assertEqual(item["cut"], 1)
            self.assertEqual(item["reason"], "person_cap")
            self.assertEqual(len(item["ids"]), 1)
        ada_cut = [row for row in removed if row.get("creator") == "Ada Hunter"]
        self.assertEqual(len(ada_cut), 1)
        self.assertEqual(ada_cut[0]["recorded_by"], "Bea Collector")
        self.assertEqual(ada_cut[0]["drop_reason"], "person_cap")
        ada_photo = ada_cut[0]["inat_photo_id"]
        listed_for = [
            item["person_key"]
            for item in procera["persons"]
            if ada_photo in item["ids"]
        ]
        self.assertEqual(listed_for, ["person:ada hunter"])

    def test_three_photos_of_one_observation_stay_when_the_person_is_under_the_cap(self):
        rows = [
            _row("boletus_edulis", "Ada Hunter", index, observation="same-outing")
            for index in range(3)
        ]
        rows.extend(
            _row("boletus_edulis", f"other-{index}", 10 + index, observation=f"o-{index}")
            for index in range(5)
        )
        self.assertEqual(MAX_PER_OCCURRENCE, 2)
        self.assertLessEqual(len(rows), person_row_cap(len(rows)))
        capped, removed, _report = apply_person_class_cap(rows)
        self.assertEqual(removed, [])
        ada = [row for row in capped if row["inat_observation_id"] == "same-outing"]
        self.assertEqual(len(ada), 3)

    def test_missing_person_key_is_capped_and_a_broken_key_is_removed(self):
        under = _unknown_authors()[:3]
        capped, removed, report = apply_person_class_cap(under)
        self.assertEqual(removed, [])
        self.assertEqual(len(capped), 3)
        self.assertEqual(report["removed"], [])
        for row in capped:
            self.assertEqual(person_identity_keys(row), [])
            self.assertNotIn(MISSING_PERSON_KEY, row)

        broken = [
            _row("boletus_edulis", f"other-{index}", index, observation=f"ok-{index}")
            for index in range(11)
        ]
        broken.append(_row("boletus_edulis", "other-bad", 99, observation="bad-obs", file="bad.jpg"))
        real = person_identity_keys

        def flaky(record):
            if record.get("file") == "bad.jpg" or record.get("creator") == "other-bad":
                raise RuntimeError("key failed")
            return real(record)

        with patch("person_cap.person_identity_keys", side_effect=flaky):
            kept, dropped, broken_report = apply_person_class_cap(broken)
        self.assertEqual(person_row_cap(12), 10)
        self.assertNotIn("bad.jpg", [row["file"] for row in kept])
        self.assertEqual(len(kept), 11)
        self.assertEqual(broken_report["person_key_errors"], 1)
        self.assertEqual(
            [item for item in broken_report["removed"] if item["reason"] == "person_key_error"],
            [
                {
                    "class_id": "boletus_edulis",
                    "person_key": MISSING_PERSON_KEY,
                    "n": 12,
                    "limit": 10,
                    "count": 1,
                    "reason": "person_key_error",
                    "ids": ["boletus_edulis-99"],
                }
            ],
        )
        self.assertEqual(dropped[0]["drop_reason"], "person_key_error")

    def test_co_collectors_still_share_one_component_when_both_rows_stay(self):
        left = _row(
            "boletus_edulis",
            "Bea Collector",
            1,
            observation="left-obs",
            recorded_by="Ada Hunter",
        )
        right = _row(
            "boletus_edulis",
            "Cy Collector",
            2,
            observation="right-obs",
            recorded_by="Ada Hunter",
        )
        fillers = [
            _row("boletus_edulis", f"other-{index}", 10 + index, observation=f"f-{index}")
            for index in range(4)
        ]
        rows = [left, right, *fillers]
        capped, _near, _identity, removed, _report = records_for_split(rows)
        self.assertEqual(removed, [])
        self.assertEqual(component_ids([left, right], FIXTURE_SALT)[0], component_ids([left, right], FIXTURE_SALT)[1])
        kept_pair = [row for row in capped if row["inat_photo_id"] in {"boletus_edulis-1", "boletus_edulis-2"}]
        self.assertEqual(len(kept_pair), 2)
        self.assertEqual(
            component_ids(kept_pair, FIXTURE_SALT),
            component_ids([left, right], FIXTURE_SALT),
        )
        by_photo = {row["inat_photo_id"]: row for row in kept_pair}
        self.assertIs(by_photo["boletus_edulis-1"], left)
        self.assertEqual(person_identity_keys(by_photo["boletus_edulis-1"]), person_identity_keys(left))
        self.assertEqual(person_identity_keys(by_photo["boletus_edulis-2"]), person_identity_keys(right))

    def test_shuffled_rows_keep_the_same_photos_in_the_same_order(self):
        rows = _merged_fixture()
        capped, _removed, report = apply_person_class_cap(rows)
        photo_ids = [row["inat_photo_id"] for row in capped]
        for salt in (1, 2, 99):
            shuffled = list(rows)
            random.Random(salt).shuffle(shuffled)
            self.assertNotEqual([row["inat_photo_id"] for row in shuffled], [row["inat_photo_id"] for row in rows])
            again, _again_removed, again_report = apply_person_class_cap(shuffled)
            self.assertEqual([row["inat_photo_id"] for row in again], photo_ids)
            self.assertEqual(again_report["author_cap_report"], report["author_cap_report"])
            for entry in again_report["author_cap_report"]:
                self.assertEqual(entry["cap"], person_row_cap(entry["n"]))
                self.assertEqual(sum(item["kept"] + item["cut"] for item in entry["persons"]), entry["n"])
                for person in entry["persons"]:
                    self.assertEqual(person["ids"], sorted(person["ids"]))
                    self.assertEqual(person["cut"], len(person["ids"]))

    def test_unverified_and_duplicates_do_not_take_cap_slots(self):
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            image_dir = directory / "images" / "boletus_edulis"
            image_dir.mkdir(parents=True)
            unique = []
            for index in range(12):
                name = f"ada-{index}.png"
                pixels = np.random.default_rng(4_000 + index).integers(0, 256, size=(24, 24, 3), dtype=np.uint8)
                Image.fromarray(pixels, mode="RGB").save(image_dir / name)
                unique.append(
                    {
                        "class_id": "boletus_edulis",
                        "downloaded": True,
                        "unverified": False,
                        "file": f"images/boletus_edulis/{name}",
                        "image_url": f"https://images.example.test/cap/{name}",
                        "license": "CC BY 4.0",
                        "creator": "Ada Hunter",
                        "inat_observer": "Bea Collector",
                        "recordedBy": "Bea Collector",
                        "inat_photo_id": f"ada-photo-{index}",
                        "inat_observation_id": f"ada-obs-{index}",
                    }
                )
            duplicates = []
            for copy in range(20):
                source = unique[copy % 12]
                name = f"dup-{copy}.png"
                pixels = np.random.default_rng(8_000 + copy).integers(0, 256, size=(24, 24, 3), dtype=np.uint8)
                Image.fromarray(pixels, mode="RGB").save(image_dir / name)
                duplicates.append(
                    {
                        **source,
                        "file": f"images/boletus_edulis/{name}",
                        "image_url": f"https://images.example.test/cap/{name}",
                    }
                )
            unverified = [
                {
                    "class_id": "boletus_edulis",
                    "downloaded": True,
                    "unverified": True,
                    "file": f"images/boletus_edulis/missing-{index}.png",
                    "image_url": f"https://images.example.test/cap/missing-{index}.png",
                    "license": "CC BY 4.0",
                    "creator": "Ada Hunter",
                    "inat_observer": "Bea Collector",
                    "recordedBy": "Bea Collector",
                    "inat_photo_id": f"unverified-{index}",
                    "inat_observation_id": f"unverified-obs-{index}",
                }
                for index in range(30)
            ]
            (directory / "attributions.jsonl").write_text(
                "".join(json.dumps(row) + "\n" for row in unique + duplicates + unverified),
                encoding="utf-8",
            )
            with patch("prepare_data.DATA_DIR", directory):
                records, skipped = _usable_records([directory / "attributions.jsonl"])
            self.assertEqual(sum(1 for row in skipped if row.get("skip_reason") == "unverified"), 30)
            self.assertEqual(len(records), 32)
            capped, _near, identity, removed, report = records_for_split(records)
            self.assertGreaterEqual(len(identity), 20)
            info = report["classes"][0]
            self.assertEqual(info["class_id"], "boletus_edulis")
            self.assertEqual(info["n"], 12)
            self.assertEqual(info["limit"], 10)
            self.assertEqual(len(capped), 10)
            self.assertEqual(report["removed_rows"], 2)
            kept_ids = {row["inat_photo_id"] for row in capped}
            self.assertEqual(len(kept_ids), 10)
            self.assertTrue(kept_ids <= {f"ada-photo-{index}" for index in range(12)})
            self.assertTrue(all("/dup-" not in row["file"] for row in capped))
            bolete = _author_class(report, "boletus_edulis")
            self.assertEqual(bolete["n"], 12)
            self.assertEqual(bolete["cap"], 10)
            ada = _author_person(bolete, "person:ada hunter")
            self.assertNotIn("person:bea collector", [item["person_key"] for item in bolete["persons"]])
            self.assertEqual(ada["kept"], 10)
            self.assertEqual(ada["cut"], 2)
            self.assertEqual(ada["reason"], "person_cap")
            self.assertEqual(ada["ids"], sorted(ada["ids"]))
            self.assertEqual(len(ada["ids"]), 2)
            self.assertTrue(set(ada["ids"]) <= {f"ada-photo-{index}" for index in range(12)})
            self.assertTrue(set(ada["ids"]).isdisjoint(kept_ids))
            self.assertTrue(all(not str(row["inat_photo_id"]).startswith("unverified-") for row in capped))
            self.assertTrue(all(row["inat_photo_id"] in set(ada["ids"]) for row in removed))

    def test_prepare_main_merges_sources_writes_the_report_and_leaves_files(self):
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            image_dir = directory / "images" / "boletus_edulis"
            image_dir.mkdir(parents=True)
            attributions = []
            external = []
            index = 0

            def add(bucket: list[dict], observer: str, *, recorded_by: str = "") -> None:
                nonlocal index
                name = f"{index}.png"
                rng = np.random.default_rng(20_000 + index)
                pixels = rng.integers(0, 256, size=(32, 40, 3), dtype=np.uint8)
                Image.fromarray(pixels, mode="RGB").save(image_dir / name)
                row = {
                    "class_id": "boletus_edulis",
                    "downloaded": True,
                    "file": f"images/boletus_edulis/{name}",
                    "image_url": f"https://images.example.test/prepare/{name}",
                    "license": "CC BY 4.0",
                    "inat_observer": observer,
                    "creator": recorded_by or observer,
                    "author": observer,
                    "recordedBy": recorded_by,
                    "inat_photo_id": f"prepare-{index}",
                    "inat_observation_id": f"prepare-obs-{index}",
                    "sha256": f"unused-{index}",
                }
                bucket.append(row)
                index += 1

            for _repeat in range(8):
                add(attributions, "", recorded_by="Ada Hunter")
            for other in range(40):
                add(attributions, f"other-{other}")
            for _repeat in range(8):
                add(external, "Ada Hunter")
            (directory / "attributions.jsonl").write_text(
                "".join(json.dumps(row) + "\n" for row in attributions),
                encoding="utf-8",
            )
            (directory / "external.jsonl").write_text(
                "".join(json.dumps(row) + "\n" for row in external),
                encoding="utf-8",
            )
            before_primary = (directory / "attributions.jsonl").read_bytes()
            before_external = (directory / "external.jsonl").read_bytes()
            with patch("prepare_data.DATA_DIR", directory), patch.dict(
                os.environ,
                {SALT_ENV: FIXTURE_SALT, "GRZYBOBRANIE_GALLERY_CSV": ""},
            ):
                main(["--with-external"])
            self.assertEqual((directory / "attributions.jsonl").read_bytes(), before_primary)
            self.assertEqual((directory / "external.jsonl").read_bytes(), before_external)
            self.assertEqual(len(list(image_dir.glob("*.png"))), 56)
            report = json.loads((directory / "person_cap_report.json").read_text(encoding="utf-8"))
            ore = report["classes"]
            self.assertEqual(len(ore), 1)
            self.assertEqual(ore[0]["class_id"], "boletus_edulis")
            self.assertEqual(ore[0]["n"], 56)
            self.assertEqual(ore[0]["cap"], 10)
            ada = [
                item
                for item in report["removed"]
                if item["person_key"] == "person:ada hunter" and item["reason"] == "person_cap"
            ]
            bolete = _author_class(report, "boletus_edulis")
            self.assertEqual(bolete["n"], 56)
            self.assertEqual(bolete["cap"], 10)
            ada_person = _author_person(bolete, "person:ada hunter")
            self.assertEqual(ada_person["kept"], 10)
            self.assertEqual(ada_person["cut"], 6)
            self.assertEqual(len(ada), 1)
            self.assertEqual(ada[0]["class_id"], "boletus_edulis")
            self.assertEqual(ada[0]["person_key"], "person:ada hunter")
            self.assertEqual(ada[0]["n"], 56)
            self.assertEqual(ada[0]["limit"], 10)
            self.assertEqual(ada[0]["count"], 6)
            self.assertEqual(ada[0]["reason"], "person_cap")
            self.assertEqual(ada[0]["ids"], sorted(ada[0]["ids"]))
            self.assertEqual(len(ada[0]["ids"]), 6)
            dedup_report = json.loads((directory / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertEqual(dedup_report["person_cap_removed"], report["removed_rows"])
            self.assertEqual(dedup_report["author_cap_report"], "person_cap_report.json")
            first_splits = (directory / "splits.json").read_bytes()
            first_cap_report = (directory / "person_cap_report.json").read_bytes()
            splits = json.loads(first_splits.decode("utf-8"))
            placed = [row for name in ("train", "val", "test") for row in splits[name]]
            placed_ada = {
                row["inat_photo_id"]
                for row in placed
                if "person:ada hunter" in person_identity_keys(row)
            }
            self.assertTrue(set(ada[0]["ids"]).isdisjoint(placed_ada))
            self.assertEqual(_counts(placed)["boletus_edulis"]["person:ada hunter"], 10)
            self.assertLessEqual(
                max(_counts(placed)["boletus_edulis"].values()),
                person_row_cap(ore[0]["n"]),
            )
            for name in ("attributions.jsonl", "external.jsonl"):
                path = directory / name
                lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
                shuffled_lines = list(lines)
                random.Random(7).shuffle(shuffled_lines)
                self.assertNotEqual(shuffled_lines, lines)
                path.write_text("".join(shuffled_lines), encoding="utf-8")
            with patch("prepare_data.DATA_DIR", directory), patch.dict(
                os.environ,
                {SALT_ENV: FIXTURE_SALT, "GRZYBOBRANIE_GALLERY_CSV": ""},
            ):
                main(["--with-external"])
            self.assertEqual((directory / "splits.json").read_bytes(), first_splits)
            self.assertEqual((directory / "person_cap_report.json").read_bytes(), first_cap_report)


if __name__ == "__main__":
    unittest.main()
