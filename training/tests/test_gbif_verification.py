"""GBIF identification status on fetch rows and collector CSVs.

Owner decision 2026-10-31 08:13, recorded in #74: a row with no verification
status stays eligible for train and for test, iNaturalist research-grade
counts as verified, and this change adds no split flag. Only an explicit
``unverified`` status is rejected. Comparison is the whole value after
stripping and case-folding.

Collector CSVs may set ``id_confidence`` to ``gbif_no_status`` or
``gbif_not_validated`` and may carry ``identificationVerificationStatus``.
For those two confidence values the status column decides. ``gbif_no_status``
with an empty status is kept. ``gbif_not_validated`` with no status keeps
today's rejection. A non-empty status other than ``unverified`` (for example
``Approved | Expert | Evidence`` or ``Confident``) is kept. Other
``id_confidence`` values are unchanged.
"""

from __future__ import annotations

import csv
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_gbif
from component_share import COMPONENT_SHARE_LIMIT
from import_external import import_directory
from prepare_data import _usable_records, write_prepare_outputs
from salt_fixture import FIXTURE_SALT
from split import split_by_observation

_BY = "https://creativecommons.org/licenses/by/4.0/"
_APPROVED = "Approved | Expert | Evidence"
_HEADER = [
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
    "identificationVerificationStatus",
]


def _jpeg(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (24, 24), (40, 90, 30)).save(path, format="JPEG")


def _write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=_HEADER)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in _HEADER})


def _photo_row(**overrides) -> dict:
    row = {
        "species": "Amanita phalloides",
        "image_url": "https://images.example.test/gbif/1.jpg",
        "author": "Ada Example",
        "license": "CC BY 4.0",
        "license_url": _BY,
        "source_url": "https://www.gbif.org/occurrence/1001",
        "mo_observation_id": "",
        "id_confidence": "gbif_no_status",
        "inat_photo_id": "",
        "inat_observation_id": "",
        "commons_file": "",
        "inat_observer": "",
        "identificationVerificationStatus": "",
    }
    row.update(overrides)
    return row


def _occurrence(status, *, key: int = 42, basis: str = "HUMAN_OBSERVATION", dataset: str = "ibbi observations") -> dict:
    record = {
        "key": key,
        "basisOfRecord": basis,
        "datasetName": dataset,
        "media": [
            {
                "type": "StillImage",
                "identifier": f"https://images.example.test/occ/{key}.jpg",
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "creator": "Ada",
            }
        ],
    }
    if status is not None:
        record["identificationVerificationStatus"] = status
    return record


def _take(record: dict) -> list[dict]:
    rows, _skip, _partial, _status = fetch_gbif._take_from_occurrence(
        record,
        seen=set(),
        seen_list=[],
        max_per_occurrence=2,
        media_skip=0,
        partial_key=None,
        room=2,
    )
    return rows


def _split_photo(index: int, status: str | None) -> dict:
    observer = f"person_{index}"
    row = {
        "class_id": "boletus_edulis",
        "inat_observer": observer,
        "author": observer,
        "license": "CC BY",
        "image_url": f"https://images.example.test/split/{index}.jpg",
        "file": f"boletus_edulis_{observer}.jpg",
        "occurrence_key": f"occ-{index}",
        "inat_photo_id": f"photo-{index}",
        "inat_observation_id": f"obs-{index}",
        "id_confidence": "research_grade" if index == 0 else "gbif_no_status",
    }
    if status is not None:
        row["identificationVerificationStatus"] = status
    return row


