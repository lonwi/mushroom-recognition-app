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
from license_policy import (
    EXACT_LICENSE_USAGE,
    allowed_for_display,
    allowed_for_training,
    exact_license_usage,
    license_breakdown,
    license_family,
    training_license_rank,
)
from export_tflite import attribution_rows_for_publication
from import_external import (
    _float_or_none,
    apply_collector_cap,
    import_directory,
    is_publishable,
    parse_textual_license,
    rows_for_atlas_gallery,
    rows_for_comparison,
    rows_for_site,
    training_eligible,
)
from licenses import normalize_cc_license
from prepare_data import _attribution_sources, _usable_records
from url_safety import force_https_url

_BY_40 = "https://creativecommons.org/licenses/by/4.0/"
_BY_NC_40 = "https://creativecommons.org/licenses/by-nc/4.0/"
_BY_SA_40 = "https://creativecommons.org/licenses/by-sa/4.0/"
_ZERO = "https://creativecommons.org/publicdomain/zero/1.0/"

_PHOTO_HEADER = [
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
            "CC-BY-4.0": ("cc-by-4.0", "publishable"),
            "CC BY 4.0": ("cc-by-4.0", "publishable"),
            "CC BY 2.0": ("cc-by-2.0", "publishable"),
            "CC0": ("cc0-1.0", "publishable"),
            "CC0 1.0": ("cc0-1.0", "publishable"),
            "CC-BY-NC-4.0": ("cc-by-nc-4.0", "training_only"),
            "CC BY-NC 4.0": ("cc-by-nc-4.0", "training_only"),
            "CC BY-SA 4.0": ("cc-by-sa-4.0", "training_only"),
            "CC BY-SA 2.0": ("cc-by-sa-2.0", "training_only"),
            "https://creativecommons.org/licenses/by/4.0/": ("cc-by-4.0", "publishable"),
            "https://creativecommons.org/licenses/by-nc/4.0/": ("cc-by-nc-4.0", "training_only"),
            "https://creativecommons.org/licenses/by-sa/4.0/": ("cc-by-sa-4.0", "training_only"),
            "https://creativecommons.org/publicdomain/zero/1.0/": ("cc0-1.0", "publishable"),
        }
        for raw, expected in cases.items():
            parsed = parse_textual_license(raw)
            self.assertIsNotNone(parsed, raw)
            self.assertEqual((parsed["license_normalized"], parsed["usage"]), expected, raw)

    def test_rejects_nd_nc_sa_and_unknown(self):
        for raw in (
            "CC BY-NC-ND",
            "CC BY-NC-SA",
            "CC BY-SA",
            "CC BY-ND",
            "CC-BY-NC-ND-4.0",
            "CC BY-NC-SA 4.0",
            "CC BY-ND 4.0",
            "https://creativecommons.org/licenses/by-nc-nd/4.0/",
            "https://creativecommons.org/licenses/by-nd/4.0/",
            "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "all rights reserved",
            "Public Domain (Wikipedia compatible)",
            "",
            None,
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(parse_textual_license(raw, _BY_40), raw)
        sa = parse_textual_license("CC BY-SA 4.0", _BY_SA_40)
        self.assertEqual((sa["license_normalized"], sa["usage"]), ("cc-by-sa-4.0", "training_only"))
        derived = parse_textual_license("CC BY-SA", _BY_SA_40)
        self.assertEqual(derived["license_normalized"], "cc-by-sa-4.0")

    def test_unknown_or_empty_license_is_never_cc_by(self):
        by = parse_textual_license("CC BY 4.0")
        self.assertEqual(by["license_normalized"], "cc-by-4.0")
        for raw in ("", "   ", None, "all rights reserved", "custom", "see license"):
            parsed = parse_textual_license(raw, _BY_40)
            self.assertIsNone(parsed, raw)
            self.assertNotEqual((parsed or {}).get("license_normalized"), "cc-by-4.0")

    def test_version_comes_from_license_url_or_the_row_is_rejected(self):
        self.assertIsNone(parse_textual_license("CC BY"))
        self.assertIsNone(parse_textual_license("CC BY-NC"))
        self.assertIsNone(parse_textual_license("CC BY", ""))
        self.assertIsNone(parse_textual_license("CC BY", "not a license"))
        derived = parse_textual_license("CC BY", _BY_40)
        self.assertEqual((derived["license_normalized"], derived["usage"]), ("cc-by-4.0", "publishable"))
        derived_nc = parse_textual_license("CC BY-NC", "http://creativecommons.org/licenses/by-nc/4.0/")
        self.assertEqual(
            (derived_nc["license_normalized"], derived_nc["usage"]),
            ("cc-by-nc-4.0", "training_only"),
        )
        self.assertIsNone(parse_textual_license("CC BY 2.0", _BY_40))
        self.assertIsNone(parse_textual_license("CC BY", _BY_NC_40))

    def test_whole_license_id_accepts_sa_and_rejects_nd(self):
        by = parse_textual_license("CC BY 4.0")["license_normalized"]
        nc = parse_textual_license("CC BY-NC 4.0")["license_normalized"]
        sa = parse_textual_license("CC BY-SA 4.0")["license_normalized"]
        self.assertEqual(by, "cc-by-4.0")
        self.assertEqual(nc, "cc-by-nc-4.0")
        self.assertEqual(sa, "cc-by-sa-4.0")
        self.assertNotEqual(by, sa)
        self.assertFalse(by.startswith("cc-by-sa"))
        self.assertNotEqual(nc, "cc-by-nc-sa-4.0")
        self.assertNotEqual(nc, "cc-by-nc-nd-4.0")
        for raw in (
            "CC BY-NC-SA 4.0",
            "CC BY-NC-ND 4.0",
            "CC BY-ND 4.0",
            "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "https://creativecommons.org/licenses/by-nc-nd/4.0/",
            "https://creativecommons.org/licenses/by-nd/4.0/",
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(parse_textual_license(raw, _BY_40), raw)
        self.assertIsNone(parse_textual_license("CC BY-SA", _BY_40))
        self.assertIsNone(parse_textual_license("CC BY-SA 4.0", _BY_40))
        self.assertIsNone(parse_textual_license("CC BY-NC-SA", _BY_NC_40))

    def test_gbif_filter_still_rejects_textual_and_nc_urls(self):
        self.assertIsNone(normalize_cc_license("CC BY"))
        self.assertIsNone(normalize_cc_license("CC BY-NC"))
        self.assertIsNone(normalize_cc_license("http://creativecommons.org/licenses/by-nc/4.0/"))
        self.assertEqual(
            normalize_cc_license("http://creativecommons.org/licenses/by/4.0/"),
            "cc-by-4.0",
        )

    def test_training_licences_pass_attribution_and_stay_unshown(self):
        ok = {
            "creator": "Ada",
            "license_normalized": "cc-by-4.0",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
        }
        shown = ("cc0-1.0", "cc-by-4.0")
        training = ("cc0-1.0", "cc-by-4.0", "cc-by-nc-4.0", "cc-by-sa-4.0", "df20")
        rejected = ("cc-by-nd-4.0", "cc-by-nc-sa-4.0", "cc-by-nc-nd-4.0", "cc-by", "")
        for license_id in shown:
            self.assertTrue(publishable_license_id(license_id), license_id)
            self.assertTrue(allowed_for_display(license_id), license_id)
        for license_id in training:
            self.assertTrue(allowed_for_training(license_id), license_id)
            row = {**ok, "license_normalized": license_id}
            if license_id == "df20":
                row = {
                    **row,
                    "license": "DF20 training-only; no per-image licence",
                    "image_url": "",
                    "source_url": "",
                    "usage": "training_only",
                }
            elif license_id == "cc-by-nc-4.0":
                row = {**row, "license": "CC BY-NC 4.0", "license_url": _BY_NC_40, "usage": "training_only"}
            elif license_id == "cc-by-sa-4.0":
                row = {**row, "license": "CC BY-SA 4.0", "license_url": _BY_SA_40, "usage": "training_only"}
            self.assertTrue(attributions_complete([row]), license_id)
            self.assertNotIn("licence_url_source", row)
        for license_id in ("cc-by-nc-4.0", "cc-by-sa-4.0", "df20"):
            self.assertFalse(publishable_license_id(license_id), license_id)
            self.assertFalse(allowed_for_display(license_id), license_id)
        for license_id in rejected:
            self.assertFalse(allowed_for_training(license_id), license_id)
            self.assertFalse(attributions_complete([{**ok, "license_normalized": license_id}]), license_id)
        self.assertFalse(attributions_complete([{**ok, "unverified": True}]))
        self.assertFalse(attributions_complete([{**ok, "creator": ""}]))
        self.assertFalse(
            attributions_complete(
                [{**ok, "license_normalized": "cc-by-nc-4.0", "license": "CC BY-NC 4.0", "usage": "training_only"}]
            )
        )
        self.assertFalse(
            attributions_complete(
                [{**ok, "license_normalized": "cc-by-sa-4.0", "license": "CC BY-SA 4.0", "usage": "training_only"}]
            )
        )
        df20 = {
            **ok,
            "license": "DF20 training-only; no per-image licence",
            "license_normalized": "df20",
            "image_url": "",
            "source_url": "",
            "usage": "training_only",
        }
        self.assertTrue(attributions_complete([df20]))
        self.assertFalse(attributions_complete([{**df20, "creator": ""}]))
        self.assertEqual(training_license_rank("cc-by-nc-4.0"), 3)
        self.assertEqual(training_license_rank("cc-by-sa-4.0"), 3)
        self.assertEqual(training_license_rank("df20"), 3)
        self.assertGreater(training_license_rank("cc-by-sa-4.0"), training_license_rank("cc-by-4.0"))
        self.assertGreater(training_license_rank("cc-by-4.0"), training_license_rank("cc0-1.0"))
        self.assertEqual(training_license_rank("cc-by-nd-4.0"), 0)

    def test_cc_by_sa_only_exact_versioned_ids_are_training_only(self):
        versions = ("1.0", "2.0", "2.5", "3.0", "4.0")
        for version in versions:
            license_id = f"cc-by-sa-{version}"
            self.assertEqual(exact_license_usage(license_id), "training_only", license_id)
            self.assertEqual(EXACT_LICENSE_USAGE[license_id], "training_only", license_id)
            self.assertTrue(allowed_for_training(license_id), license_id)
            self.assertFalse(allowed_for_display(license_id), license_id)
            url = f"https://creativecommons.org/licenses/by-sa/{version}/"
            for raw in (f"CC BY-SA {version}", f"CC-BY-SA-{version}", url):
                parsed = parse_textual_license(raw, url)
                self.assertEqual(
                    (parsed["license_normalized"], parsed["usage"]),
                    (license_id, "training_only"),
                    raw,
                )
        for raw in (
            "CC BY-SA",
            "cc-by-sa",
            "CC-BY-SA",
            "CC BY-ND",
            "CC BY-ND 4.0",
            "CC-BY-ND-4.0",
            "CC BY-NC-ND",
            "CC BY-NC-ND 4.0",
            "CC-BY-NC-ND-4.0",
            "https://creativecommons.org/licenses/by-nd/4.0/",
            "https://creativecommons.org/licenses/by-nc-nd/4.0/",
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(exact_license_usage(raw), raw)
            self.assertFalse(allowed_for_training(raw), raw)
        self.assertIsNone(exact_license_usage("cc-by-sa"))
        self.assertIsNone(exact_license_usage("cc-by-nd-4.0"))
        self.assertIsNone(exact_license_usage("cc-by-nc-nd-4.0"))
        derived = parse_textual_license("CC BY-SA", _BY_SA_40)
        self.assertEqual((derived["license_normalized"], derived["usage"]), ("cc-by-sa-4.0", "training_only"))
        self.assertIsNone(parse_textual_license("CC BY-SA"))
        self.assertIsNone(parse_textual_license("CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/"))
        self.assertIsNone(parse_textual_license("CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"))

    def test_unversioned_ids_are_rejected_without_prefix_matching(self):
        policy = Path(__file__).resolve().parents[1] / "license_policy.py"
        self.assertNotIn("startswith", policy.read_text(encoding="utf-8"))
        for raw in (
            "cc-by",
            "cc-by-nc",
            "cc-by-sa",
            "cc-by-nc-sa",
            "cc-by-nc-4.0-extra",
            "cc-by-sa-4",
            "cc-by-4.0 ",
        ):
            self.assertIsNone(exact_license_usage(raw), raw)
            self.assertIsNone(license_family(raw), raw)
            self.assertFalse(allowed_for_training(raw), raw)
            self.assertFalse(
                attributions_complete(
                    [
                        {
                            "creator": "Ada",
                            "license_normalized": raw,
                            "image_url": "https://images.example.test/a.jpg",
                            "source_url": "https://example.test/a",
                        }
                    ]
                ),
                raw,
            )
        self.assertIsNone(parse_textual_license("CC BY-SA"))
        self.assertIsNone(parse_textual_license("CC BY-NC"))
        self.assertIsNone(parse_textual_license("CC BY-NC-SA"))
        self.assertIsNone(parse_textual_license("cc-by-sa"))
        self.assertIsNone(parse_textual_license("cc-by-nc"))
        self.assertIsNone(parse_textual_license("cc-by-nc-sa"))
        self.assertEqual(license_family("cc-by-nc-4.0"), "cc-by-nc")
        self.assertIsNone(license_family("cc-by-nc-sa-4.0"))
        self.assertNotEqual(license_family("cc-by-sa-4.0"), "cc-by")

    def test_nd_is_rejected(self):
        credited = {
            "creator": "Ada",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
            "license_url": "https://creativecommons.org/licenses/by-nd/4.0/",
        }
        for raw, license_id in (
            ("CC BY-ND", "cc-by-nd"),
            ("CC BY-ND 4.0", "cc-by-nd-4.0"),
            ("CC-BY-ND-4.0", "cc-by-nd-4.0"),
            ("https://creativecommons.org/licenses/by-nd/4.0/", "cc-by-nd-4.0"),
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(
                parse_textual_license(raw, "https://creativecommons.org/licenses/by-nd/4.0/"),
                raw,
            )
            self.assertFalse(allowed_for_training(license_id), license_id)
            self.assertFalse(
                attributions_complete([{**credited, "license": raw, "license_normalized": license_id}]),
                license_id,
            )

    def test_nc_nd_is_rejected(self):
        credited = {
            "creator": "Ada",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
            "license_url": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
        }
        for raw, license_id in (
            ("CC BY-NC-ND", "cc-by-nc-nd"),
            ("CC BY-NC-ND 4.0", "cc-by-nc-nd-4.0"),
            ("CC-BY-NC-ND-4.0", "cc-by-nc-nd-4.0"),
            ("https://creativecommons.org/licenses/by-nc-nd/4.0/", "cc-by-nc-nd-4.0"),
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(
                parse_textual_license(raw, "https://creativecommons.org/licenses/by-nc-nd/4.0/"),
                raw,
            )
            self.assertFalse(allowed_for_training(license_id), license_id)
            self.assertFalse(
                attributions_complete([{**credited, "license": raw, "license_normalized": license_id}]),
                license_id,
            )

    def test_nc_sa_is_rejected(self):
        credited = {
            "creator": "Ada",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
            "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        }
        for raw, license_id in (
            ("CC BY-NC-SA", "cc-by-nc-sa"),
            ("CC BY-NC-SA 4.0", "cc-by-nc-sa-4.0"),
            ("CC-BY-NC-SA-4.0", "cc-by-nc-sa-4.0"),
            ("https://creativecommons.org/licenses/by-nc-sa/4.0/", "cc-by-nc-sa-4.0"),
        ):
            self.assertIsNone(parse_textual_license(raw), raw)
            self.assertIsNone(
                parse_textual_license(raw, "https://creativecommons.org/licenses/by-nc-sa/4.0/"),
                raw,
            )
            self.assertFalse(allowed_for_training(license_id), license_id)
            self.assertFalse(
                attributions_complete([{**credited, "license": raw, "license_normalized": license_id}]),
                license_id,
            )

    def test_unknown_or_empty_licence_blocks_release(self):
        ok = {
            "creator": "Ada",
            "license_normalized": "cc-by-4.0",
            "image_url": "https://images.example.test/a.jpg",
            "source_url": "https://example.test/a",
        }
        self.assertTrue(attributions_complete([ok]))
        for raw in ("", "   ", "custom", "see license", "all rights reserved", "public domain"):
            self.assertFalse(attributions_complete([{**ok, "license_normalized": raw}]), repr(raw))
            self.assertFalse(allowed_for_training(raw), repr(raw))
        self.assertFalse(attributions_complete([{**ok, "license_normalized": None}]))


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
            "license_url": _BY_40,
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
                    license_url="https://creativecommons.org/publicdomain/zero/1.0/",
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
                    license_url=_BY_NC_40,
                    inat_observer="ada",
                ),
                self._base(
                    image_url="https://inaturalist-open-data.s3.amazonaws.com/photos/9/large.jpg",
                    source_url="https://www.inaturalist.org/observations/19",
                    inat_photo_id="9",
                    inat_observation_id="19",
                    license="CC BY-NC",
                    license_url=_BY_NC_40,
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
                    license_url="https://creativecommons.org/licenses/by/2.0/",
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
                    license_url="https://creativecommons.org/licenses/by-nc-nd/4.0/",
                    inat_observer="nd",
                ),
                self._base(
                    image_url="https://images.example.test/sa.jpg",
                    inat_photo_id="502",
                    license="CC BY-SA",
                    license_url="https://creativecommons.org/licenses/by-sa/4.0/",
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

        rows, report = import_directory(self.root, include_df20=True)
        self.assertEqual(report["excluded_df20"], 0)
        self.assertTrue(report["include_df20"])
        self.assertIsNone(report["max_per_collector"])
        by_photo = {row.get("inat_photo_id") or row.get("commons_file") or row.get("df20_image_id"): row for row in rows}

        ada_rows = [
            row
            for row in rows
            if row["class_id"] == "amanita_phalloides" and row["collector_key"] == "inat:ada" and not row["unverified"]
        ]
        ada_verified = [row for row in ada_rows if row["usage"] == "publishable"]
        self.assertEqual({row["inat_photo_id"] for row in ada_verified}, {"2", "3"})
        self.assertEqual(by_photo["1"]["license_normalized"], "cc-by-nc-4.0")
        self.assertEqual(by_photo["1"]["usage"], "training_only")
        self.assertGreaterEqual(report["dropped_looser_license"], 1)
        self.assertEqual(report["dropped_collector_cap"], 0)
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
        self.assertGreaterEqual(report["rejected_license"], 1)
        share_alike = by_photo["502"]
        self.assertEqual(share_alike["license_normalized"], "cc-by-sa-4.0")
        self.assertEqual(share_alike["usage"], "training_only")
        self.assertFalse(is_publishable(share_alike))
        self.assertGreaterEqual(report["rejected_missing_author"], 1)
        self.assertGreaterEqual(report["dropped_looser_license"], 1)
        self.assertEqual(report["dropped_by_reason"]["looser_license"], report["dropped_looser_license"])

        df20_rows = [row for row in rows if row["source"] == "df20"]
        self.assertEqual({row["df20_observation_id"] for row in df20_rows}, {"223", "224"})
        self.assertTrue(all(row["usage"] == "training_only" for row in df20_rows))
        self.assertTrue(all(row["license_normalized"] == "df20" for row in df20_rows))
        self.assertTrue(all(row["creator"] == "Benny Example" and row["rights_holder"] == "Benny Example" for row in df20_rows))
        self.assertEqual(by_photo["223-1"]["occurrence_key"], "df20:223")
        self.assertFalse(any(row["unverified"] for row in df20_rows))
        boletus_publishable = [
            row for row in rows if row["class_id"] == "boletus_edulis" and row["usage"] == "publishable"
        ]
        self.assertEqual(len(boletus_publishable), 1)
        self.assertEqual(boletus_publishable[0]["creator"], "Benny Example")
        self.assertTrue(all(row["creator"] for row in rows))

        publishable_only, only_report = import_directory(self.root, publishable_only=True)
        self.assertTrue(all(is_publishable(row) for row in publishable_only))
        self.assertEqual(only_report["training_only"], 0)
        self.assertTrue(all(row["unverified"] is False for row in publishable_only))
        self.assertFalse(any(row["source"] == "df20" or row["usage"] == "training_only" for row in publishable_only))

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

    def test_nc_sa_and_df20_fail_publishable_gallery_site_and_comparison(self):
        cc0 = {
            "creator": "Ada",
            "author": "Ada",
            "license": "CC0 1.0",
            "license_normalized": "cc0-1.0",
            "license_url": _ZERO,
            "usage": "publishable",
            "unverified": False,
            "image_url": "https://images.example.test/cc0.jpg",
            "source_url": "https://example.test/cc0",
        }
        cc_by = {
            **cc0,
            "creator": "Bea",
            "author": "Bea",
            "license": "CC BY 4.0",
            "license_normalized": "cc-by-4.0",
            "license_url": _BY_40,
            "image_url": "https://images.example.test/by.jpg",
            "source_url": "https://example.test/by",
        }
        nc = {
            **cc_by,
            "creator": "Cyra",
            "author": "Cyra",
            "license": "CC BY-NC 4.0",
            "license_normalized": "cc-by-nc-4.0",
            "license_url": _BY_NC_40,
            "usage": "training_only",
            "image_url": "https://images.example.test/nc.jpg",
            "source_url": "https://example.test/nc",
        }
        sa = {
            **cc_by,
            "creator": "Dora",
            "author": "Dora",
            "license": "CC BY-SA 4.0",
            "license_normalized": "cc-by-sa-4.0",
            "license_url": _BY_SA_40,
            "usage": "training_only",
            "image_url": "https://images.example.test/sa.jpg",
            "source_url": "https://example.test/sa",
        }
        df20 = {
            **cc_by,
            "creator": "Benny",
            "author": "Benny",
            "license": "DF20 training-only; no per-image licence",
            "license_normalized": "df20",
            "license_url": "",
            "usage": "training_only",
            "image_url": "",
            "source_url": "",
            "df20_image_id": "223-1",
        }
        lying_sa = {**sa, "usage": "publishable"}
        versionless = {**cc_by, "license_normalized": "cc-by", "usage": "publishable"}
        nd = {**cc_by, "license_normalized": "cc-by-nd-4.0", "usage": "publishable"}
        rows = [nc, sa, df20, cc0, lying_sa, cc_by, versionless, nd]
        shown = [cc0, cc_by]
        for selector in (rows_for_atlas_gallery, rows_for_site, rows_for_comparison):
            published = selector(rows)
            self.assertEqual(published, shown, selector.__name__)
            self.assertTrue(all(is_publishable(row) for row in published))
            self.assertEqual(
                [row["license_normalized"] for row in published],
                ["cc0-1.0", "cc-by-4.0"],
                selector.__name__,
            )
        for hidden in (nc, sa, df20, lying_sa, versionless, nd):
            self.assertFalse(is_publishable(hidden), hidden["license_normalized"])
        credits = attribution_rows_for_publication(rows)
        self.assertEqual([row["license_normalized"] for row in credits], ["cc0-1.0", "cc-by-4.0"])
        self.assertTrue(attributions_complete(shown + [nc, sa, df20]))
        self.assertFalse(attributions_complete([{**cc_by, "license_normalized": "cc-by-nd-4.0"}]))
        self.assertFalse(attributions_complete([{**cc_by, "license_normalized": "cc-by-nc-nd-4.0"}]))
        self.assertFalse(attributions_complete([{**cc_by, "license_normalized": "cc-by-nc-sa-4.0"}]))

    def test_label_conflicts_drop_every_row(self):
        _photo(
            self.root / "one.csv",
            [
                self._base(
                    species="Amanita phalloides",
                    inat_photo_id="7",
                    inat_observation_id="70",
                    image_url="https://images.example.test/a.jpg",
                    source_url="https://www.inaturalist.org/observations/70",
                ),
                self._base(
                    species="Boletus edulis",
                    inat_photo_id="8",
                    inat_observation_id="80",
                    image_url="https://images.example.test/b.jpg",
                    source_url="https://www.inaturalist.org/observations/80",
                ),
                self._base(
                    species="Amanita phalloides",
                    inat_photo_id="10",
                    inat_observation_id="100",
                    image_url="https://images.example.test/keep.jpg",
                    source_url="https://www.inaturalist.org/observations/100",
                    inat_observer="keep",
                    author="Keep",
                ),
            ],
        )
        _photo(
            self.root / "two.csv",
            [
                self._base(
                    species="Boletus edulis",
                    inat_photo_id="7",
                    inat_observation_id="71",
                    image_url="https://images.example.test/a2.jpg",
                    source_url="https://www.inaturalist.org/observations/71",
                    inat_observer="other",
                    author="Other",
                ),
                self._base(
                    species="Morchella esculenta",
                    inat_photo_id="9",
                    inat_observation_id="80",
                    image_url="https://images.example.test/c.jpg",
                    source_url="https://www.inaturalist.org/observations/80",
                    inat_observer="morel",
                    author="Morel",
                ),
            ],
        )
        rows, report = import_directory(self.root)
        self.assertEqual([row["inat_photo_id"] for row in rows], ["10"])
        by_id = {item["id"]: item for item in report["label_conflicts"]}
        self.assertEqual(by_id["inat-photo:7"]["kind"], "photo")
        self.assertEqual(len(by_id["inat-photo:7"]["labels"]), 2)
        self.assertTrue(any("amanita_phalloides" in label for label in by_id["inat-photo:7"]["labels"]))
        self.assertTrue(any("boletus_edulis" in label for label in by_id["inat-photo:7"]["labels"]))
        self.assertEqual(by_id["inat-obs:80"]["kind"], "observation")
        self.assertEqual(len(by_id["inat-obs:80"]["labels"]), 2)
        self.assertGreaterEqual(report["dropped_label_conflict"], 4)
        self.assertEqual(report["duplicate_class_conflicts"], len(report["label_conflicts"]))

    def test_publishable_only_does_not_let_nc_take_a_cap_slot(self):
        _photo(
            self.root / "mixed.csv",
            [
                self._base(
                    license="CC BY-NC",
                    license_url=_BY_NC_40,
                    inat_photo_id="1",
                    inat_observation_id="1",
                    image_url="https://images.example.test/nc.jpg",
                    source_url="https://www.inaturalist.org/observations/1",
                ),
                self._base(
                    license="CC BY",
                    license_url=_BY_40,
                    inat_photo_id="2",
                    inat_observation_id="2",
                    image_url="https://images.example.test/by.jpg",
                    source_url="https://www.inaturalist.org/observations/2",
                ),
            ],
        )
        rows, report = import_directory(self.root, max_per_collector=1, publishable_only=True)
        self.assertEqual([row["inat_photo_id"] for row in rows], ["2"])
        self.assertEqual(report["dropped_collector_cap"], 0)
        self.assertTrue(is_publishable(rows[0]))

    def test_versionless_and_non_https_rows_are_rejected(self):
        _photo(
            self.root / "bad.csv",
            [
                self._base(license="CC BY", license_url="", inat_photo_id="1", inat_observation_id="1"),
                self._base(
                    license="",
                    license_url=_BY_40,
                    inat_photo_id="2",
                    inat_observation_id="2",
                    image_url="https://images.example.test/empty-license.jpg",
                ),
                self._base(
                    license="CC BY 4.0",
                    inat_photo_id="3",
                    inat_observation_id="3",
                    image_url="ftp://images.example.test/a.jpg",
                ),
            ],
        )
        rows, report = import_directory(self.root)
        self.assertEqual(rows, [])
        self.assertGreaterEqual(report["rejected_license_url_empty"], 1)
        self.assertGreaterEqual(report["rejected_license"], 1)
        self.assertGreaterEqual(report["rejected_url"], 1)
        self.assertEqual(
            report["rejected_by_reason"]["license_url_empty"],
            report["rejected_license_url_empty"],
        )

    def test_license_url_must_be_https_and_match_the_text(self):
        _photo(
            self.root / "urls.csv",
            [
                self._base(
                    license="CC BY 4.0",
                    license_url="",
                    inat_photo_id="1",
                    inat_observation_id="1",
                    image_url="https://images.example.test/empty.jpg",
                    source_url="https://www.inaturalist.org/observations/1",
                ),
                self._base(
                    license="CC BY 4.0",
                    license_url="http://creativecommons.org/licenses/by/4.0/",
                    inat_photo_id="2",
                    inat_observation_id="2",
                    image_url="https://images.example.test/http.jpg",
                    source_url="https://www.inaturalist.org/observations/2",
                ),
                self._base(
                    license="CC BY 4.0",
                    license_url=_BY_NC_40,
                    inat_photo_id="3",
                    inat_observation_id="3",
                    image_url="https://images.example.test/mismatch.jpg",
                    source_url="https://www.inaturalist.org/observations/3",
                ),
                self._base(
                    license="CC BY",
                    license_url="",
                    inat_photo_id="4",
                    inat_observation_id="4",
                    image_url="https://images.example.test/versionless.jpg",
                    source_url="https://www.inaturalist.org/observations/4",
                ),
            ],
        )
        rows, report = import_directory(self.root)
        self.assertEqual(rows, [])
        self.assertGreaterEqual(report["rejected_license_url_empty"], 2)
        self.assertEqual(report["rejected_license_url_not_https"], 1)
        self.assertEqual(report["rejected_license_url_mismatch"], 1)
        self.assertEqual(report["rejected_by_reason"]["license_url_not_https"], 1)
        self.assertEqual(report["rejected_by_reason"]["license_url_mismatch"], 1)
        self.assertIsNone(parse_textual_license("CC BY"))
        self.assertIsNone(parse_textual_license("CC BY", None))
        self.assertIsNone(parse_textual_license("CC BY", ""))

    def test_stricter_license_wins_for_the_same_image(self):
        image = "https://upload.wikimedia.org/wikipedia/commons/5/53/morel.jpg"
        _photo(
            self.root / "morchella_esculenta.csv",
            [
                self._base(
                    species="Morchella esculenta",
                    image_url=image,
                    source_url="https://commons.wikimedia.org/wiki/File:morel.jpg",
                    license="CC BY 4.0",
                    license_url=_BY_40,
                    inat_photo_id="",
                    inat_observation_id="",
                    commons_file="morel.jpg",
                    inat_observer="",
                    author="Jay Example",
                )
            ],
        )
        _photo(
            self.root / "morchella_esculenta_by_nc.csv",
            [
                self._base(
                    species="Morchella esculenta",
                    image_url=image,
                    source_url="https://www.inaturalist.org/observations/42",
                    license="CC BY-NC 4.0",
                    license_url=_BY_NC_40,
                    inat_photo_id="42",
                    inat_observation_id="42",
                    commons_file="",
                    inat_observer="cyra",
                    author="Cyra",
                )
            ],
        )
        rows, report = import_directory(self.root)
        self.assertEqual(len(rows), 1)
        kept = rows[0]
        self.assertEqual(kept["license_normalized"], "cc-by-nc-4.0")
        self.assertEqual(kept["usage"], "training_only")
        self.assertFalse(is_publishable(kept))
        self.assertEqual(report["dropped_looser_license"], 1)
        self.assertEqual(report["dropped_by_reason"]["looser_license"], 1)
        self.assertEqual(rows_for_atlas_gallery(rows), [])
        self.assertEqual(rows_for_site(rows), [])
        self.assertEqual(rows_for_comparison(rows), [])

    def test_rejected_license_copy_drops_the_other_copy(self):
        cases = (
            ("empty-nc", "CC BY-NC 4.0", "", "license_url_empty"),
            ("unknown", "CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/", "license"),
            ("empty-sa", "CC BY-SA 4.0", "", "license_url_empty"),
            ("nc-nd", "CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/", "license"),
            ("http", "CC BY 4.0", "http://creativecommons.org/licenses/by/4.0/", "license_url_not_https"),
            ("mismatch", "CC BY 4.0", _BY_NC_40, "license_url_mismatch"),
        )
        for name, bad_license, bad_url, reason in cases:
            folder = self.root / name
            _photo(
                folder / "pair.csv",
                [
                    self._base(
                        license=bad_license,
                        license_url=bad_url,
                        inat_photo_id="15",
                        inat_observation_id="15",
                        image_url="https://static.inaturalist.org/photos/15/original.jpg",
                        source_url="https://www.inaturalist.org/observations/15",
                        author="Nc Author",
                    ),
                    self._base(
                        license="CC BY 4.0",
                        license_url=_BY_40,
                        inat_photo_id="15",
                        inat_observation_id="16",
                        image_url="https://images.example.test/by-copy.jpg",
                        source_url="https://www.inaturalist.org/observations/16",
                        author="By Author",
                    ),
                ],
            )
            rows, report = import_directory(folder, max_per_collector=10)
            self.assertEqual(rows, [], name)
            self.assertGreaterEqual(report["rejected_by_reason"].get(reason, 0), 1, name)
            self.assertEqual(report["dropped_rejected_license_copy"], 1, name)
            self.assertEqual(report["dropped_by_reason"]["rejected_license_copy"], 1, name)

    def test_cc_by_beats_cc0_in_either_order(self):
        orders = (
            ("cc0-then-by", ("CC0", _ZERO, "Zero Person"), ("CC BY 4.0", _BY_40, "By Person")),
            ("by-then-cc0", ("CC BY 4.0", _BY_40, "By Person"), ("CC0", _ZERO, "Zero Person")),
        )
        for name, first, second in orders:
            folder = self.root / name
            _photo(
                folder / "pair.csv",
                [
                    self._base(
                        license=first[0],
                        license_url=first[1],
                        author=first[2],
                        inat_photo_id="77",
                        inat_observation_id="77",
                        image_url="https://images.example.test/tie-a.jpg",
                        source_url="https://www.inaturalist.org/observations/77",
                    ),
                    self._base(
                        license=second[0],
                        license_url=second[1],
                        author=second[2],
                        inat_photo_id="77",
                        inat_observation_id="77",
                        image_url="https://images.example.test/tie-b.jpg",
                        source_url="https://www.inaturalist.org/observations/77",
                    ),
                ],
            )
            rows, report = import_directory(folder, max_per_collector=10)
            self.assertEqual(len(rows), 1, name)
            self.assertEqual(rows[0]["license_normalized"], "cc-by-4.0", name)
            self.assertEqual(rows[0]["usage"], "publishable", name)
            self.assertEqual(rows[0]["creator"], "By Person", name)
            self.assertTrue(is_publishable(rows[0]), name)
            self.assertEqual(report["dropped_looser_license"], 1, name)

    def test_commons_and_inat_merge_on_shared_inat_photo_id(self):
        _photo(
            self.root / "commons.csv",
            [
                self._base(
                    image_url="https://upload.wikimedia.org/wikipedia/commons/a/ab/Shared.jpg",
                    source_url="https://commons.wikimedia.org/wiki/File:Shared.jpg",
                    license="CC0",
                    license_url=_ZERO,
                    inat_photo_id="4242",
                    inat_observation_id="",
                    commons_file="Shared.jpg",
                    inat_observer="",
                    author="Commons Author",
                )
            ],
        )
        _photo(
            self.root / "inat.csv",
            [
                self._base(
                    image_url="https://static.inaturalist.org/photos/4242/original.jpg",
                    source_url="https://www.inaturalist.org/observations/9001",
                    license="CC BY 4.0",
                    license_url=_BY_40,
                    inat_photo_id="4242",
                    inat_observation_id="9001",
                    commons_file="",
                    author="Inat Author",
                    inat_observer="inat",
                )
            ],
        )
        rows, report = import_directory(self.root, max_per_collector=10)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["inat_photo_id"], "4242")
        self.assertEqual(rows[0]["license_normalized"], "cc-by-4.0")
        self.assertEqual(rows[0]["creator"], "Inat Author")
        self.assertEqual(rows[0]["source"], "inat")
        self.assertTrue(is_publishable(rows[0]))
        self.assertEqual(report["dropped_looser_license"], 1)
        self.assertNotEqual(rows[0]["image_url"], "https://upload.wikimedia.org/wikipedia/commons/a/ab/Shared.jpg")

    def test_each_training_licence_is_imported_and_only_cc0_and_cc_by_are_shown(self):
        shown = {
            ("CC0", _ZERO, "cc0-1.0", "publishable"),
            ("CC BY 4.0", _BY_40, "cc-by-4.0", "publishable"),
        }
        training_only = {
            ("CC BY-NC 4.0", _BY_NC_40, "cc-by-nc-4.0", "training_only"),
            ("CC BY-SA 4.0", _BY_SA_40, "cc-by-sa-4.0", "training_only"),
        }
        for index, (text, url, normalized, usage) in enumerate(shown | training_only):
            folder = self.root / f"licence-{index}"
            _photo(
                folder / "one.csv",
                [
                    self._base(
                        license=text,
                        license_url=url,
                        inat_photo_id=str(index + 1),
                        inat_observation_id=str(index + 1),
                        image_url=f"https://images.example.test/{index}.jpg",
                        source_url=f"https://www.inaturalist.org/observations/{index + 1}",
                    )
                ],
            )
            rows, _report = import_directory(folder, max_per_collector=10)
            self.assertEqual(len(rows), 1, text)
            self.assertEqual(rows[0]["license_normalized"], normalized, text)
            self.assertEqual(rows[0]["usage"], usage, text)
            self.assertTrue(training_eligible(rows[0]), text)
            self.assertEqual(is_publishable(rows[0]), usage == "publishable", text)
            self.assertEqual(rows_for_atlas_gallery(rows), rows if usage == "publishable" else [], text)
            self.assertEqual(rows_for_site(rows), rows if usage == "publishable" else [], text)
            self.assertEqual(rows_for_comparison(rows), rows if usage == "publishable" else [], text)
            counts = license_breakdown(rows)
            self.assertEqual(counts["by_license"], {normalized: 1}, text)
            self.assertEqual(counts["by_source"], {"inat": 1}, text)

        rejected = (
            ("CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/"),
            ("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"),
            ("CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"),
            ("CC BY-SA 4.0", ""),
            ("CC BY-SA 4.0", "http://creativecommons.org/licenses/by-sa/4.0/"),
            ("CC BY-NC 4.0", ""),
            ("CC BY-NC 4.0", "http://creativecommons.org/licenses/by-nc/4.0/"),
            ("CC BY-NC", "https://creativecommons.org/licenses/by-sa/4.0/"),
        )
        for index, (text, url) in enumerate(rejected):
            folder = self.root / f"rejected-{index}"
            _photo(
                folder / "bad.csv",
                [
                    self._base(
                        license=text,
                        license_url=url,
                        inat_photo_id=str(100 + index),
                        inat_observation_id=str(100 + index),
                        image_url=f"https://images.example.test/bad-{index}.jpg",
                        source_url=f"https://www.inaturalist.org/observations/{100 + index}",
                    )
                ],
            )
            rows, report = import_directory(folder, max_per_collector=10)
            self.assertEqual(rows, [], text or url)
            self.assertEqual(report["rows_written"], 0, text or url)

        df20 = self.root / "df20"
        _write_csv(
            df20 / "boletus_edulis.csv",
            [
                "species",
                "df20_name_used",
                "df20_image_path",
                "ImageUniqueID",
                "observationID",
                "gbifID",
                "photographer_rightsHolder",
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
                    "licence_note": "DF20 training-only; no per-image licence",
                }
            ],
        )
        held_out, held_report = import_directory(df20, max_per_collector=10)
        self.assertEqual(held_out, [])
        self.assertEqual(held_report["excluded_df20"], 1)
        self.assertEqual(held_report["dropped_by_reason"]["df20_opt_out"], 1)
        self.assertFalse(held_report["include_df20"])
        df20_rows, _df20_report = import_directory(df20, max_per_collector=10, include_df20=True)
        self.assertEqual(_df20_report["excluded_df20"], 0)
        self.assertEqual(len(df20_rows), 1)
        self.assertEqual(df20_rows[0]["license_normalized"], "df20")
        self.assertEqual(df20_rows[0]["usage"], "training_only")
        self.assertEqual(df20_rows[0]["source"], "df20")
        self.assertFalse(df20_rows[0].get("license_url"))
        self.assertNotIn("licence_url_source", df20_rows[0])
        self.assertTrue(attributions_complete(df20_rows))
        self.assertFalse(is_publishable(df20_rows[0]))
        self.assertTrue(training_eligible(df20_rows[0]))
        self.assertEqual(rows_for_atlas_gallery(df20_rows), [])
        self.assertEqual(license_breakdown(df20_rows)["by_license"], {"df20": 1})
        self.assertEqual(license_breakdown(df20_rows)["by_source"], {"df20": 1})

    def test_with_external_keeps_nc_and_sa_and_counts_excluded_df20(self):
        _photo(
            self.root / "mixed.csv",
            [
                self._base(
                    license="CC BY-NC 4.0",
                    license_url=_BY_NC_40,
                    inat_photo_id="1",
                    inat_observation_id="1",
                    image_url="https://images.example.test/nc.jpg",
                    source_url="https://www.inaturalist.org/observations/1",
                    author="Cyra",
                ),
                self._base(
                    license="CC BY-SA 4.0",
                    license_url=_BY_SA_40,
                    inat_photo_id="2",
                    inat_observation_id="2",
                    image_url="https://images.example.test/sa.jpg",
                    source_url="https://www.inaturalist.org/observations/2",
                    author="Dora",
                ),
            ],
        )
        _write_csv(
            self.root / "df20" / "boletus_edulis.csv",
            [
                "species",
                "ImageUniqueID",
                "observationID",
                "photographer_rightsHolder",
                "licence_note",
            ],
            [
                {
                    "species": "Boletus edulis",
                    "ImageUniqueID": "223-1",
                    "observationID": "223",
                    "photographer_rightsHolder": "Benny Example",
                    "licence_note": "DF20 training-only; no per-image licence",
                },
                {
                    "species": "Boletus edulis",
                    "ImageUniqueID": "224-1",
                    "observationID": "224",
                    "photographer_rightsHolder": "Benny Example",
                    "licence_note": "DF20 training-only; no per-image licence",
                },
            ],
        )
        rows, report = import_directory(self.root, max_per_collector=10)
        self.assertEqual(sorted(row["license_normalized"] for row in rows), ["cc-by-nc-4.0", "cc-by-sa-4.0"])
        self.assertEqual(report["excluded_df20"], 2)
        self.assertEqual(report["dropped_by_reason"]["df20_opt_out"], 2)
        self.assertFalse(report["include_df20"])
        self.assertTrue(all(row["source"] != "df20" for row in rows))
        opted, opted_report = import_directory(self.root, max_per_collector=10, include_df20=True)
        self.assertEqual(opted_report["excluded_df20"], 0)
        self.assertEqual(sum(1 for row in opted if row["source"] == "df20"), 2)
        self.assertEqual(sum(1 for row in opted if row["license_normalized"] == "cc-by-nc-4.0"), 1)
        self.assertEqual(sum(1 for row in opted if row["license_normalized"] == "cc-by-sa-4.0"), 1)

    def test_prepare_with_external_counts_df20_opt_out(self):
        folder = self.root / "prepared"
        folder.mkdir()
        path = folder / "external.jsonl"
        rows = [
            {
                "downloaded": False,
                "unverified": False,
                "usage": "training_only",
                "license_normalized": "cc-by-nc-4.0",
                "source": "inat",
                "class_id": "a",
                "file": "images/nc.jpg",
            },
            {
                "downloaded": False,
                "unverified": False,
                "usage": "training_only",
                "license_normalized": "df20",
                "source": "df20",
                "class_id": "a",
                "file": "images/df.jpg",
            },
        ]
        path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        kept, skipped = _usable_records([path])
        self.assertEqual(kept, [])
        self.assertEqual([item["skip_reason"] for item in skipped], ["df20_opt_out"])
        kept_on, skipped_on = _usable_records([path], include_df20=True)
        self.assertEqual(kept_on, [])
        self.assertEqual(skipped_on, [])

    def test_nc_and_sa_keep_the_https_license_url_version_from_the_row(self):
        cases = (
            ("CC BY-NC", "https://creativecommons.org/licenses/by-nc/2.5/", "cc-by-nc-2.5"),
            ("CC BY-SA", "https://creativecommons.org/licenses/by-sa/3.0/", "cc-by-sa-3.0"),
        )
        for index, (text, url, normalized) in enumerate(cases):
            folder = self.root / f"version-{index}"
            _photo(
                folder / "one.csv",
                [
                    self._base(
                        license=text,
                        license_url=url,
                        inat_photo_id=str(index + 1),
                        inat_observation_id=str(index + 1),
                        image_url=f"https://images.example.test/version-{index}.jpg",
                        source_url=f"https://www.inaturalist.org/observations/{index + 1}",
                    )
                ],
            )
            rows, report = import_directory(folder, max_per_collector=10)
            self.assertEqual(len(rows), 1, text)
            self.assertEqual(rows[0]["license_normalized"], normalized, text)
            self.assertEqual(rows[0]["license_url"], url, text)
            self.assertEqual(rows[0]["usage"], "training_only", text)
            self.assertTrue(attributions_complete(rows), text)
            self.assertEqual(report["rows_written"], 1, text)

    def test_share_alike_beats_cc_by_and_cc0(self):
        orders = (
            ("sa-then-cc0", ("CC BY-SA 4.0", _BY_SA_40), ("CC0", _ZERO)),
            ("cc0-then-sa", ("CC0", _ZERO), ("CC BY-SA 4.0", _BY_SA_40)),
            ("by-then-sa", ("CC BY 4.0", _BY_40), ("CC BY-SA 4.0", _BY_SA_40)),
        )
        for name, first, second in orders:
            folder = self.root / name
            _photo(
                folder / "pair.csv",
                [
                    self._base(
                        license=first[0],
                        license_url=first[1],
                        author="First Author",
                        inat_photo_id="77",
                        inat_observation_id="77",
                        image_url="https://images.example.test/sa-a.jpg",
                        source_url="https://www.inaturalist.org/observations/77",
                    ),
                    self._base(
                        license=second[0],
                        license_url=second[1],
                        author="Second Author",
                        inat_photo_id="77",
                        inat_observation_id="77",
                        image_url="https://images.example.test/sa-b.jpg",
                        source_url="https://www.inaturalist.org/observations/77",
                    ),
                ],
            )
            rows, report = import_directory(folder, max_per_collector=10)
            self.assertEqual(len(rows), 1, name)
            self.assertEqual(rows[0]["license_normalized"], "cc-by-sa-4.0", name)
            self.assertEqual(rows[0]["usage"], "training_only", name)
            self.assertFalse(is_publishable(rows[0]), name)
            self.assertEqual(report["dropped_looser_license"], 1, name)

    def test_float_rejects_non_finite(self):
        self.assertEqual(_float_or_none("52.23"), 52.23)
        self.assertIsNone(_float_or_none(""))
        self.assertIsNone(_float_or_none("nan"))
        self.assertIsNone(_float_or_none("NaN"))
        self.assertIsNone(_float_or_none("inf"))
        self.assertIsNone(_float_or_none("-inf"))
        self.assertIsNone(_float_or_none("Infinity"))

    def test_external_jsonl_is_opt_in(self):
        folder = self.root / "sources"
        folder.mkdir()
        (folder / "attributions.jsonl").write_text("{}\n", encoding="utf-8")
        (folder / "external.jsonl").write_text("{}\n", encoding="utf-8")
        only = _attribution_sources(folder, with_external=False)
        self.assertEqual([path.name for path in only], ["attributions.jsonl"])
        both = _attribution_sources(folder, with_external=True)
        self.assertEqual([path.name for path in both], ["attributions.jsonl", "external.jsonl"])
        (folder / "external.jsonl").unlink()
        with self.assertRaises(SystemExit):
            _attribution_sources(folder, with_external=True)


    def test_author_column_fills_creator_and_rights_holder(self):
        rows = []
        for index in range(12):
            rows.append(
                self._base(
                    author="Ada Hunter",
                    inat_observer="bea",
                    inat_photo_id=str(3000 + index),
                    inat_observation_id=str(4000 + index),
                    image_url=f"https://images.example.test/ada-{index}.jpg",
                    source_url=f"https://www.inaturalist.org/observations/{4000 + index}",
                )
            )
        _photo(self.root / "amanita_phalloides.csv", rows)
        written, report = import_directory(self.root)
        self.assertIsNone(report["max_per_collector"])
        self.assertIsNone(report["author_cap_formula"])
        self.assertIsNone(report["collector_cap_diagnostic"])
        self.assertEqual(len(written), 12)
        self.assertTrue(all(row["creator"] == "Ada Hunter" for row in written))
        self.assertTrue(all(row["rights_holder"] == "Ada Hunter" for row in written))
        self.assertTrue(all(row["collector_key"] == "inat:bea" for row in written))
        self.assertEqual(report["dropped_collector_cap"], 0)
        source = Path(__file__).resolve().parents[1].joinpath("import_external.py").read_text(encoding="utf-8")
        self.assertNotIn("DEFAULT_MAX_PER_COLLECTOR", source)
        self.assertIn("apply_person_class_cap", source)

    def test_csv_author_column_has_the_same_cap_key_as_creator_and_rights_holder(self):
        from person_cap import cap_author_key
        from split import person_identity_keys

        _photo(
            self.root / "amanita_phalloides.csv",
            [
                self._base(
                    author="Ada Hunter",
                    inat_observer="bea",
                    inat_photo_id="501",
                    inat_observation_id="601",
                    image_url="https://images.example.test/csv-ada.jpg",
                    source_url="https://www.inaturalist.org/observations/601",
                )
            ],
        )
        written, report = import_directory(self.root)
        self.assertEqual(len(written), 1)
        self.assertIsNone(report["max_per_collector"])
        row = written[0]
        self.assertEqual(row["author"], "Ada Hunter")
        self.assertEqual(row["creator"], row["author"])
        self.assertEqual(row["rights_holder"], row["author"])
        self.assertEqual(row["collector_key"], "inat:bea")
        author_only = {"creator": row["author"], "rights_holder": row["author"]}
        self.assertEqual(cap_author_key(row), cap_author_key(author_only))
        self.assertEqual(cap_author_key(row), cap_author_key({"creator": row["author"]}))
        self.assertEqual(cap_author_key(row), cap_author_key({"rights_holder": row["author"]}))
        self.assertEqual(cap_author_key(row), ("person:ada hunter", False))
        self.assertIn("person:bea", person_identity_keys(row))
        self.assertNotEqual(cap_author_key(row)[0], "person:bea")


    def test_default_import_does_not_cut_and_the_flag_is_diagnostic_only(self):
        from import_external import collector_cap_diagnostic

        rows = [
            self._base(
                author="Ada Hunter",
                inat_observer="bea",
                inat_photo_id=str(8000 + index),
                inat_observation_id=str(9000 + index),
                image_url=f"https://images.example.test/diag-{index}.jpg",
                source_url=f"https://www.inaturalist.org/observations/{9000 + index}",
            )
            for index in range(12)
        ]
        _photo(self.root / "amanita_phalloides.csv", rows)
        written, report = import_directory(self.root)
        self.assertEqual(len(written), 12)
        self.assertEqual(report["dropped_collector_cap"], 0)
        self.assertIsNone(report["collector_cap_diagnostic"])
        flagged, flagged_report = import_directory(self.root, max_per_collector=3)
        self.assertEqual(len(flagged), 12)
        self.assertEqual(flagged_report["dropped_collector_cap"], 0)
        self.assertEqual(flagged_report["collector_cap_diagnostic"]["limit"], 3)
        self.assertGreater(flagged_report["collector_cap_diagnostic"]["would_drop"], 0)
        self.assertEqual(collector_cap_diagnostic(written, 3)["would_drop"], flagged_report["collector_cap_diagnostic"]["would_drop"])


class CollectorCapTest(unittest.TestCase):
    def test_whole_observations_and_per_class(self):
        rows = []
        order = 1
        for obs, count in (("obs-a", 2), ("obs-b", 2), ("obs-c", 1)):
            for frame in range(count):
                rows.append(
                    {
                        "_order": order,
                        "class_id": "amanita_phalloides",
                        "creator": "Ada Hunter",
                        "rights_holder": "Ada Hunter",
                        "collector_key": "inat:bea",
                        "inat_observer": "bea",
                        "occurrence_key": obs,
                        "inat_photo_id": f"{obs}-{frame}",
                        "unverified": False,
                    }
                )
                order += 1
        rows.append(
            {
                "_order": order,
                "class_id": "boletus_edulis",
                "creator": "Ada Hunter",
                "rights_holder": "Ada Hunter",
                "collector_key": "inat:bea",
                "occurrence_key": "other",
                "inat_photo_id": "boletus-0",
                "unverified": False,
            }
        )
        kept, dropped = apply_collector_cap(rows, 3)
        self.assertEqual(dropped, [])
        self.assertEqual(len(kept), len(rows))
        phalloides = [row for row in kept if row["class_id"] == "amanita_phalloides"]
        self.assertEqual(len(phalloides), 5)
        self.assertEqual({row["occurrence_key"] for row in phalloides}, {"obs-a", "obs-b", "obs-c"})
        self.assertEqual(len(dropped), 0)
        self.assertEqual([row for row in kept if row["class_id"] == "boletus_edulis"], [rows[-1]])
        self.assertEqual([row["_order"] for row in kept], sorted(row["_order"] for row in kept))

    def test_formula_counts_creator_not_the_observer(self):
        rows = []
        order = 1
        for name, count in (("Ada Hunter", 12), ("Cara Hunter", 12)):
            for index in range(count):
                rows.append(
                    {
                        "_order": order,
                        "class_id": "amanita_phalloides",
                        "creator": name,
                        "rights_holder": name,
                        "collector_key": "inat:bea",
                        "inat_observer": "bea",
                        "occurrence_key": f"{name}-{index}",
                        "inat_photo_id": f"{name}-{index}",
                        "unverified": False,
                    }
                )
                order += 1
        kept, dropped = apply_collector_cap(rows)
        self.assertEqual(dropped, [])
        self.assertEqual(len(kept), 24)
        flagged, flagged_dropped = apply_collector_cap(rows, 10)
        self.assertEqual(flagged_dropped, [])
        self.assertEqual(len(flagged), 24)
        self.assertTrue(all(row["collector_key"] == "inat:bea" for row in kept))

    def test_missing_creator_uses_rights_holder(self):
        rows = [
            {
                "_order": index,
                "class_id": "amanita_phalloides",
                "creator": "",
                "rights_holder": "Ada Hunter",
                "collector_key": "inat:bea",
                "occurrence_key": f"obs-{index}",
                "inat_photo_id": f"hold-{index}",
                "unverified": False,
            }
            for index in range(12)
        ]
        kept, dropped = apply_collector_cap(rows)
        self.assertEqual(len(kept), 12)
        self.assertEqual(dropped, [])

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
