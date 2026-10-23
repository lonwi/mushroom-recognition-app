"""Synthetic CSV fixtures for the external photo importer.

No real images and no NC photo dumps. Licenses, the collector cap, https
rewrites, and the unverified flag are checked on rows this file writes.
"""

from __future__ import annotations

import csv
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluate import attributions_complete, publishable_license_id
from import_external import (
    apply_collector_cap,
    import_directory,
    parse_textual_license,
    training_eligible,
)
from licenses import normalize_cc_license
from prepare_data import _usable_records
from url_safety import force_https_url

_PHOTO_HEADER = [
    "species",
    "image_url",
    "author",
    "license",
    "source_url",
    "mo_observation_id",
    "id_confidence",
    "inat_photo_id",
    "inat_observation_id",
    "commons_file",
    "inat_observer",
]


def _write_csv(path: Path, header: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=header)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in header})


def _photo(path: Path, rows: list[dict]) -> None:
    _write_csv(path, _PHOTO_HEADER, rows)


class LicenseParseTest(unittest.TestCase):
    def test_publishable_and_training_only_text(self):
        cases = {
            "CC BY": ("cc-by", "publishable"),
            "CC-BY-4.0": ("cc-by-4.0", "publishable"),
            "CC BY 4.0": ("cc-by-4.0", "publishable"),
            "CC BY 2.0": ("cc-by-2.0", "publishable"),
            "CC0": ("cc0-1.0", "publishable"),
            "CC0 1.0": ("cc0-1.0", "publishable"),
            "CC BY-NC": ("cc-by-nc", "training_only"),
            "CC-BY-NC-4.0": ("cc-by-nc-4.0", "training_only"),
            "https://creativecommons.org/licenses/by/4.0/": ("cc-by-4.0", "publishable"),
            "https://creativecommons.org/licenses/by-nc/4.0/": ("cc-by-nc-4.0", "training_only"),
            "https://creativecommons.org/publicdomain/zero/1.0/": ("cc0-1.0", "publishable"),
        }
        for raw, expected in cases.items():
            parsed = parse_textual_license(raw)
            self.assertIsNotNone(parsed, raw)
            self.assertEqual((parsed["license_normalized"], parsed["usage"]), expected, raw)

    def test_rejects_nd_sa_and_unknown(self):
        for raw in (
            "CC BY-NC-ND",
            "CC BY-NC-SA",
            "CC BY-SA",
            "CC BY-ND",
            "CC-BY-NC-ND-4.0",
            "CC BY-NC-SA 4.0",
            "https://creativecommons.org/licenses/by-nc-nd/4.0/",
            "https://creativecommons.org/licenses/by-sa/4.0/",
            "https://creativecommons.org/licenses/by-nd/4.0/",
            "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "all rights reserved",
            "Public Domain (Wikipedia compatible)",
            "",
            None,
        ):
            self.assertIsNone(parse_textual_license(raw), raw)

    def test_gbif_filter_still_rejects_textual_and_nc_urls(self):
        self.assertIsNone(normalize_cc_license("CC BY"))
        self.assertIsNone(normalize_cc_license("CC BY-NC"))
        self.assertIsNone(normalize_cc_license("http://creativecommons.org/licenses/by-nc/4.0/"))
        self.assertEqual(
            normalize_cc_license("http://creativecommons.org/licenses/by/4.0/"),
            "cc-by-4.0",
        )

    def test_ship_gate_rejects_nc_training_only_and_unverified(self):
        ok = {
            "creator": "Ada",
            "license_normalized": "cc-by-4.0",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
        }
        self.assertTrue(publishable_license_id("cc-by-4.0"))
        self.assertTrue(publishable_license_id("cc0-1.0"))
        self.assertFalse(publishable_license_id("cc-by-nc-4.0"))
        self.assertFalse(publishable_license_id("cc-by-sa-4.0"))
        self.assertFalse(publishable_license_id("cc-by-nd-4.0"))
        self.assertFalse(publishable_license_id("cc-by"))
        self.assertTrue(attributions_complete([ok]))
        self.assertFalse(attributions_complete([{**ok, "license_normalized": "cc-by-nc-4.0"}]))
        self.assertFalse(attributions_complete([{**ok, "usage": "training_only"}]))
        self.assertFalse(attributions_complete([{**ok, "unverified": True}]))
        self.assertFalse(attributions_complete([{**ok, "license_normalized": "df20"}]))


