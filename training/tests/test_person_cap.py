"""Per-person cap inside one class, applied by prepare before the split.

N is the number of rows of that class after dedup and before the cap.
The limit is min(60, max(10, round(0.10 * N))). On main, before this cap,
one person can hold 61 of 72 rows. prepare must keep that person at or
under the cap, counted with split.person_identity_keys.
"""

import json
import os
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
    PERSON_CAP_SEED,
    apply_person_class_cap,
    person_row_cap,
)
from prepare_data import main, records_for_split
from salt_fixture import FIXTURE_SALT
from sampling import MAX_PER_OCCURRENCE
from split import component_ids, observation_identity_keys, person_identity_keys, photo_identity_keys
from split_salt import SALT_ENV
import person_cap
import split


def _row(class_id: str, observer: str, index: int, *, observation: str, **extra) -> dict:
    row = {
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

    def test_prepare_caps_after_merge_and_before_the_split(self):
        text = (ROOT / "training" / "prepare_data.py").read_text(encoding="utf-8")
        body = text.split("def main(", 1)[1].split("\ndef ", 1)[0]
        self.assertLess(body.index("_attribution_sources("), body.index("records_for_split("))
        self.assertLess(body.index("_usable_records("), body.index("records_for_split("))
        self.assertLess(body.index("records_for_split("), body.index("_cache_model_pngs("))
        self.assertLess(body.index("_cache_model_pngs("), body.index("assign_splits("))

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

        ada_removed = [
            item
            for item in report["removed"]
            if item["class_id"] == "cortinarius_orellanus" and item["person_key"] == "person:ada hunter"
        ]
        self.assertEqual(ada_removed, [
            {"class_id": "cortinarius_orellanus", "person_key": "person:ada hunter", "count": 51, "reason": "person_cap"}
        ])
        unknown_removed = [
            item for item in report["removed"] if item["class_id"] == "amanita_muscaria"
        ]
        self.assertEqual(unknown_removed, [
            {
                "class_id": "amanita_muscaria",
                "person_key": MISSING_PERSON_KEY,
                "count": 5,
                "reason": "no_person_key",
            }
        ])
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
        self.assertEqual(photo_ids, [row["inat_photo_id"] for row in rows if row["inat_photo_id"] in set(photo_ids)])
        reversed_kept, _reversed_removed, _reversed_report = apply_person_class_cap(list(reversed(rows)))
        self.assertEqual(
            {row["inat_photo_id"] for row in reversed_kept},
            {row["inat_photo_id"] for row in capped},
        )
        other_seed, _other_removed, other_report = apply_person_class_cap(rows, seed=PERSON_CAP_SEED + 1)
        self.assertNotEqual(
            {row["inat_photo_id"] for row in other_seed if row["inat_observer"] == "Ada Hunter"},
            {row["inat_photo_id"] for row in ada},
        )
        self.assertEqual(other_report["seed"], PERSON_CAP_SEED + 1)
        self.assertEqual(report["seed"], PERSON_CAP_SEED)
        self.assertEqual(len(removed), 51)

    def test_spellings_and_collector_key_are_one_person(self):
        rows = []
        for index in range(6):
            rows.append(
                _row(
                    "suillus_grevillei",
                    "",
                    index,
                    observation=f"spell-{index}",
                    inat_observer="",
                    recordedBy="ADA HUNTER",
                )
            )
        for index in range(6):
            rows.append(
                _row(
                    "suillus_grevillei",
                    "ada hunter",
                    100 + index,
                    observation=f"spell-b-{index}",
                )
            )
        self.assertEqual(
            {tuple(person_identity_keys(row)) for row in rows},
            {("person:ada hunter",)},
        )
        capped, _removed, report = apply_person_class_cap(rows)
        self.assertEqual(len(capped), 10)
        self.assertEqual(_counts(capped)["suillus_grevillei"]["person:ada hunter"], 10)
        self.assertEqual(report["classes"][0]["n"], 12)
        self.assertEqual(report["classes"][0]["cap"], 10)

        collector_rows = []
        for index in range(11):
            collector_rows.append(
                _row(
                    "suillus_grevillei",
                    "",
                    200 + index,
                    observation=f"ck-{index}",
                    inat_observer="",
                    collector_key="author:Ada Hunter",
                )
            )
        self.assertTrue(all(person_identity_keys(row) == ["person:ada hunter"] for row in collector_rows))
        capped_collector, _dropped, collector_report = apply_person_class_cap(collector_rows)
        self.assertEqual(len(capped_collector), 10)
        self.assertEqual(collector_report["removed"][0]["count"], 1)

    def test_co_collector_cannot_bypass_either_cap(self):
        rows = []
        for index in range(12):
            rows.append(
                _row(
                    "macrolepiota_procera",
                    "Bea Collector",
                    index,
                    observation=f"bea-{index}",
                    recorded_by="Ada Hunter",
                )
            )
        for index in range(18):
            rows.append(
                _row(
                    "macrolepiota_procera",
                    f"other-{index}",
                    100 + index,
                    observation=f"other-{index}",
                )
            )
        self.assertEqual(person_row_cap(30), 10)
        for row in rows[:12]:
            self.assertCountEqual(
                person_identity_keys(row),
                ["person:bea collector", "person:ada hunter"],
            )
        capped, _removed, report = apply_person_class_cap(rows)
        post = _counts(capped)["macrolepiota_procera"]
        self.assertLessEqual(post["person:bea collector"], 10)
        self.assertLessEqual(post["person:ada hunter"], 10)
        self.assertEqual(post["person:bea collector"], post["person:ada hunter"])
        self.assertEqual(sum(1 for row in capped if str(row["inat_observer"]).startswith("other-")), 18)
        kept_bea = post["person:bea collector"]
        for person_key in ("person:ada hunter", "person:bea collector"):
            dropped = sum(
                item["count"]
                for item in report["removed"]
                if item["person_key"] == person_key
            )
            self.assertEqual(dropped, 12 - kept_bea)
        for row in capped:
            if row["inat_observer"] == "Bea Collector":
                self.assertEqual(
                    person_identity_keys(row),
                    person_identity_keys(rows[int(row["inat_photo_id"].rsplit("-", 1)[-1])]),
                )

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
            if record.get("file") == "bad.jpg":
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
                    "count": 1,
                    "reason": "person_key_error",
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
            self.assertEqual(ada, [
                {
                    "class_id": "boletus_edulis",
                    "person_key": "person:ada hunter",
                    "count": 6,
                    "reason": "person_cap",
                }
            ])
            dedup_report = json.loads((directory / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertEqual(dedup_report["person_cap_removed"], report["removed_rows"])
            splits = json.loads((directory / "splits.json").read_text(encoding="utf-8"))
            placed = [row for name in ("train", "val", "test") for row in splits[name]]
            self.assertEqual(_counts(placed)["boletus_edulis"]["person:ada hunter"], 10)
            self.assertLessEqual(
                max(_counts(placed)["boletus_edulis"].values()),
                person_row_cap(ore[0]["n"]),
            )


if __name__ == "__main__":
    unittest.main()
