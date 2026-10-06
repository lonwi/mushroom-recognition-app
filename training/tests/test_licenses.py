import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from licenses import accepted_media_records, normalize_cc_license


class LicenseFilterTest(unittest.TestCase):
    def test_accepts_cc_by_and_cc0_urls(self):
        self.assertEqual(
            normalize_cc_license("http://creativecommons.org/licenses/by/4.0/"),
            "cc-by-4.0",
        )
        self.assertEqual(
            normalize_cc_license("http://creativecommons.org/licenses/by/4.0/legalcode"),
            "cc-by-4.0",
        )
        self.assertEqual(
            normalize_cc_license("https://creativecommons.org/licenses/by/2.0/"),
            "cc-by-2.0",
        )
        self.assertEqual(
            normalize_cc_license("http://creativecommons.org/publicdomain/zero/1.0/"),
            "cc0-1.0",
        )

    def test_rejects_nc_sa_nd_and_unknown(self):
        rejected = [
            "http://creativecommons.org/licenses/by-nc/4.0/legalcode",
            "http://creativecommons.org/licenses/by-nc/4.0/",
            "http://creativecommons.org/licenses/by-sa/4.0/",
            "http://creativecommons.org/licenses/by-nc-nd/4.0/",
            "http://creativecommons.org/licenses/by-nc-sa/4.0/",
            "http://creativecommons.org/licenses/by-nd/4.0/",
            "© All rights reserved",
            "Copyright by the creator. For license and creator details, see https://example.test/bild=1",
            "(c) Field Museum of Natural History - CC BY-NC 4.0",
            "",
            None,
        ]
        for raw in rejected:
            self.assertIsNone(normalize_cc_license(raw), raw)

    def test_media_license_wins_over_the_occurrence_license(self):
        occurrence = {
            "key": 42,
            "license": "http://creativecommons.org/licenses/by/4.0/",
            "rightsHolder": "Record Holder",
            "references": "https://www.inaturalist.org/observations/42",
            "scientificName": "Amanita phalloides",
            "country": "PL",
            "media": [
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/by.jpg",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada",
                },
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/nc.jpg",
                    "license": "http://creativecommons.org/licenses/by-nc/4.0/",
                    "creator": "Ada",
                },
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/reserved.jpg",
                    "license": "© All rights reserved",
                    "creator": "Ada",
                },
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/missing.jpg",
                    "creator": "Ada",
                },
            ],
        }
        accepted = accepted_media_records(occurrence)
        self.assertEqual([row["image_url"] for row in accepted], ["https://example.test/by.jpg"])
        self.assertEqual(accepted[0]["license_normalized"], "cc-by-4.0")
        self.assertEqual(accepted[0]["creator"], "Ada")
        self.assertEqual(accepted[0]["source_url"], "https://www.inaturalist.org/observations/42")
        self.assertIn("gbif.org/occurrence/42", accepted[0]["gbif_occurrence"])


if __name__ == "__main__":
    unittest.main()