class FetchVerificationTest(unittest.TestCase):
    def test_fetch_copies_status_and_basis_and_drops_only_explicit_unverified(self):
        validated = _take(_occurrence("validated", key=1))
        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["identificationVerificationStatus"], "validated")
        self.assertEqual(validated[0]["basisOfRecord"], "HUMAN_OBSERVATION")
        self.assertNotIn("verified", validated[0])
        self.assertIsNot(validated[0].get("unverified"), True)
        self.assertNotIn("split_flag", validated[0])

        approved = _take(_occurrence(_APPROVED, key=2, basis="PRESERVED_SPECIMEN"))
        self.assertEqual(approved[0]["identificationVerificationStatus"], _APPROVED)
        self.assertEqual(approved[0]["basisOfRecord"], "PRESERVED_SPECIMEN")

        confident = _take(_occurrence("Confident", key=3))
        self.assertEqual(confident[0]["identificationVerificationStatus"], "Confident")

        for text in ("unverified", "Unverified", "UNVERIFIED", " unverified "):
            self.assertEqual(_take(_occurrence(text, key=9)), [], text)

    def test_missing_status_and_inat_research_grade_stay_without_a_split_flag(self):
        missing = _take(
            _occurrence(
                None,
                key=11,
                dataset="iNaturalist research-grade observations",
            )
        )
        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0]["identificationVerificationStatus"], "")
        self.assertEqual(missing[0]["basisOfRecord"], "HUMAN_OBSERVATION")
        self.assertEqual(missing[0]["dataset"], "iNaturalist research-grade observations")
        self.assertNotIn("verified", missing[0])
        self.assertIsNot(missing[0].get("unverified"), True)
        self.assertNotIn("split_flag", missing[0])

        blank = _take(_occurrence("  ", key=12))
        self.assertEqual(len(blank), 1)
        self.assertEqual(blank[0]["identificationVerificationStatus"], "")
        self.assertNotIn("verified", blank[0])

    def test_cached_explicit_unverified_row_is_not_attributed(self):
        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root, ignore_errors=True))
        species = {
            "id": "boletus_edulis",
            "gbif_names": ["Boletus edulis"],
            "safety_tag": "edible",
        }
        parameters = {
            "max_per_occurrence": fetch_gbif.MAX_PER_OCCURRENCE,
            "max_pages": 1,
            "gbif_names": ["Boletus edulis"],
            "sampling": None,
            "safety_tag": "edible",
        }
        key = fetch_gbif._query_cache_key("class", "boletus_edulis", parameters)

        def row(occurrence: int, url: str, status: str | None) -> dict:
            item = {
                "occurrence_key": occurrence,
                "media_index": 0,
                "image_url": url,
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "license_normalized": "cc-by-4.0",
                "class_id": "boletus_edulis",
                "taxon_name": "Boletus edulis",
                "queried_name": "Boletus edulis",
                "region_scope": "central_europe",
                "held_out_taxon": False,
                "toxic": False,
                "genus_relation": "",
                "basisOfRecord": "HUMAN_OBSERVATION",
            }
            if status is not None:
                item["identificationVerificationStatus"] = status
            return item

        cache = fetch_gbif._cache_file(root, "class", "boletus_edulis", key)
        cache.parent.mkdir(parents=True)
        cache.write_text(
            json.dumps(
                {
                    "key": key,
                    "rows": [
                        row(1, "https://images.example.test/unverified.jpg", "unverified"),
                        row(2, "https://images.example.test/blank.jpg", ""),
                        row(3, "https://images.example.test/approved.jpg", _APPROVED),
                    ],
                }
            ),
            encoding="utf-8",
        )
        payload = _large_jpeg()
        previous = fetch_gbif._media_opener
        fetch_gbif._media_opener = _DirectOpener()
        self.addCleanup(lambda: setattr(fetch_gbif, "_media_opener", previous))

        def urlopen(request, timeout=40):
            return _BytesResponse(payload)

        def collect(*args, **kwargs):
            raise AssertionError("GBIF was queried")

        with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
            "fetch_gbif.urllib.request.urlopen", side_effect=urlopen
        ), patch("fetch_gbif.time.sleep"), patch("url_safety.socket.getaddrinfo", side_effect=_offline_dns):
            fetch_gbif.run_fetch(
                {"classes": [species]},
                max_per_class=3,
                max_pages=1,
                only="boletus_edulis",
                download_workers=1,
                data_dir=root,
            )
        lines = [
            json.loads(line)
            for line in (root / "attributions.jsonl").read_text(encoding="utf-8").splitlines()
        ]
        urls = [item["image_url"] for item in lines]
        self.assertEqual(urls, [
            "https://images.example.test/blank.jpg",
            "https://images.example.test/approved.jpg",
        ])
        self.assertEqual(lines[0]["identificationVerificationStatus"], "")
        self.assertEqual(lines[1]["identificationVerificationStatus"], _APPROVED)
        self.assertEqual(lines[0]["basisOfRecord"], "HUMAN_OBSERVATION")
        self.assertTrue(all("verified" not in item for item in lines))
        self.assertFalse((root / "images" / "boletus_edulis" / "1_0.jpg").exists())
        report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["classes"]["boletus_edulis"]["rejected_unverified"], 1)

    def test_fetch_report_counts_unverified_licensed_rows_per_class(self):
        calls = {"n": 0}

        def page(_taxon_key, _country, _offset):
            calls["n"] += 1
            if calls["n"] != 1:
                return {"results": [], "count": 0, "endOfRecords": True}
            return {
                "results": [
                    _occurrence("unverified", key=31),
                    _occurrence("validated", key=32),
                ],
                "count": 2,
                "endOfRecords": True,
            }

        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root, ignore_errors=True))
        payload = _large_jpeg()

        def download(url, destination, **_kwargs):
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
            return len(payload)

        manifest = {
            "classes": [
                {
                    "id": "boletus_edulis",
                    "gbif_names": ["Boletus edulis"],
                    "safety_tag": "edible",
                }
            ]
        }
        with patch.object(fetch_gbif, "_fetch_occurrence_page", side_effect=page), patch.object(
            fetch_gbif, "resolve_accepted_keys", return_value={1: "Boletus edulis"}
        ), patch.object(fetch_gbif, "download_image", side_effect=download), patch.object(
            fetch_gbif.time, "sleep"
        ):
            fetch_gbif.run_fetch(
                manifest,
                max_per_class=5,
                max_pages=1,
                only="boletus_edulis",
                download_workers=1,
                data_dir=root,
            )
        report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["classes"]["boletus_edulis"]["rejected_unverified"], 1)
        self.assertEqual(report["classes"]["boletus_edulis"]["accepted"], 1)
        lines = [
            json.loads(line)
            for line in (root / "attributions.jsonl").read_text(encoding="utf-8").splitlines()
        ]
        self.assertEqual([row["identificationVerificationStatus"] for row in lines], ["validated"])


