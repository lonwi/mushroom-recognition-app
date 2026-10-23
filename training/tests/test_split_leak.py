"""Leak-free split: salted photographer key, identity dedup, gallery gate."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dedup import dedup_by_identity
from component_share import (
    ACK_PATH,
    COMPONENT_SHARE_LIMIT,
    blockers_from_manifest_file,
    component_share_blockers,
    load_share_config,
    measure_component_share,
)
from prepare_data import write_prepare_outputs
from dataset_manifest import build_dataset_manifest
from evaluate import attributions_complete
from export_tflite import write_attribution_file
from gallery_exclusion import (
    GalleryLeakError,
    assert_gallery_absent_from_test,
    canonical_url,
    gallery_csv_paths,
    load_gallery_csv,
    record_matches_gallery,
)
from publication import classify_license_column, excluded_from_publication, publishable_license
from salt_fixture import FIXTURE_SALT
from split import (
    component_ids,
    hashed_split_key,
    observation_identity_keys,
    person_identity_keys,
    person_key_source,
    photo_identity_keys,
    split_by_observation,
)
from split_salt import SALT_ENV, SALT_FILE_ENV, SplitSaltError, load_split_salt

FIXTURE_CSV = Path(__file__).resolve().parent / "fixtures" / "gallery_sample.csv"
LEAK_URL = "https://images.example.test/gallery/death.jpg"


def _photo(class_id: str, observer: str, index: int, **extra) -> dict:
    row = {
        "class_id": class_id,
        "inat_observer": observer,
        "author": extra.pop("author", ""),
        "license": extra.pop("license", "CC BY"),
        "image_url": f"https://images.example.test/{class_id}/{observer}/{index}.jpg",
        "file": f"{class_id}_{observer}_{index}.jpg",
        "occurrence_key": extra.pop("occurrence_key", f"{class_id}-{observer}-{index}"),
        "inat_photo_id": extra.pop("inat_photo_id", f"{class_id}-{index}-{observer}"),
        "inat_observation_id": extra.pop("inat_observation_id", f"obs-{class_id}-{observer}-{index}"),
    }
    row.update(extra)
    return row


def _homes(splits: dict[str, list[dict]], key) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {}
    for name, rows in splits.items():
        for row in rows:
            found.setdefault(key(row), set()).add(name)
    return found


class SplitLeakTest(unittest.TestCase):
    def test_one_observer_stays_out_of_the_other_splits(self):
        records = []
        for index in range(18):
            observer = "login_shared" if index == 0 else f"login_{index}"
            for day, latitude in (("2024-09-01", 52.0), ("2024-09-02", 53.5)):
                records.append(
                    _photo(
                        "boletus_edulis",
                        observer,
                        index,
                        event_date=day,
                        decimal_latitude=latitude,
                        decimal_longitude=21.0,
                        recorded_by=observer,
                        file=f"boletus_{observer}_{day}.jpg",
                        image_url=f"https://images.example.test/boletus/{observer}/{day}.jpg",
                        inat_photo_id=f"boletus-{observer}-{day}",
                        inat_observation_id=f"obs-{observer}-{day}",
                        occurrence_key=f"occ-{observer}-{day}",
                    )
                )
            records.append(
                _photo(
                    "amanita_muscaria",
                    observer,
                    index,
                    recorded_by=observer,
                )
            )
        splits = split_by_observation(records, val_ratio=0.15, test_ratio=0.15, seed=42, salt=FIXTURE_SALT)
        homes = _homes(splits, lambda row: row["inat_observer"])
        self.assertGreaterEqual(len([name for name, rows in splits.items() if rows]), 2)
        for observer, names in homes.items():
            self.assertEqual(len(names), 1, observer)
        shared = [name for name, rows in splits.items() if any(row["inat_observer"] == "login_shared" for row in rows)]
        self.assertEqual(len(shared), 1)
        self.assertEqual(sum(1 for row in splits[shared[0]] if row["inat_observer"] == "login_shared"), 3)

    def test_fallback_key_groups_rows_without_an_inat_observer(self):
        commons = []
        for index in range(4):
            commons.append(
                {
                    "class_id": "morchella_esculenta",
                    "inat_observer": "",
                    "author": "commons_author_1",
                    "license": "CC BY",
                    "image_url": f"https://upload.wikimedia.org/wikipedia/commons/morel_{index}.jpg",
                    "commons_file": f"morel_{index}.jpg",
                    "file": f"morel_{index}.jpg",
                    "source_url": f"https://commons.wikimedia.org/wiki/File:morel_{index}.jpg",
                }
            )
        gbif = []
        for index in range(4):
            gbif.append(
                {
                    "class_id": "cortinarius_orellanus",
                    "inat_observer": "",
                    "author": "",
                    "recordedBy": "gbif_recorded_by_1",
                    "license": "CC BY 4.0",
                    "image_url": f"https://www.artsobservasjoner.no/MediaLibrary/{index}.jpg",
                    "file": f"orellanus_{index}.jpg",
                    "source_url": f"https://www.gbif.org/occurrence/9000{index}",
                    "occurrence_key": 90000 + index,
                }
            )
        others = [_photo("morchella_esculenta", f"login_{index}", index) for index in range(8)]
        others.extend(_photo("cortinarius_orellanus", f"other_{index}", index) for index in range(8))
        records = commons + gbif + others
        self.assertEqual(person_key_source(commons[0]), "author")
        self.assertEqual(person_key_source(gbif[0]), "recorded_by")
        self.assertEqual(person_key_source(others[0]), "inat_observer")
        self.assertNotIn("inat_observer", "".join(person_identity_keys(commons[0])))
        ids = component_ids(records, FIXTURE_SALT)
        commons_ids = ids[:4]
        gbif_ids = ids[4:8]
        self.assertEqual(len(set(commons_ids)), 1)
        self.assertEqual(len(set(gbif_ids)), 1)
        self.assertNotEqual(commons_ids[0], gbif_ids[0])
        self.assertNotEqual(commons_ids[0], ids[8])
        splits = split_by_observation(records, salt=FIXTURE_SALT)
        commons_home = {name for name, rows in splits.items() if any(row.get("author") == "commons_author_1" for row in rows)}
        gbif_home = {name for name, rows in splits.items() if any(row.get("recordedBy") == "gbif_recorded_by_1" for row in rows)}
        self.assertEqual(len(commons_home), 1)
        self.assertEqual(len(gbif_home), 1)

    def test_salt_changes_the_key_and_is_not_the_observer_name(self):
        material = ["person:login_a", "inat_observation:50"]
        first = hashed_split_key(material, FIXTURE_SALT)
        second = hashed_split_key(material, FIXTURE_SALT + "-other")
        self.assertNotEqual(first, second)
        self.assertNotIn("login_a", first)
        self.assertEqual(len(first), 64)
        with self.assertRaises(SplitSaltError) as raised:
            split_by_observation([_photo("boletus_edulis", "login_a", 1)], salt=None)
        self.assertIn("GRZYBOBRANIE_SPLIT_SALT", str(raised.exception))
        with self.assertRaises(SplitSaltError):
            split_by_observation([_photo("boletus_edulis", "login_a", 1)], salt="  ")

    def test_split_salt_comes_from_the_env_or_a_file_outside_the_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            with self.assertRaises(SplitSaltError) as raised:
                load_split_salt(environ={}, home=home)
            self.assertIn(SALT_ENV, str(raised.exception))
            outside = home / "secret-salt.txt"
            outside.write_text("  outside-salt-value  \n", encoding="utf-8")
            self.assertEqual(
                load_split_salt(environ={SALT_FILE_ENV: str(outside)}, home=home),
                "outside-salt-value",
            )
            self.assertEqual(
                load_split_salt(environ={SALT_ENV: "from-env", SALT_FILE_ENV: str(outside)}, home=home),
                "from-env",
            )
            inside = Path(__file__).resolve().parents[1] / "_salt_probe.txt"
            inside.write_text("do-not-commit", encoding="utf-8")
            try:
                with self.assertRaises(SplitSaltError) as inside_raised:
                    load_split_salt(environ={SALT_FILE_ENV: str(inside)}, home=home)
                self.assertIn("inside the repository", str(inside_raised.exception))
            finally:
                inside.unlink(missing_ok=True)

    def test_dedup_drops_a_repeated_photo_and_groups_df20_by_observation(self):
        repeated = [
            {
                "class_id": "boletus_edulis",
                "inat_photo_id": "9",
                "inat_observation_id": "50",
                "license": "CC BY-NC 4.0",
                "license_normalized": "cc-by-nc-4.0",
                "image_url": "https://images.example.test/same.jpg",
                "file": "same.jpg",
                "author": "observer_nc",
            },
            {
                "class_id": "boletus_edulis",
                "inat_photo_id": "9",
                "inat_observation_id": "50",
                "license": "CC BY 4.0",
                "license_normalized": "cc-by-4.0",
                "image_url": "https://images.example.test/same.jpg",
                "file": "same.jpg",
                "author": "observer_by",
            },
        ]
        kept, dropped = dedup_by_identity(repeated)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["license"], "CC BY 4.0")
        self.assertEqual(dropped[0]["drop_reason"], "duplicate_photo_id")
        self.assertNotEqual(kept[0]["license"], kept[0]["author"])

        pair = [
            {
                "class_id": "boletus_edulis",
                "inat_observation_id": "77",
                "inat_photo_id": "1",
                "inat_observer": "login_a",
                "license": "CC BY",
                "image_url": "https://images.example.test/one.jpg",
                "file": "one.jpg",
            },
            {
                "class_id": "boletus_edulis",
                "inat_observation_id": "77",
                "inat_photo_id": "2",
                "inat_observer": "login_a",
                "license": "CC0",
                "image_url": "https://images.example.test/two.jpg",
                "file": "two.jpg",
            },
        ]
        kept_pair, dropped_pair = dedup_by_identity(pair)
        self.assertEqual(len(kept_pair), 2)
        self.assertEqual(dropped_pair, [])
        self.assertEqual(len(set(component_ids(pair, FIXTURE_SALT))), 1)

        df20 = [
            {
                "class_id": "boletus_edulis",
                "observationID": "2237858559",
                "ImageUniqueID": "2237858559-1",
                "photographer_rightsHolder": "photographer_a",
                "licence_note": "DF20 training-only; no per-image licence",
                "license": "",
                "file": "df-1.jpg",
            },
            {
                "class_id": "boletus_edulis",
                "observationID": "2237858559",
                "ImageUniqueID": "2237858559-2",
                "photographer_rightsHolder": "photographer_b",
                "licence_note": "DF20 training-only; no per-image licence",
                "license": "",
                "file": "df-2.jpg",
            },
            {
                "class_id": "boletus_edulis",
                "observationID": "999",
                "ImageUniqueID": "999-1",
                "photographer_rightsHolder": "photographer_c",
                "licence_note": "DF20 training-only; no per-image licence",
                "license": "",
                "file": "df-3.jpg",
            },
        ]
        kept_df, dropped_df = dedup_by_identity(df20)
        self.assertEqual(len(kept_df), 3)
        self.assertEqual(dropped_df, [])
        df_ids = component_ids(df20, FIXTURE_SALT)
        self.assertEqual(df_ids[0], df_ids[1])
        self.assertNotEqual(df_ids[0], df_ids[2])
        fillers = [_photo("boletus_edulis", f"login_{index}", index) for index in range(10)]
        splits = split_by_observation(df20 + fillers, salt=FIXTURE_SALT)
        homes = []
        for name, rows in splits.items():
            if any(row.get("observationID") == "2237858559" for row in rows):
                homes.append(name)
                self.assertEqual(sum(1 for row in rows if row.get("observationID") == "2237858559"), 2)
        self.assertEqual(len(homes), 1)

    def test_gbif_and_external_inat_are_one_group(self):
        """One iNat observation from GBIF and from an external CSV is one split.

        GBIF keeps a numeric occurrence key and an iNat photo or observation
        URL. The external CSV uses ``inat-obs:`` or the importer's ``inat:``
        key, plus inat_observation_id, inat_photo_id, and inat_observer.
        """
        observation_url = "https://www.inaturalist.org/observations/555001"
        gbif_photo = {
            "class_id": "boletus_edulis",
            "occurrence_key": 445566,
            "source_url": "https://www.inaturalist.org/photos/88001",
            "image_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/88001/original.jpg",
            "recordedBy": "Ada Hunter",
            "license": "CC BY-NC",
            "license_normalized": "cc-by-nc-4.0",
            "usage": "training_only",
            "file": "gbif-88001.jpg",
        }
        external_same_photo = {
            "class_id": "boletus_edulis",
            "source": "inat",
            "occurrence_key": "inat-obs:555001",
            "observation_id": "555001",
            "inat_observation_id": "555001",
            "inaturalist_observation_id": "555001",
            "inat_photo_id": "88001",
            "inat_observer": "Ada Hunter",
            "recorded_by": "Ada Hunter",
            "collector_key": "inat:ada hunter",
            "author": "Ada Hunter",
            "source_url": observation_url,
            "image_url": "https://images.example.test/mirror/88001.jpg",
            "license": "CC BY",
            "license_normalized": "cc-by-4.0",
            "usage": "publishable",
            "file": "external-88001.jpg",
        }
        self.assertIn("inat_photo:88001", photo_identity_keys(gbif_photo))
        self.assertIn("inat_observation:555001", observation_identity_keys(external_same_photo))
        self.assertIn("gbif_occurrence:445566", observation_identity_keys(gbif_photo))
        self.assertIn("person:ada hunter", person_identity_keys(gbif_photo))
        self.assertIn("person:ada hunter", person_identity_keys(external_same_photo))
        kept_photo, dropped_photo = dedup_by_identity([gbif_photo, external_same_photo])
        self.assertEqual(len(kept_photo), 1)
        self.assertEqual(kept_photo[0]["usage"], "publishable")
        self.assertEqual(dropped_photo[0]["drop_reason"], "duplicate_photo_id")

        gbif_other_photo = {
            "class_id": "boletus_edulis",
            "occurrence_key": "778899",
            "source_url": observation_url,
            "references": "https://www.gbif.org/occurrence/778899",
            "image_url": "https://static.inaturalist.org/photos/88002/large.jpeg",
            "recorded_by": "Ada Hunter",
            "license": "CC BY 4.0",
            "license_normalized": "cc-by-4.0",
            "usage": "publishable",
            "file": "gbif-88002.jpg",
        }
        external_inat_key = {
            "class_id": "boletus_edulis",
            "source": "inat",
            "occurrence_key": "inat:555001",
            "observation_id": "555001",
            "inat_observation_id": "555001",
            "inat_photo_id": "88003",
            "inat_observer": "ada hunter",
            "recorded_by": "ada hunter",
            "collector_key": "inat:ada hunter",
            "author": "Ada Hunter",
            "source_url": observation_url,
            "image_url": "https://images.example.test/external/88003.jpg",
            "license": "CC0",
            "license_normalized": "cc0-1.0",
            "usage": "publishable",
            "file": "external-88003.jpg",
        }
        # A numeric GBIF key is not an iNat id. The observation URL is the link.
        bare_gbif = {
            "class_id": "boletus_edulis",
            "occurrence_key": 555001,
            "recordedBy": "Bare Recorder",
            "image_url": "https://images.example.test/bare-gbif.jpg",
            "license": "CC BY",
            "file": "bare-gbif.jpg",
        }
        df20_same_digits = {
            "class_id": "boletus_edulis",
            "source": "df20",
            "occurrence_key": "df20:555001",
            "observationID": "555001",
            "observation_id": "555001",
            "ImageUniqueID": "555001-9",
            "photographer_rightsHolder": "Df20 Photographer",
            "licence_note": "DF20 training-only; no per-image licence",
            "license": "",
            "license_normalized": "df20",
            "usage": "training_only",
            "file": "df20-555001.jpg",
        }
        linked = [gbif_other_photo, external_inat_key]
        kept_linked, dropped_linked = dedup_by_identity(linked)
        self.assertEqual(len(kept_linked), 2)
        self.assertEqual(dropped_linked, [])

        observer_only = {
            "class_id": "cortinarius_orellanus",
            "source": "inat",
            "occurrence_key": "inat-obs:777001",
            "inat_observation_id": "777001",
            "inat_photo_id": "99001",
            "inat_observer": "Ada Hunter",
            "recorded_by": "Ada Hunter",
            "collector_key": "inat:ada hunter",
            "image_url": "https://images.example.test/external/99001.jpg",
            "source_url": "https://www.inaturalist.org/observations/777001",
            "license": "CC BY",
            "license_normalized": "cc-by-4.0",
            "usage": "publishable",
            "file": "external-99001.jpg",
        }
        fillers = []
        for index in range(12):
            fillers.append(_photo("boletus_edulis", f"login_{index}", index))
            fillers.append(_photo("amanita_muscaria", f"login_{index}", index))
            fillers.append(_photo("cortinarius_orellanus", f"login_{index}", index))
        rows = [gbif_other_photo, external_inat_key, observer_only, bare_gbif, df20_same_digits, *fillers]
        grouped = component_ids(
            [gbif_other_photo, external_inat_key, observer_only, bare_gbif, df20_same_digits],
            FIXTURE_SALT,
        )
        self.assertEqual(grouped[0], grouped[1])
        self.assertEqual(grouped[1], grouped[2])
        self.assertNotEqual(grouped[0], grouped[3])
        self.assertNotEqual(grouped[0], grouped[4])
        self.assertNotEqual(grouped[3], grouped[4])
        splits = split_by_observation(rows, salt=FIXTURE_SALT)
        ada_homes = {
            name
            for name, split_rows in splits.items()
            if any("ada hunter" in " ".join(person_identity_keys(row)) for row in split_rows)
        }
        self.assertEqual(len(ada_homes), 1)
        ada_rows = [
            row
            for split_rows in splits.values()
            for row in split_rows
            if "ada hunter" in " ".join(person_identity_keys(row))
        ]
        self.assertEqual({row.get("file") for row in ada_rows}, {"gbif-88002.jpg", "external-88003.jpg", "external-99001.jpg"})
        for filename in ("bare-gbif.jpg", "df20-555001.jpg"):
            homes = {
                name
                for name, split_rows in splits.items()
                if any(row.get("file") == filename for row in split_rows)
            }
            self.assertEqual(len(homes), 1)

    def test_gallery_gate_fails_on_a_planted_leak(self):
        exclusion = load_gallery_csv(FIXTURE_CSV)
        self.assertIn(canonical_url(LEAK_URL), exclusion.image_urls)
        self.assertIn("424242", exclusion.inat_ids)
        self.assertIn("777", exclusion.mo_ids)
        self.assertTrue(record_matches_gallery({"image_url": LEAK_URL + "?download"}, exclusion))
        self.assertTrue(
            record_matches_gallery(
                {
                    "image_url": "https://images.example.test/mirror.jpg",
                    "source_url": "https://www.inaturalist.org/observations/424242",
                },
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {"image_url": "https://images.example.test/mo.jpg", "mo_observation_id": "777"},
                exclusion,
            )
        )
        planted = {
            "train": [{"image_url": LEAK_URL, "mo_observation_id": "777"}],
            "val": [],
            "test": [
                {
                    "image_url": "https://images.example.test/mirror.jpg",
                    "source_url": "https://www.inaturalist.org/observations/424242",
                }
            ],
        }
        with self.assertRaises(GalleryLeakError) as raised:
            assert_gallery_absent_from_test(planted, exclusion)
        self.assertIn("Gallery exclusion failed", str(raised.exception))
        self.assertIn("stops", str(raised.exception))
        clean = {
            "train": [{"image_url": LEAK_URL}],
            "val": [],
            "test": [{"image_url": "https://images.example.test/clean.jpg"}],
        }
        assert_gallery_absent_from_test(clean, exclusion)

    def test_gallery_csv_rejects_http_and_a_missing_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            http_csv = folder / "http.csv"
            http_csv.write_text(
                "app_id,feature,image_url,author,license,source_url\n"
                "amanita_phalloides,cap,http://images.example.test/a.jpg,Test Author,CC BY,https://www.inaturalist.org/observations/1\n",
                encoding="utf-8",
            )
            with self.assertRaises(ValueError) as raised:
                load_gallery_csv(http_csv)
            self.assertIn("https", str(raised.exception))
            config = folder / "gallery_csvs.json"
            config.write_text(json.dumps({"gallery_csvs": ["missing.csv"]}), encoding="utf-8")
            with self.assertRaises(ValueError):
                gallery_csv_paths([], str(config), environ={})
            present = folder / "ok.csv"
            present.write_text(
                "app_id,feature,image_url,author,license,source_url\n"
                "amanita_phalloides,cap,https://images.example.test/ok.jpg,Test Author,CC BY,https://www.inaturalist.org/observations/9\n",
                encoding="utf-8",
            )
            config.write_text(json.dumps({"gallery_csvs": ["ok.csv"]}), encoding="utf-8")
            found = gallery_csv_paths([], str(config), environ={})
            self.assertEqual(found, [config.parent / "ok.csv"])

    def test_license_column_excludes_nc_and_df20_in_one_condition(self):
        rows = [
            {"tag": "cc0", "license": "CC0", "author": "observer_cc0"},
            {"tag": "ccby", "license": "CC BY", "author": "observer_by"},
            {"tag": "ccby4", "license": "CC BY 4.0", "author": "observer_by4"},
            {"tag": "nc", "license": "CC BY-NC 4.0", "author": "observer_nc"},
            {
                "tag": "df20",
                "license": "",
                "licence_note": "DF20 training-only; no per-image licence",
                "ImageUniqueID": "1-1",
                "observationID": "1",
                "author": "observer_df",
            },
            {"tag": "sa", "license": "CC BY-SA 4.0", "author": "observer_sa"},
            {"tag": "public", "license": "public domain", "author": "observer_pd"},
        ]
        for row in rows:
            self.assertIn("license", row)
            self.assertNotEqual(row["license"], row["author"])
        self.assertNotEqual(rows[4]["license"], rows[4]["licence_note"])
        self.assertEqual(classify_license_column("CC BY"), "rejected")
        self.assertEqual(classify_license_column("public domain"), "rejected")
        self.assertEqual(
            classify_license_column("CC BY", "https://creativecommons.org/licenses/by/4.0/"),
            "cc-by",
        )
        self.assertEqual(
            [row["tag"] for row in rows if not excluded_from_publication(row)],
            ["cc0", "ccby4"],
        )
        self.assertEqual(
            [row["tag"] for row in rows if publishable_license(row)],
            ["cc0", "ccby4"],
        )
        publishable = {
            "creator": "credit",
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "license_normalized": "cc-by-4.0",
            "usage": "publishable",
            "image_url": "https://images.example.test/by.jpg",
            "source_url": "https://www.inaturalist.org/observations/1",
        }
        self.assertTrue(attributions_complete([publishable]))
        nc = {**publishable, "license": "CC BY-NC 4.0", "license_normalized": "cc-by-nc-4.0", "usage": "training_only"}
        self.assertFalse(attributions_complete([nc]))
        self.assertFalse(attributions_complete([{**publishable, "license_normalized": "cc-by-sa-4.0"}]))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "attributions.jsonl"
            write_attribution_file([publishable, nc], path)
            written = path.read_text(encoding="utf-8")
            self.assertIn("https://images.example.test/by.jpg", written)
            self.assertIn("cc-by-nc-4.0", written)
            http_row = {**publishable, "image_url": "http://images.example.test/by.jpg"}
            with self.assertRaises(RuntimeError) as raised:
                write_attribution_file([http_row], path)
            self.assertIn("https", str(raised.exception))

    def test_manifest_records_counts_and_a_content_hash(self):
        records = [_photo("boletus_edulis", f"login_{index}", index) for index in range(12)]
        records.extend(_photo("amanita_muscaria", f"login_{index}", index) for index in range(12))
        splits = split_by_observation(records, salt=FIXTURE_SALT)
        manifest = build_dataset_manifest(
            splits,
            salt=FIXTURE_SALT,
            share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
        )
        self.assertEqual(len(manifest["content_sha256"]), 64)
        self.assertNotIn(FIXTURE_SALT, json.dumps(manifest))
        total = 0
        for name in ("train", "val", "test"):
            block = manifest["splits"][name]
            self.assertEqual(block["rows"], sum(block["per_class"].values()))
            self.assertIn("boletus_edulis", block["per_class"])
            self.assertIn("amanita_muscaria", block["per_class"])
            total += block["rows"]
        self.assertEqual(total, len(records))
        again = build_dataset_manifest(
            {name: list(reversed(rows)) for name, rows in splits.items()},
            salt=FIXTURE_SALT,
            share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
        )
        self.assertEqual(again["content_sha256"], manifest["content_sha256"])
        other = split_by_observation(records, salt=FIXTURE_SALT + "-other")
        other_manifest = build_dataset_manifest(
            other,
            salt=FIXTURE_SALT + "-other",
            share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
        )
        self.assertEqual(other_manifest["content_sha256"], manifest["content_sha256"])
        self.assertEqual(
            {name: [row["file"] for row in rows] for name, rows in other.items()},
            {name: [row["file"] for row in rows] for name, rows in splits.items()},
        )
        self.assertNotEqual(other_manifest["salt_fingerprint"], manifest["salt_fingerprint"])
        self.assertEqual(len(manifest["salt_fingerprint"]), 8)
        self.assertNotIn(FIXTURE_SALT, manifest["salt_fingerprint"])
        changed = json.loads(json.dumps(splits))
        changed["train"][0]["license"] = "CC0"
        self.assertNotEqual(
            build_dataset_manifest(
                changed,
                salt=FIXTURE_SALT,
                share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
            )["content_sha256"],
            manifest["content_sha256"],
        )


    def test_placeholder_authors_do_not_glue_observations(self):
        placeholders = (
            "Unknown",
            "Anonymous",
            "anonim",
            "anonimowy",
            "nieznany",
            "unknown author",
            "no rights reserved",
            "-",
            "?",
            "n/a",
            "na",
            "iNaturalist",
            "GBIF",
            "Wikimedia Commons",
            "   ",
            "Danish Mycological Society",
        )
        for name in placeholders:
            left = {
                "class_id": "boletus_edulis",
                "author": name,
                "recordedBy": name,
                "rightsHolder": name,
                "inat_observer": name,
                "collector_key": f"author:{name.strip().casefold()}",
                "inat_observation_id": "100",
                "inat_photo_id": "1001",
                "image_url": "https://images.example.test/left.jpg",
                "file": "left.jpg",
                "license": "CC BY 4.0",
            }
            right = {
                **left,
                "inat_observation_id": "200",
                "inat_photo_id": "2002",
                "image_url": "https://images.example.test/right.jpg",
                "file": "right.jpg",
            }
            self.assertEqual(person_identity_keys(left), [], name)
            self.assertNotEqual(component_ids([left, right], FIXTURE_SALT)[0], component_ids([left, right], FIXTURE_SALT)[1], name)

    def test_same_photo_under_two_species_drops_every_row(self):
        photo = [
            {
                "class_id": "boletus_edulis",
                "inat_photo_id": "9",
                "inat_observation_id": "50",
                "license": "CC BY 4.0",
                "image_url": "https://images.example.test/same.jpg",
                "file": "a.jpg",
            },
            {
                "class_id": "amanita_muscaria",
                "inat_photo_id": "9",
                "inat_observation_id": "50",
                "license": "CC0",
                "image_url": "https://images.example.test/same.jpg",
                "file": "b.jpg",
            },
        ]
        kept, dropped = dedup_by_identity(photo)
        self.assertEqual(kept, [])
        self.assertEqual(len(dropped), 2)
        self.assertTrue(all(row["drop_reason"] == "class_conflict" for row in dropped))
        self.assertEqual(dropped[0]["conflict_classes"], ["amanita_muscaria", "boletus_edulis"])
        observation = [
            {
                "class_id": "boletus_edulis",
                "inat_observation_id": "77",
                "inat_photo_id": "1",
                "image_url": "https://images.example.test/one.jpg",
                "file": "one.jpg",
                "license": "CC BY 4.0",
            },
            {
                "class_id": "amanita_muscaria",
                "inat_observation_id": "77",
                "inat_photo_id": "2",
                "image_url": "https://images.example.test/two.jpg",
                "file": "two.jpg",
                "license": "CC BY 4.0",
            },
        ]
        kept_obs, dropped_obs = dedup_by_identity(observation)
        self.assertEqual(kept_obs, [])
        self.assertEqual(len(dropped_obs), 2)

    def test_held_out_does_not_pull_the_observer_into_test(self):
        ada = []
        for index, class_id in enumerate(("amanita_muscaria", "boletus_edulis", "cantharellus_cibarius")):
            ada.append(
                _photo(
                    class_id,
                    "ada_held",
                    index,
                    held_out_taxon=False,
                    file=f"ada-{class_id}.jpg",
                )
            )
        ada.append(
            _photo(
                "unknown_mushroom",
                "ada_held",
                9,
                held_out_taxon=True,
                file="ada-held.jpg",
            )
        )
        fillers = []
        for index in range(8):
            for class_id in ("amanita_muscaria", "boletus_edulis", "cantharellus_cibarius", "unknown_mushroom"):
                fillers.append(_photo(class_id, f"other_{index}", index, held_out_taxon=False))
        withheld: list[dict] = []
        splits = split_by_observation(
            ada + fillers,
            val_ratio=0.15,
            test_ratio=0.0,
            seed=42,
            salt=FIXTURE_SALT,
            withheld=withheld,
        )
        homes = {
            name
            for name, rows in splits.items()
            if any(row.get("inat_observer") == "ada_held" for row in rows)
        }
        self.assertEqual(len(homes), 1)
        self.assertNotIn("test", homes)
        self.assertEqual([row["file"] for row in withheld if row.get("inat_observer") == "ada_held"], ["ada-held.jpg"])
        placed = [row for rows in splits.values() for row in rows if row.get("file") == "ada-held.jpg"]
        self.assertEqual(placed, [])
        self.assertEqual(sum(1 for row in splits[next(iter(homes))] if row.get("inat_observer") == "ada_held"), 3)

    def test_per_class_component_share_gate_and_acknowledgement(self):
        dominated = [_photo("boletus_edulis", "one_author", index) for index in range(8)]
        mixed = [_photo("amanita_muscaria", f"login_{index}", index) for index in range(8)]
        placeholder = {
            "class_id": "boletus_edulis",
            "author": "no rights reserved",
            "inat_observer": "no rights reserved",
            "inat_photo_id": "nr-1",
            "inat_observation_id": "nr-1",
            "image_url": "https://images.example.test/nr.jpg",
            "file": "nr.jpg",
            "license": "CC0",
            "source": "inat",
        }
        df20 = {
            "class_id": "amanita_muscaria",
            "source": "df20",
            "author": "Tom Smidth",
            "photographer_rightsHolder": "Tom Smidth",
            "observationID": "df-1",
            "ImageUniqueID": "df-1-a",
            "df20_image_path": "df-1-a.JPG",
            "licence_note": "DF20 training-only; no per-image licence",
            "license": "",
            "file": "df.jpg",
        }
        splits = {
            "train": dominated + mixed[:4] + [placeholder, df20],
            "val": mixed[4:6],
            "test": mixed[6:],
        }
        report = measure_component_share(
            splits,
            salt=FIXTURE_SALT,
            acknowledgements={},
            limit=COMPONENT_SHARE_LIMIT,
        )
        boletus = report["per_class"]["boletus_edulis"]
        self.assertGreater(boletus["largest_component_share"], COMPONENT_SHARE_LIMIT)
        self.assertIn("boletus_edulis", report["hard_stop_classes"])
        self.assertGreater(boletus["no_rights_reserved_rows"], 0)
        self.assertGreater(report["per_class"]["amanita_muscaria"]["df20_rows"], 0)
        self.assertGreater(report["global"]["largest_component_share"], 0)
        self.assertNotIn("global_hard_stop", report)
        acknowledged = measure_component_share(
            splits,
            salt=FIXTURE_SALT,
            acknowledgements={"boletus_edulis": "one photographer until the pool is wider"},
            limit=COMPONENT_SHARE_LIMIT,
        )
        self.assertNotIn("boletus_edulis", acknowledged["hard_stop_classes"])
        self.assertTrue(any("boletus_edulis" in item for item in acknowledged["ship_blockers"]))
        self.assertTrue(any("not shippable" in item for item in acknowledged["ship_blockers"]))
        manifest = build_dataset_manifest(
            splits,
            salt=FIXTURE_SALT,
            share_config={
                "limit": COMPONENT_SHARE_LIMIT,
                "acknowledgements": {"boletus_edulis": "one photographer until the pool is wider"},
            },
        )
        self.assertIn("boletus_edulis", json.dumps(manifest["component_share"]["acknowledgements"]))
        self.assertNotIn(FIXTURE_SALT, json.dumps(manifest))

    def test_prepare_writes_nothing_on_an_unacknowledged_hard_stop(self):
        dominated = [_photo("boletus_edulis", "one_author", index) for index in range(8)]
        others = [_photo("boletus_edulis", f"login_{index}", index) for index in range(2)]
        over_limit = {
            "train": dominated,
            "val": others[:1],
            "test": others[1:],
        }
        empty_val = {
            "train": [_photo("amanita_muscaria", f"ada_{index}", index) for index in range(8)],
            "val": [],
            "test": [_photo("amanita_muscaria", f"bea_{index}", index) for index in range(2)],
        }
        share_config = {"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}}
        for splits in (over_limit, empty_val):
            with tempfile.TemporaryDirectory() as tmp:
                directory = Path(tmp)
                (directory / "splits.json").write_text("{}", encoding="utf-8")
                (directory / "dataset_manifest.json").write_text("{}", encoding="utf-8")
                prepared = [row for rows in splits.values() for row in rows]
                with self.assertRaises(SystemExit) as raised:
                    write_prepare_outputs(
                        directory,
                        prepared=prepared,
                        splits=splits,
                        dropped=[],
                        identity_dropped=[],
                        skipped=[],
                        withheld=[],
                        salt=FIXTURE_SALT,
                        share_config=share_config,
                        model_png_size=224,
                    )
                self.assertIn("No split files were written", str(raised.exception))
                self.assertFalse((directory / "splits.json").exists())
                self.assertFalse((directory / "dataset_manifest.json").exists())
                self.assertFalse((directory / "dedup_report.json").exists())
                self.assertFalse((directory / "attributions.dedup.jsonl").exists())
        balanced = [_photo("cantharellus_cibarius", f"login_{index}", index) for index in range(10)]
        clean = {"train": balanced[:6], "val": balanced[6:8], "test": balanced[8:]}
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            manifest = write_prepare_outputs(
                directory,
                prepared=balanced,
                splits=clean,
                dropped=[],
                identity_dropped=[],
                skipped=[],
                withheld=[],
                salt=FIXTURE_SALT,
                share_config=share_config,
                model_png_size=224,
            )
            self.assertEqual(manifest["component_share"]["hard_stop_classes"], [])
            self.assertTrue((directory / "splits.json").is_file())
            self.assertTrue((directory / "dataset_manifest.json").is_file())
        acknowledged = {
            "limit": COMPONENT_SHARE_LIMIT,
            "acknowledgements": {"boletus_edulis": "one photographer until the pool is wider"},
        }
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            manifest = write_prepare_outputs(
                directory,
                prepared=[row for rows in over_limit.values() for row in rows],
                splits=over_limit,
                dropped=[],
                identity_dropped=[],
                skipped=[],
                withheld=[],
                salt=FIXTURE_SALT,
                share_config=acknowledged,
                model_png_size=224,
            )
            self.assertEqual(manifest["component_share"]["hard_stop_classes"], [])
            self.assertTrue(manifest["component_share"]["ship_blockers"])
            written = json.loads((directory / "dataset_manifest.json").read_text(encoding="utf-8"))
            self.assertTrue(written["component_share"]["ship_blockers"])

    def test_missing_component_share_measurement_is_a_blocker(self):
        self.assertTrue(component_share_blockers({}))
        self.assertTrue(component_share_blockers({"splits": {"train": {"rows": 1}}}))
        self.assertEqual(
            component_share_blockers(
                {"component_share": {"ship_blockers": [], "hard_stop_classes": []}}
            ),
            [],
        )
        self.assertTrue(
            any(
                item.startswith("boletus_edulis:")
                for item in component_share_blockers(
                    {
                        "component_share": {
                            "ship_blockers": [],
                            "hard_stop_classes": ["boletus_edulis"],
                        }
                    }
                )
            )
        )

    def test_hard_stop_is_not_hidden_by_a_class_id_prefix(self):
        longer_already_recorded = component_share_blockers(
            {
                "component_share": {
                    "ship_blockers": [
                        "boletus_edulis: one photographer. The model is not shippable."
                    ],
                    "hard_stop_classes": ["boletus", "boletus_edulis"],
                }
            }
        )
        self.assertEqual(
            [item for item in longer_already_recorded if item.startswith("boletus_edulis:")],
            ["boletus_edulis: one photographer. The model is not shippable."],
        )
        self.assertTrue(any(item.startswith("boletus:") for item in longer_already_recorded))
        shorter_already_recorded = component_share_blockers(
            {
                "component_share": {
                    "ship_blockers": ["boletus: acknowledged. The model is not shippable."],
                    "hard_stop_classes": ["boletus", "boletus_edulis"],
                }
            }
        )
        self.assertEqual(
            [item for item in shorter_already_recorded if item.startswith("boletus:")],
            ["boletus: acknowledged. The model is not shippable."],
        )
        self.assertTrue(any(item.startswith("boletus_edulis:") for item in shorter_already_recorded))
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "dataset_manifest.json"
            self.assertTrue(blockers_from_manifest_file(missing))
            present = Path(tmp) / "old.json"
            present.write_text(json.dumps({"content_sha256": "abc"}), encoding="utf-8")
            reasons = blockers_from_manifest_file(present)
            self.assertTrue(any("component_share" in item for item in reasons))

    def test_share_limit_above_the_constant_is_refused(self):
        self.assertEqual(COMPONENT_SHARE_LIMIT, 0.50)
        checked_in = load_share_config(ACK_PATH)
        self.assertLessEqual(checked_in["limit"], COMPONENT_SHARE_LIMIT)
        self.assertIn("cortinarius_orellanus", checked_in["acknowledgements"])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "share.json"
            path.write_text(json.dumps({"limit": 0.9, "acknowledgements": []}), encoding="utf-8")
            with self.assertRaises(ValueError) as raised:
                load_share_config(path)
            self.assertIn("0.9", str(raised.exception))
            path.write_text(json.dumps({"limit": 0.1, "acknowledgements": []}), encoding="utf-8")
            self.assertEqual(load_share_config(path)["limit"], 0.1)
        with self.assertRaises(ValueError):
            measure_component_share(
                {"train": [], "val": [], "test": []},
                salt=FIXTURE_SALT,
                limit=0.9,
            )

    def test_external_jsonl_rows_get_a_collector_key(self):
        import csv

        from import_external import import_directory

        header = [
            "species",
            "image_url",
            "author",
            "license",
            "license_url",
            "source_url",
            "mo_observation_id",
            "id_confidence",
            "inat_photo_id",
            "inat_observation_id",
            "commons_file",
            "inat_observer",
        ]
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            path = folder / "boletus_edulis.csv"
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=header)
                writer.writeheader()
                writer.writerow(
                    {
                        "species": "Boletus edulis",
                        "image_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/88001/original.jpg",
                        "author": "Ada Hunter",
                        "license": "CC BY 4.0",
                        "license_url": "https://creativecommons.org/licenses/by/4.0/",
                        "source_url": "https://www.inaturalist.org/observations/555001",
                        "mo_observation_id": "",
                        "id_confidence": "research_grade",
                        "inat_photo_id": "88001",
                        "inat_observation_id": "555001",
                        "commons_file": "",
                        "inat_observer": "Ada Hunter",
                    }
                )
            rows, _report = import_directory(folder)
        self.assertEqual(len(rows), 1)
        external = rows[0]
        self.assertEqual(external["inat_observer"], "Ada Hunter")
        self.assertTrue(str(external["collector_key"]).startswith("inat:"))
        gbif = {
            "class_id": external["class_id"],
            "occurrence_key": 445566,
            "source_url": "https://www.inaturalist.org/observations/555001",
            "image_url": "https://static.inaturalist.org/photos/88002/large.jpeg",
            "recordedBy": "Ada Hunter",
            "license": "CC BY 4.0",
            "license_normalized": "cc-by-4.0",
            "file": "gbif.jpg",
        }
        self.assertEqual(component_ids([external, gbif], FIXTURE_SALT)[0], component_ids([external, gbif], FIXTURE_SALT)[1])


if __name__ == "__main__":
    unittest.main()
