"""Tests for the local-image importer (training/import_local_images.py).

This is the third dataset path: photos the user already has on disk. Each listed
image is copied into a staging folder and becomes a ``downloaded`` row in the
external JSONL, using the same license decision, identity dedup, collector cap,
and df20 handling as import_external.py. No real images are needed; a tiny byte
string stands in for every photo.
"""

from __future__ import annotations

import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from import_external import is_publishable
from import_local_images import import_local_images

_LABELS = Path(__file__).resolve().parents[2] / "assets" / "models" / "labels.json"

_HEADER = [
    "image",
    "species",
    "author",
    "license",
    "license_url",
    "source_url",
    "image_url",
    "inat_photo_id",
    "inat_observation_id",
    "mo_observation_id",
    "commons_file",
    "inat_observer",
    "id_confidence",
]

_BY_40 = "https://creativecommons.org/licenses/by/4.0/"
_BY_NC_40 = "https://creativecommons.org/licenses/by-nc/4.0/"
_ZERO = "https://creativecommons.org/publicdomain/zero/1.0/"


def _write_manifest(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=_HEADER)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in _HEADER})


def _photo(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\xff\xd8\xff\xe0fake-jpeg-bytes")


class LocalImportTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.staging = self.root / "staging"
        self.external = self.root / "external.jsonl"
        self.manifest = self.root / "manifest.csv"

    def _row(self, **overrides) -> dict:
        row = {
            "image": str(self.root / "img.jpg"),
            "species": "Amanita phalloides",
            "author": "Ada",
            "license": "CC0",
            "license_url": _ZERO,
            "source_url": "https://www.example.test/obs/1",
            "image_url": "https://images.example.test/a.jpg",
            "inat_photo_id": "1",
            "inat_observation_id": "10",
            "inat_observer": "ada",
            "id_confidence": "research_grade",
        }
        row.update(overrides)
        return row

    def _run(self, rows: list[dict], **kwargs):
        _photo(self.root / "img.jpg")
        _write_manifest(self.manifest, rows)
        return import_local_images(
            self.manifest,
            staging_dir=self.staging,
            external=self.external,
            labels=_LABELS,
            **kwargs,
        )

    def test_stages_and_writes_a_cc0_row(self):
        rows, report = self._run([self._row()])
        self.assertEqual(len(rows), 1)
        self.assertEqual(report["images_staged"], 1)
        self.assertEqual(report["rows_written"], 1)
        self.assertEqual(report["publishable"], 1)
        self.assertEqual(report["training_only"], 0)
        self.assertEqual(rows[0]["class_id"], "amanita_phalloides")
        self.assertTrue(rows[0]["downloaded"])
        self.assertTrue(rows[0]["file"].startswith("staging/"))
        staged = self.root / rows[0]["file"]
        self.assertTrue(staged.is_file())
        self.assertEqual(report["by_class"], {"amanita_phalloides": 1})

    def test_rejects_license_url_mismatch(self):
        rows, report = self._run([self._row(license="CC BY", license_url=_ZERO)])
        self.assertEqual(rows, [])
        self.assertEqual(report["rejected_license_url_mismatch"], 1)
        self.assertEqual(report["manifest_rows"], 1)

    def test_rejects_unmapped_species(self):
        rows, report = self._run([self._row(species="Unknown mushroom")])
        self.assertEqual(rows, [])
        self.assertEqual(report["rejected_unmapped"], 1)
        self.assertIn("Unknown mushroom", report["unmapped_species"])

    def test_rejects_missing_image(self):
        rows, report = self._run([self._row(image=str(self.root / "does-not-exist.jpg"))])
        self.assertEqual(rows, [])
        self.assertEqual(report["rejected_missing_image"], 1)

    def test_rejects_empty_author(self):
        rows, report = self._run([self._row(author="   ")])
        self.assertEqual(rows, [])
        self.assertEqual(report["rejected_missing_author"], 1)

    def test_training_only_row_when_nc_license(self):
        rows, report = self._run([self._row(species="Boletus edulis", license="CC BY-NC 4.0", license_url=_BY_NC_40)])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["class_id"], "boletus_edulis")
        self.assertEqual(rows[0]["license_normalized"], "cc-by-nc-4.0")
        self.assertTrue(rows[0]["downloaded"])
        self.assertEqual(rows[0]["usage"], "training_only")
        self.assertEqual(report["training_only"], 1)
        self.assertEqual(report["publishable"], 0)

    def test_cc_by_row_is_staged(self):
        rows, report = self._run([self._row(species="Boletus edulis", license="CC BY", license_url=_BY_40)])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["class_id"], "boletus_edulis")
        self.assertEqual(rows[0]["license_normalized"], "cc-by-4.0")
        self.assertTrue(rows[0]["downloaded"])
        self.assertEqual(report["by_class"], {"boletus_edulis": 1})

    def test_training_only_when_image_url_empty_still_trains(self):
        # A local photo can have no online URL. The row still trains but cannot
        # be published because is_publishable needs an https photo URL.
        rows, report = self._run([self._row(image_url="", source_url="")])
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["downloaded"])
        self.assertFalse(is_publishable(rows[0]))

    def _existing_row(self, **overrides) -> dict:
        row = {
            "source": "csv",
            "class_id": "amanita_phalloides",
            "taxon_name": "Amanita phalloides",
            "queried_name": "Amanita phalloides",
            "species": "Amanita phalloides",
            "held_out_taxon": False,
            "toxic": True,
            "probe": False,
            "genus_relation": "",
            "image_url": "https://remote.example.test/a.jpg",
            "source_url": "https://www.example.test/obs/0",
            "creator": "Ada",
            "author": "Ada",
            "license": "CC BY",
            "license_url": _BY_40,
            "license_normalized": "cc-by-4.0",
            "usage": "publishable",
            "unverified": False,
            "id_confidence": "research_grade",
            "recorded_by": "ada",
            "collector_key": "inat:ada",
            "occurrence_key": "inat:10",
            "observation_id": "10",
            "_order": 1,
            "downloaded": False,
            "file": "",
            "inat_observer": "ada",
            "inat_photo_id": "1",
            "inat_observation_id": "10",
            "mo_observation_id": "",
            "inat_file": "",
            "commons_file": "",
        }
        row.update(overrides)
        return row

    def test_merges_with_existing_external_rows(self):
        self.external.write_text(json.dumps(self._existing_row()) + "\n", encoding="utf-8")
        rows, report = self._run([self._row(inat_photo_id="2", inat_observation_id="11")])
        self.assertEqual(report["existing_external_rows"], 1)
        self.assertEqual(len(rows), 2)
        self.assertEqual(report["rows_written"], 2)
        self.assertEqual([r["class_id"] for r in rows], ["amanita_phalloides", "amanita_phalloides"])
        written = [json.loads(line) for line in self.external.read_text(encoding="utf-8").splitlines() if line.strip()]
        self.assertEqual(len(written), 2)

    def test_collector_cap_limits_per_author(self):
        rows = [
            self._row(inat_photo_id=str(i), inat_observation_id=str(100 + i), author="Ada")
            for i in range(1, 6)
        ]
        _, report = self._run(rows, max_per_collector=2)
        self.assertEqual(report["dropped_collector_cap"], 3)
        self.assertEqual(report["rows_written"], 2)

    def test_publishable_only_writes_only_publishable(self):
        rows = [
            self._row(inat_photo_id="1", inat_observation_id="10"),
            self._row(inat_photo_id="2", inat_observation_id="11", image_url=""),
        ]
        published, report = self._run(rows, publishable_only=True)
        self.assertTrue(all(is_publishable(r) for r in published))
        self.assertEqual(report["training_only"], 0)

    def test_dedup_keeps_stricter_license_on_shared_observation(self):
        # An existing CC BY copy of inat photo/obs 10 and a local CC0 copy of the
        # same observation merge; the stricter CC BY wins, the CC0 copy drops.
        self.external.write_text(json.dumps(self._existing_row()) + "\n", encoding="utf-8")
        rows, report = self._run(
            [self._row(inat_photo_id="1", inat_observation_id="10", license="CC0", license_url=_ZERO)]
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["license_normalized"], "cc-by-4.0")
        self.assertEqual(report["dropped_looser_license"], 1)

    def test_include_df20_flag_is_reported(self):
        _, report = self._run([self._row()])
        self.assertFalse(report["include_df20"])
        self.assertEqual(report["excluded_df20"], 0)


if __name__ == "__main__":
    unittest.main()