class ImportDirectoryTest(unittest.TestCase):
    def setUp(self):
        import tempfile

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)

    def _base(self, **overrides) -> dict:
        row = {
            "species": "Amanita phalloides",
            "image_url": "https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpg",
            "author": "Ada Łąka",
            "license": "CC BY",
            "source_url": "https://www.inaturalist.org/observations/10",
            "mo_observation_id": "",
            "id_confidence": "research_grade",
            "inat_photo_id": "1",
            "inat_observation_id": "10",
            "commons_file": "",
            "inat_observer": "ada",
        }
        row.update(overrides)
        return row

    def test_https_cap_unverified_and_species_map(self):
        _photo(
            self.root / "amanita_phalloides.csv",
            [
                self._base(
                    image_url="http://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpg",
                    source_url="http://www.inaturalist.org/observations/10",
                    inat_photo_id="1",
                    inat_observation_id="10",
                    inat_observer="ada",
                ),
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/2/large.jpg",
                    source_url="https://www.inaturalist.org/observations/11",
                    inat_photo_id="2",
                    inat_observation_id="11",
                    license="CC0",
                    inat_observer="ada",
                ),
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/3/large.jpg",
                    source_url="https://www.inaturalist.org/observations/12",
                    inat_photo_id="3",
                    inat_observation_id="12",
                    inat_observer="ada",
                ),
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/4/large.jpg",
                    source_url="https://www.inaturalist.org/observations/13",
                    inat_photo_id="4",
                    inat_observation_id="13",
                    inat_observer="bea",
                    author="Bea",
                ),
            ],
        )
        _photo(
            self.root / "amanita_phalloides_by_nc.csv",
            [
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpg",
                    inat_photo_id="1",
                    license="CC BY-NC",
                    inat_observer="ada",
                ),
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/9/large.jpg",
                    source_url="https://www.inaturalist.org/observations/19",
                    inat_photo_id="9",
                    inat_observation_id="19",
                    license="CC BY-NC",
                    inat_observer="cyra",
                    author="Cyra",
                ),
            ],
        )
        _photo(
            self.root / "amanita_phalloides_niezweryfikowane.csv",
            [
                self._base(
                    image_url="http://images.example.test/unverified.jpg",
                    source_url="https://www.gbif.org/occurrence/6495160663",
                    license="CC BY 4.0",
                    id_confidence="research_grade",
                    inat_photo_id="",
                    inat_observation_id="",
                    inat_observer="",
                    author="Inger Example",
                )
            ],
        )
        _photo(
            self.root / "neoboletus_luridiformis.csv",
            [
                self._base(
                    species="Neoboletus erythropus",
                    image_url="https://images.example.test/neo.jpg",
                    source_url="https://www.inaturalist.org/observations/77",
                    inat_photo_id="77",
                    inat_observation_id="77",
                    inat_observer="neo",
                    author="Neo",
                )
            ],
        )
        _photo(
            self.root / "inocybe_erubescens.csv",
            [
                self._base(
                    species="Inocybe erubescens",
                    image_url="https://images.example.test/ino.jpg",
                    source_url="https://www.inaturalist.org/observations/88",
                    inat_photo_id="88",
                    inat_observation_id="88",
                    inat_observer="ino",
                    author="Ino",
                )
            ],
        )
        _photo(
            self.root / "rubroboletus_satanas.csv",
            [
                self._base(
                    species="Rubroboletus satanas",
                    image_url="https://images.example.test/satanas.jpg",
                    source_url="https://www.inaturalist.org/observations/99",
                    inat_photo_id="99",
                    inat_observation_id="99",
                    inat_observer="sat",
                    author="Sat",
                )
            ],
        )
        _photo(
            self.root / "morchella_esculenta.csv",
            [
                self._base(
                    species="Morchella esculenta",
                    image_url="https://images.example.test/old-morel.jpg",
                    inat_photo_id="1",
                    inat_observation_id="1",
                    author="Old",
                    inat_observer="old",
                )
            ],
        )
        _photo(
            self.root / "morchella_esculenta_v2.csv",
            [
                self._base(
                    species="Morchella esculenta",
                    image_url="https://upload.wikimedia.org/wikipedia/commons/5/53/morel.jpg?utm_source=commons",
                    source_url="https://commons.wikimedia.org/wiki/File:morel.jpg",
                    license="CC BY 2.0",
                    id_confidence="commons_expert_described",
                    inat_photo_id="",
                    inat_observation_id="",
                    commons_file="morel.jpg",
                    inat_observer="",
                    author="Jay Example",
                    mo_observation_id="555",
                )
            ],
        )
        _photo(
            self.root / "calocybe_gambosa.csv",
            [
                self._base(
                    species="Calocybe gambosa",
                    image_url="https://images.example.test/calocybe.jpg",
                    inat_photo_id="500",
                    license="CC BY",
                )
            ],
        )
        _photo(
            self.root / "rejected.csv",
            [
                self._base(
                    image_url="https://images.example.test/nd.jpg",
                    inat_photo_id="501",
                    inat_observation_id="501",
                    license="CC BY-NC-ND",
                    inat_observer="nd",
                ),
                self._base(
                    image_url="https://images.example.test/sa.jpg",
                    inat_photo_id="502",
                    license="CC BY-SA",
                    inat_observer="sa",
                ),
                self._base(
                    image_url="https://images.example.test/noname.jpg",
                    inat_photo_id="503",
                    author="",
                    license="CC BY",
                    inat_observer="",
                ),
            ],
        )
        _write_csv(
            self.root / "amanita_phalloides_meta.csv",
            ["source_key", "source", "country", "continent", "date", "lat", "lon", "dataset", "verification", "image_url"],
            [
                {
                    "source_key": "inat:11",
                    "source": "inat",
                    "country": "PL",
                    "continent": "Europe",
                    "date": "2024-09-01",
                    "lat": "52.23",
                    "lon": "21.01",
                    "dataset": "iNaturalist",
                    "verification": "research_grade",
                    "image_url": "http://inaturalist-open-data.s3.amazonaws.com/photos/2/large.jpg",
                }
            ],
        )
        _write_csv(
            self.root / "_podsumowanie_gatunki.csv",
            ["app_id", "scientific_name"],
            [{"app_id": "amanita_phalloides", "scientific_name": "Amanita phalloides"}],
        )
        _write_csv(
            self.root / "df20" / "boletus_edulis.csv",
            [
                "species",
                "df20_name_used",
                "df20_image_path",
                "ImageUniqueID",
                "observationID",
                "gbifID",
                "photographer_rightsHolder",
                "date",
                "countryCode",
                "original_split",
                "df24_split",
                "licence_note",
            ],
            [
                {
                    "species": "Boletus edulis",
                    "df20_name_used": "Boletus edulis",
                    "df20_image_path": "223-1.JPG",
                    "ImageUniqueID": "223-1",
                    "observationID": "223",
                    "gbifID": "223",
                    "photographer_rightsHolder": "Benny Example",
                    "date": "1994-09-04",
                    "countryCode": "DK",
                    "original_split": "train",
                    "df24_split": "train",
                    "licence_note": "DF20 training-only; no per-image licence",
                },
                {
                    "species": "Boletus edulis",
                    "df20_name_used": "Boletus edulis",
                    "df20_image_path": "224-1.JPG",
                    "ImageUniqueID": "224-1",
                    "observationID": "224",
                    "gbifID": "224",
                    "photographer_rightsHolder": "Benny Example",
                    "date": "1995-09-04",
                    "countryCode": "DK",
                    "original_split": "test",
                    "df24_split": "test",
                    "licence_note": "DF20 training-only; no per-image licence",
                },
            ],
        )
        _photo(
            self.root / "boletus_edulis.csv",
            [
                self._base(
                    species="Boletus edulis",
                    image_url="https://images.example.test/boletus.jpg",
                    source_url="https://www.inaturalist.org/observations/300",
                    inat_photo_id="300",
                    inat_observation_id="300",
                    inat_observer="",
                    author="Benny Example",
                    license="CC BY",
                )
            ],
        )

        rows, report = import_directory(self.root, max_per_collector=2)
        by_photo = {row.get("inat_photo_id") or row.get("commons_file") or row.get("df20_image_id"): row for row in rows}

        ada_verified = [
            row
            for row in rows
            if row["class_id"] == "amanita_phalloides" and row["collector_key"] == "inat:ada" and not row["unverified"]
        ]
        self.assertEqual(len(ada_verified), 2)
        self.assertTrue(all(row["usage"] == "publishable" for row in ada_verified))
        first = by_photo["1"]
        self.assertEqual(first["image_url"], "https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpg")
        self.assertTrue(first["source_url"].startswith("https://"))
        self.assertEqual(first["license_normalized"], "cc-by")
        self.assertEqual(first["usage"], "publishable")
        self.assertEqual(first["creator"], "Ada Łąka")
        self.assertEqual(first["inat_observer"], "ada")
        self.assertEqual(first["inat_observation_id"], "10")
        self.assertEqual(first["inaturalist_observation_id"], "10")
        self.assertEqual(first["occurrence_key"], "inat:10")
        self.assertNotIn("9", {row["inat_photo_id"] for row in ada_verified})

        joined = by_photo["2"]
        self.assertEqual(joined["country"], "PL")
        self.assertEqual(joined["event_date"], "2024-09-01")
        self.assertEqual(joined["decimal_latitude"], 52.23)
        self.assertEqual(joined["decimal_longitude"], 21.01)
        self.assertEqual(joined["license_normalized"], "cc0-1.0")

        unverified = [row for row in rows if row["unverified"]]
        self.assertEqual(len(unverified), 1)
        self.assertEqual(unverified[0]["creator"], "Inger Example")
        self.assertTrue(unverified[0]["image_url"].startswith("https://"))
        self.assertEqual(unverified[0]["gbif_id"], "6495160663")
        self.assertEqual(unverified[0]["occurrence_key"], "gbif:6495160663")
        self.assertFalse(training_eligible(unverified[0]))

        neo = by_photo["77"]
        self.assertEqual(neo["class_id"], "neoboletus_luridiformis")
        self.assertEqual(neo["taxon_name"], "Neoboletus erythropus")

        ino = by_photo["88"]
        self.assertEqual(ino["class_id"], "unknown_mushroom")
        self.assertEqual(ino["taxon_name"], "Inosperma erubescens")
        self.assertTrue(ino["held_out_taxon"])
        self.assertTrue(ino["toxic"])

        satanas = by_photo["99"]
        self.assertEqual(satanas["class_id"], "unknown_mushroom")
        self.assertTrue(satanas["probe"])
        self.assertTrue(satanas["held_out_taxon"])

        morel = by_photo["morel.jpg"]
        self.assertEqual(morel["class_id"], "morchella_esculenta")
        self.assertEqual(morel["source"], "commons")
        self.assertEqual(morel["creator"], "Jay Example")
        self.assertEqual(morel["recorded_by"], "Jay Example")
        self.assertEqual(morel["inat_observer"], "")
        self.assertEqual(morel["mo_observation_id"], "555")
        self.assertEqual(morel["commons_file"], "morel.jpg")
        self.assertTrue(morel["image_url"].startswith("https://upload.wikimedia.org/"))
        self.assertIn("utm_source=commons", morel["image_url"])
        self.assertFalse(any("old-morel" in row["image_url"] for row in rows))

        self.assertNotIn("calocybe_gambosa", {row["class_id"] for row in rows})
        self.assertGreaterEqual(report["rejected_unmapped"], 1)
        self.assertIn("Calocybe gambosa", report["unmapped_species"])
        self.assertGreaterEqual(report["rejected_license"], 2)
        self.assertGreaterEqual(report["rejected_missing_author"], 1)
        self.assertGreaterEqual(report["dropped_duplicate"], 1)
        self.assertGreaterEqual(report["dropped_collector_cap"], 1)

        df20_rows = [row for row in rows if row["source"] == "df20"]
        self.assertEqual(len(df20_rows), 1)
        self.assertEqual(df20_rows[0]["usage"], "training_only")
        self.assertEqual(df20_rows[0]["license_normalized"], "df20")
        self.assertEqual(df20_rows[0]["creator"], "Benny Example")
        self.assertEqual(df20_rows[0]["df20_observation_id"], "223")
        self.assertEqual(df20_rows[0]["occurrence_key"], "df20:223")
        self.assertFalse(df20_rows[0]["unverified"])
        boletus_publishable = [
            row for row in rows if row["class_id"] == "boletus_edulis" and row["usage"] == "publishable"
        ]
        self.assertEqual(len(boletus_publishable), 1)
        self.assertEqual(boletus_publishable[0]["creator"], "Benny Example")
        self.assertTrue(all(row["creator"] for row in rows))

        publishable_only, only_report = import_directory(self.root, max_per_collector=2, publishable_only=True)
        self.assertTrue(all(row["usage"] == "publishable" for row in publishable_only))
        self.assertEqual(only_report["training_only"], 0)
        self.assertTrue(all(training_eligible(row, publishable_only=True) or row["unverified"] for row in publishable_only))

    def test_prepare_skips_unverified_and_can_drop_training_only(self):
        folder = self.root / "jsonl"
        folder.mkdir()
        path = folder / "rows.jsonl"
        rows = [
            {"downloaded": True, "unverified": True, "usage": "publishable", "class_id": "a", "file": "images/a.jpg"},
            {"downloaded": False, "unverified": False, "usage": "training_only", "class_id": "a", "file": "images/b.jpg"},
            {"downloaded": False, "unverified": False, "usage": "publishable", "class_id": "a", "file": ""},
        ]
        path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        kept, skipped = _usable_records([path])
        self.assertEqual(kept, [])
        self.assertEqual([item["skip_reason"] for item in skipped], ["unverified"])
        flagged = folder / "flagged.jsonl"
        flagged.write_text(
            json.dumps(
                {
                    "downloaded": True,
                    "unverified": False,
                    "usage": "training_only",
                    "class_id": "a",
                    "file": "images/b.jpg",
                }
            )
            + "\n",
            encoding="utf-8",
        )
        kept, skipped = _usable_records([flagged], publishable_only=True)
        self.assertEqual(kept, [])
        self.assertEqual([item["skip_reason"] for item in skipped], ["training_only"])


