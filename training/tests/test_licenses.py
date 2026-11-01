import socket
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_gbif
from licenses import accepted_media_records, normalize_cc_license
from url_safety import UnsafeMediaUrl, listed_media_records, validate_media_url, validate_media_url_syntax


# licences.py and sampling.py. The hash moved when an explicit
# identificationVerificationStatus of unverified started to be rejected,
# so a GBIF query cache from before that rule is not reused. URL checks
# still live in url_safety.py and do not change this hash.
_MAIN_POLICY_HASH = "3a584fb8d946a3497ee3a25015efff3d2a1be425ebe48f109bd386426b6cdad9"


def _offline_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """IP literals stay themselves. Names resolve to a public address. No network."""
    import ipaddress

    try:
        ipaddress.ip_address(host)
        ip = host
    except ValueError:
        ip = "93.184.216.34"
    return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (ip, port or 0))]


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

    def test_policy_hash_matches_main(self):
        self.assertEqual(fetch_gbif._policy_hash(), _MAIN_POLICY_HASH)

    def test_listing_checks_syntax_only_and_cleans_attribution(self):
        def boom(*args, **kwargs):
            raise AssertionError("listing must not resolve DNS")

        occurrence = {
            "key": 42,
            "rightsHolder": "Holder\n\x1b[31m",
            "references": "https://www.inaturalist.org/observations/42",
            "scientificName": "Amanita phalloides\u202e",
            "country": "PL",
            "recordedBy": "A" * 3000,
            "media": [
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/by.jpg",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada\nLovelace",
                },
                {
                    "type": "StillImage",
                    "identifier": "http://127.0.0.1/secret.jpg",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada",
                },
                {
                    "type": "StillImage",
                    "identifier": "file:///etc/passwd",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada",
                },
                {
                    "type": "StillImage",
                    "identifier": "https://example.test/nc.jpg",
                    "license": "http://creativecommons.org/licenses/by-nc/4.0/",
                    "creator": "Ada",
                },
            ],
        }
        with patch("url_safety.socket.getaddrinfo", side_effect=boom):
            accepted = listed_media_records(occurrence)
        self.assertEqual(
            [row["image_url"] for row in accepted],
            ["https://example.test/by.jpg", "http://127.0.0.1/secret.jpg"],
        )
        self.assertEqual(accepted[0]["creator"], "AdaLovelace")
        self.assertEqual(accepted[0]["rights_holder"], "Holder[31m")
        self.assertEqual(accepted[0]["scientific_name"], "Amanita phalloides")
        self.assertEqual(len(accepted[0]["recorded_by"]), 2048)
        self.assertNotIn("\n", accepted[0]["creator"])
        self.assertNotIn("\u202e", accepted[0]["scientific_name"])

    def test_listing_keeps_an_unresolved_name_without_dns(self):
        occurrence = {
            "key": 7,
            "media": [
                {
                    "type": "StillImage",
                    "identifier": "https://images.example.test/a.jpg",
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada",
                }
            ],
        }
        with patch("url_safety.socket.getaddrinfo", side_effect=AssertionError("dns")):
            accepted = listed_media_records(occurrence)
        self.assertEqual(accepted[0]["image_url"], "https://images.example.test/a.jpg")

    def test_syntax_allows_only_http_on_ports_80_and_443(self):
        validate_media_url_syntax("https://images.example.test/a.jpg")
        validate_media_url_syntax("http://images.example.test/a.jpg")
        validate_media_url_syntax("https://images.example.test:443/a.jpg")
        validate_media_url_syntax("http://images.example.test:80/a.jpg")
        for url in (
            "ftp://images.example.test/a.jpg",
            "https://images.example.test/a.jpg\n",
            "https://images.example.test:8443/a.jpg",
            "http://images.example.test:8080/a.jpg",
            "http://images.example.test:4430/a.jpg",
            "https://example.test:21/a.jpg",
        ):
            with self.assertRaises(UnsafeMediaUrl, msg=url):
                validate_media_url_syntax(url)

    def test_validate_media_url_rejects_special_purpose_addresses(self):
        rejected = [
            "http://10.1.1.1/a.jpg",
            "http://127.0.0.1/a.jpg",
            "http://169.254.169.254/latest/meta-data",
            "http://100.64.0.1/a.jpg",
            "http://192.168.0.1/a.jpg",
            "http://[::1]/a.jpg",
            "http://224.0.0.1/a.jpg",
            "http://198.18.0.1/a.jpg",
            "ftp://images.example.test/a.jpg",
            "https://images.example.test:8443/a.jpg",
            "https://images.example.test/a.jpg\n",
        ]
        with patch("url_safety.socket.getaddrinfo", side_effect=_offline_getaddrinfo):
            for url in rejected:
                with self.assertRaises(UnsafeMediaUrl, msg=url):
                    validate_media_url(url)
            validate_media_url("https://images.example.test/a.jpg")

    def test_license_filter_itself_does_not_drop_a_url(self):
        occurrence = {
            "key": 1,
            "media": [
                {
                    "type": "StillImage",
                    "identifier": "file:///etc/passwd",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                }
            ],
        }
        self.assertEqual(accepted_media_records(occurrence)[0]["image_url"], "file:///etc/passwd")


if __name__ == "__main__":
    unittest.main()