class ImportVerificationTest(unittest.TestCase):
    def test_gbif_confidence_follows_the_status_column_and_is_counted_per_class(self):
        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root, ignore_errors=True))
        _write_csv(
            root / "mixed.csv",
            [
                _photo_row(
                    image_url="https://images.example.test/a-approved.jpg",
                    source_url="https://www.gbif.org/occurrence/2001",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus=_APPROVED,
                ),
                _photo_row(
                    image_url="https://images.example.test/a-confident.jpg",
                    source_url="https://www.gbif.org/occurrence/2002",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="Confident",
                ),
                _photo_row(
                    image_url="https://images.example.test/a-unverified.jpg",
                    source_url="https://www.gbif.org/occurrence/2003",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="Unverified",
                ),
                _photo_row(
                    image_url="https://images.example.test/a-empty.jpg",
                    source_url="https://www.gbif.org/occurrence/2004",
                    id_confidence="gbif_no_status",
                    identificationVerificationStatus="",
                ),
                _photo_row(
                    image_url="https://images.example.test/a-approved-empty-conf.jpg",
                    source_url="https://www.gbif.org/occurrence/2005",
                    id_confidence="gbif_no_status",
                    identificationVerificationStatus=_APPROVED,
                ),
                _photo_row(
                    species="Boletus edulis",
                    image_url="https://images.example.test/b-unverified.jpg",
                    source_url="https://www.gbif.org/occurrence/3001",
                    id_confidence="gbif_no_status",
                    identificationVerificationStatus=" unverified ",
                ),
                _photo_row(
                    species="Boletus edulis",
                    image_url="https://images.example.test/b-missing.jpg",
                    source_url="https://www.gbif.org/occurrence/3002",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="",
                ),
                _photo_row(
                    species="Boletus edulis",
                    image_url="https://images.example.test/b-blank.jpg",
                    source_url="https://www.gbif.org/occurrence/3003",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="   ",
                ),
                _photo_row(
                    image_url="https://images.example.test/commons-approved.jpg",
                    source_url="https://www.gbif.org/occurrence/4001",
                    id_confidence="commons_category",
                    identificationVerificationStatus=_APPROVED,
                ),
                _photo_row(
                    image_url="https://images.example.test/commons-empty.jpg",
                    source_url="https://www.gbif.org/occurrence/4002",
                    id_confidence="commons_category",
                    identificationVerificationStatus="",
                ),
                _photo_row(
                    image_url="https://images.example.test/research.jpg",
                    source_url="https://www.inaturalist.org/observations/88",
                    id_confidence="research_grade",
                    inat_photo_id="88",
                    inat_observation_id="88",
                    inat_observer="ada",
                    identificationVerificationStatus="",
                ),
            ],
        )
        rows, report = import_directory(root, max_per_collector=30)
        by_url = {row["image_url"]: row for row in rows}
        self.assertEqual(by_url["https://images.example.test/a-approved.jpg"]["identificationVerificationStatus"], _APPROVED)
        self.assertIs(by_url["https://images.example.test/a-approved.jpg"]["unverified"], False)
        self.assertEqual(by_url["https://images.example.test/a-approved.jpg"]["id_confidence"], "gbif_not_validated")
        self.assertEqual(by_url["https://images.example.test/a-confident.jpg"]["identificationVerificationStatus"], "Confident")
        self.assertIs(by_url["https://images.example.test/a-confident.jpg"]["unverified"], False)
        self.assertEqual(by_url["https://images.example.test/a-empty.jpg"]["identificationVerificationStatus"], "")
        self.assertIs(by_url["https://images.example.test/a-empty.jpg"]["unverified"], False)
        self.assertEqual(
            by_url["https://images.example.test/a-approved-empty-conf.jpg"]["identificationVerificationStatus"],
            _APPROVED,
        )
        self.assertNotIn("https://images.example.test/a-unverified.jpg", by_url)
        self.assertNotIn("https://images.example.test/b-unverified.jpg", by_url)
        self.assertIs(by_url["https://images.example.test/b-missing.jpg"]["unverified"], True)
        self.assertEqual(by_url["https://images.example.test/b-missing.jpg"]["identificationVerificationStatus"], "")
        self.assertIs(by_url["https://images.example.test/b-blank.jpg"]["unverified"], True)
        self.assertIs(by_url["https://images.example.test/commons-approved.jpg"]["unverified"], True)
        self.assertIs(by_url["https://images.example.test/commons-empty.jpg"]["unverified"], True)
        self.assertEqual(
            by_url["https://images.example.test/commons-approved.jpg"]["identificationVerificationStatus"],
            _APPROVED,
        )
        research = by_url["https://images.example.test/research.jpg"]
        self.assertIs(research["unverified"], False)
        self.assertNotIn("verified", research)
        self.assertNotIn("split_flag", research)
        self.assertEqual(
            report["verification_per_class"]["amanita_phalloides"],
            {"kept": 4, "identification_unverified": 1},
        )
        self.assertEqual(
            report["verification_per_class"]["boletus_edulis"],
            {"gbif_not_validated": 2, "identification_unverified": 1},
        )
        self.assertEqual(report["rejected_by_reason"]["identification_unverified"], 2)

    def test_fixture_statuses_and_allowlist(self):
        fixture = Path(__file__).resolve().parent / "fixtures" / "gbif_verification_statuses.json"
        statuses = json.loads(fixture.read_text(encoding="utf-8"))
        self.assertEqual(
            statuses,
            ["", "unverified", "Approved | Expert | Evidence", "Confident"],
        )
        for value in statuses:
            self.assertIsInstance(value, str)
            self.assertNotIn("http", value.casefold())
            self.assertIsNone(__import__("re").search(r"\d", value))
        allowlisted = [value for value in statuses if value not in ("", "unverified")]
        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root, ignore_errors=True))
        rows = []
        index = 0
        for confidence in ("gbif_no_status", "gbif_not_validated"):
            for status in statuses:
                index += 1
                rows.append(
                    _photo_row(
                        image_url=f"https://images.example.test/fixture/{confidence}/{index}.jpg",
                        source_url=f"https://www.gbif.org/occurrence/{5000 + index}",
                        id_confidence=confidence,
                        identificationVerificationStatus=status,
                    )
                )
        rows.extend(
            [
                _photo_row(
                    image_url="https://images.example.test/fixture/questionable.jpg",
                    source_url="https://www.gbif.org/occurrence/6101",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="Questionable",
                ),
                _photo_row(
                    image_url="https://images.example.test/fixture/needs-id.jpg",
                    source_url="https://www.gbif.org/occurrence/6102",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="Needs ID",
                ),
                _photo_row(
                    image_url="https://images.example.test/fixture/approved-case.jpg",
                    source_url="https://www.gbif.org/occurrence/6103",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="  APPROVED | EXPERT | EVIDENCE  ",
                ),
                _photo_row(
                    image_url="https://images.example.test/fixture/confident-space.jpg",
                    source_url="https://www.gbif.org/occurrence/6104",
                    id_confidence="gbif_not_validated",
                    identificationVerificationStatus="confident",
                ),
                _photo_row(
                    image_url="https://images.example.test/fixture/no-status-questionable.jpg",
                    source_url="https://www.gbif.org/occurrence/6105",
                    id_confidence="gbif_no_status",
                    identificationVerificationStatus="Questionable",
                ),
            ]
        )
        _write_csv(root / "fixture.csv", rows)
        written, report = import_directory(root, max_per_collector=30)
        by_url = {row["image_url"]: row for row in written}
        for status in statuses:
            if status == "":
                match = [
                    row
                    for row in written
                    if row["id_confidence"] == "gbif_no_status" and row["identificationVerificationStatus"] == ""
                ]
                self.assertEqual(len(match), 1)
                self.assertIs(match[0]["unverified"], False)
            elif status == "unverified":
                self.assertFalse(any(row["identificationVerificationStatus"].casefold() == "unverified" for row in written))
            else:
                match = [
                    row
                    for row in written
                    if row["id_confidence"] == "gbif_not_validated" and row["identificationVerificationStatus"] == status
                ]
                self.assertEqual(len(match), 1, status)
                self.assertIs(match[0]["unverified"], False)
        self.assertEqual(allowlisted, ["Approved | Expert | Evidence", "Confident"])
        self.assertNotIn("https://images.example.test/fixture/questionable.jpg", by_url)
        self.assertNotIn("https://images.example.test/fixture/needs-id.jpg", by_url)
        self.assertIs(by_url["https://images.example.test/fixture/approved-case.jpg"]["unverified"], False)
        self.assertIs(by_url["https://images.example.test/fixture/confident-space.jpg"]["unverified"], False)
        self.assertIs(by_url["https://images.example.test/fixture/no-status-questionable.jpg"]["unverified"], False)
        counted = report["verification_per_class"]["amanita_phalloides"]
        self.assertEqual(counted["identification_unverified"], 2)
        self.assertEqual(counted["identification_not_allowlisted"], 2)
        self.assertEqual(counted["gbif_not_validated"], 1)
        self.assertGreaterEqual(counted["kept"], 5)