class CollectorCapTest(unittest.TestCase):
    def test_whole_observations_and_per_class(self):
        rows = []
        order = 1
        for obs, count in (("obs-a", 2), ("obs-b", 2), ("obs-c", 1)):
            for _ in range(count):
                rows.append(
                    {
                        "_order": order,
                        "class_id": "amanita_phalloides",
                        "collector_key": "inat:ada",
                        "occurrence_key": obs,
                        "unverified": False,
                    }
                )
                order += 1
        rows.append(
            {
                "_order": order,
                "class_id": "boletus_edulis",
                "collector_key": "inat:ada",
                "occurrence_key": "other",
                "unverified": False,
            }
        )
        kept, dropped = apply_collector_cap(rows, 3)
        phalloides = [row for row in kept if row["class_id"] == "amanita_phalloides"]
        self.assertEqual(len(phalloides), 3)
        self.assertEqual({row["occurrence_key"] for row in phalloides}, {"obs-a", "obs-c"})
        self.assertEqual(len(dropped), 2)
        self.assertEqual([row for row in kept if row["class_id"] == "boletus_edulis"], [rows[-1]])

    def test_https_rewrites_port_80(self):
        self.assertEqual(
            force_https_url("http://images.example.test:80/a.jpg"),
            "https://images.example.test/a.jpg",
        )
        self.assertEqual(
            force_https_url("http://images.example.test/a.jpg"),
            "https://images.example.test/a.jpg",
        )
        self.assertEqual(
            force_https_url("https://images.example.test/a.jpg"),
            "https://images.example.test/a.jpg",
        )
        self.assertEqual(force_https_url("http://[::1]/a.jpg"), "https://[::1]/a.jpg")


if __name__ == "__main__":
    unittest.main()