class PrepareVerificationTest(unittest.TestCase):
    def test_prepare_rejects_explicit_unverified_keeps_empty_and_counts_per_class(self):
        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root, ignore_errors=True))
        kept_files = {
            "images/amanita_phalloides/empty.jpg": "empty",
            "images/amanita_phalloides/approved.jpg": "approved",
            "images/boletus_edulis/confident.jpg": "confident",
            "images/boletus_edulis/research.jpg": "research",
        }
        for relative in kept_files:
            _jpeg(root / relative)
        rows = [
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "gbif_no_status",
                "identificationVerificationStatus": "",
                "class_id": "amanita_phalloides",
                "file": "images/amanita_phalloides/empty.jpg",
            },
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "gbif_not_validated",
                "identificationVerificationStatus": _APPROVED,
                "class_id": "amanita_phalloides",
                "file": "images/amanita_phalloides/approved.jpg",
            },
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "gbif_not_validated",
                "identificationVerificationStatus": "unverified",
                "class_id": "amanita_phalloides",
                "file": "images/amanita_phalloides/bad.jpg",
            },
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "gbif_no_status",
                "identificationVerificationStatus": " Unverified ",
                "class_id": "boletus_edulis",
                "file": "images/boletus_edulis/bad.jpg",
            },
            {
                "downloaded": True,
                "unverified": True,
                "usage": "publishable",
                "id_confidence": "gbif_not_validated",
                "identificationVerificationStatus": "",
                "class_id": "boletus_edulis",
                "file": "images/boletus_edulis/legacy.jpg",
            },
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "gbif_not_validated",
                "identificationVerificationStatus": "Confident",
                "class_id": "boletus_edulis",
                "file": "images/boletus_edulis/confident.jpg",
            },
            {
                "downloaded": True,
                "unverified": False,
                "usage": "publishable",
                "id_confidence": "research_grade",
                "class_id": "boletus_edulis",
                "file": "images/boletus_edulis/research.jpg",
            },
        ]
        path = root / "rows.jsonl"
        path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        with patch("prepare_data.DATA_DIR", root):
            usable, skipped = _usable_records([path])
        kept_status = {(row["class_id"], row.get("identificationVerificationStatus", None)) for row in usable}
        self.assertIn(("amanita_phalloides", ""), kept_status)
        self.assertIn(("amanita_phalloides", _APPROVED), kept_status)
        self.assertIn(("boletus_edulis", "Confident"), kept_status)
        self.assertIn(("boletus_edulis", None), kept_status)
        self.assertTrue(all(row.get("unverified") is not True for row in usable))
        self.assertTrue(all("verified" not in row and "split_flag" not in row for row in usable))
        reasons = {}
        for item in skipped:
            reasons.setdefault(item["class_id"], []).append(item["skip_reason"])
        self.assertEqual(reasons["amanita_phalloides"], ["identification_unverified"])
        self.assertEqual(
            sorted(reasons["boletus_edulis"]),
            ["identification_unverified", "unverified"],
        )
        prepared = [_split_photo(index, "" if index % 2 == 0 else _APPROVED) for index in range(10)]
        splits = {"train": prepared[:6], "val": prepared[6:8], "test": prepared[8:]}
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            write_prepare_outputs(
                directory,
                prepared=prepared,
                splits=splits,
                dropped=[],
                identity_dropped=[],
                skipped=skipped,
                withheld=[],
                salt=FIXTURE_SALT,
                share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
                model_png_size=224,
            )
            report = json.loads((directory / "dedup_report.json").read_text(encoding="utf-8"))
        self.assertEqual(
            report["skipped_per_class"]["amanita_phalloides"],
            {"identification_unverified": 1},
        )
        self.assertEqual(
            report["skipped_per_class"]["boletus_edulis"],
            {"identification_unverified": 1, "unverified": 1},
        )
        self.assertEqual(report["skipped_corrupt_or_unreadable"], 0)
        self.assertEqual(report["skipped_identification_unverified"], 2)
        self.assertEqual(report["skipped_unverified"], 1)
        self.assertEqual(report["excluded_df20"], 0)


class SplitStaysOpenTest(unittest.TestCase):
    def test_empty_status_rows_can_land_in_train_and_in_test(self):
        records = [_split_photo(index, "" if index % 2 == 0 else None) for index in range(24)]
        records.append(_split_photo(100, _APPROVED))
        splits = split_by_observation(records, salt=FIXTURE_SALT)
        placed = [row for name in ("train", "val", "test") for row in splits[name]]
        self.assertEqual(len(placed), len(records))
        self.assertGreater(len(splits["train"]), 0)
        self.assertGreater(len(splits["test"]), 0)
        self.assertTrue(
            any((row.get("identificationVerificationStatus") or "") == "" for row in splits["train"])
        )
        self.assertTrue(
            any((row.get("identificationVerificationStatus") or "") == "" for row in splits["test"])
        )
        self.assertTrue(any(row.get("identificationVerificationStatus") == _APPROVED for row in placed))
        self.assertTrue(all("split_flag" not in row and "verified" not in row for row in placed))


def _large_jpeg() -> bytes:
    width = 220
    image = Image.new("RGB", (width, width))
    image.putdata(
        [((x * 17 + y) % 256, (y * 13) % 256, (x * y) % 256) for y in range(width) for x in range(width)]
    )
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    payload = buffer.getvalue()
    if len(payload) < 5_000:
        raise RuntimeError(f"fixture jpeg is {len(payload)} bytes")
    return payload


class _DirectOpener:
    def open(self, request, timeout=40):
        return fetch_gbif.urllib.request.urlopen(request, timeout=timeout)


class _BytesResponse:
    def __init__(self, payload: bytes):
        self._payload = payload
        self.headers = {"Content-Type": "image/jpeg"}

    def read(self, _limit: int = -1) -> bytes:
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, *_args) -> None:
        return None


def _offline_dns(host, port, family=0, type=0, proto=0, flags=0):
    import socket

    return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", port or 0))]


if __name__ == "__main__":
    unittest.main()
