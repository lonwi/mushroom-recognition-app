"""http attribution URLs are rewritten only when that resource was checked.

The committed fixture is read from disk. Nothing in this module opens a socket.
"""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_gbif
import https_equivalence
from component_share import COMPONENT_SHARE_LIMIT
from https_equivalence import (
    allowlisted_hosts,
    clear_fixture_cache,
    load_equivalence_fixture,
    sample_matches,
    upgrade_verified_url,
)
from migrate_attribution_https import ResourceCheck, live_same_resource, migrate_rows
from prepare_data import (
    _usable_records,
    gbif_input_hashes,
    http_rejection_report,
    write_prepare_outputs,
)
from salt_fixture import FIXTURE_SALT

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "https_host_equivalence.json"


def _sample(url: str, digest: str, *, status: int = 200) -> dict:
    parts_https = "https://" + url[len("http://") :]
    return {
        "url": url,
        "https_url": parts_https,
        "http_status": status,
        "https_status": status,
        "http_sha256": digest,
        "https_sha256": digest,
    }


class FixtureAllowlistTest(unittest.TestCase):
    def test_committed_samples_match_and_a_mismatch_drops_the_host(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        self.assertIn("captured_at", fixture)
        self.assertGreaterEqual(len(fixture["captured_at"]), 10)
        allowed = allowlisted_hosts(fixture)
        self.assertEqual(allowed, set(fixture["hosts"]))
        for host, block in fixture["hosts"].items():
            samples = block["samples"]
            self.assertGreaterEqual(len(samples), 5, host)
            for sample in samples:
                self.assertTrue(sample_matches(sample), host)
                self.assertEqual(sample["http_sha256"], sample["https_sha256"], host)
                self.assertGreaterEqual(sample["http_status"], 200)
                self.assertLess(sample["http_status"], 300)
                self.assertGreaterEqual(sample["https_status"], 200)
                self.assertLess(sample["https_status"], 300)
        rejected = fixture.get("rejected_hosts") or {}
        self.assertTrue(rejected)
        for host, block in rejected.items():
            self.assertNotIn(host, allowed)
            samples = block["samples"]
            self.assertGreaterEqual(len(samples), 5, host)
            self.assertFalse(all(sample_matches(sample) for sample in samples), host)
        if fixture["hosts"]:
            host = next(iter(fixture["hosts"]))
            broken = json.loads(json.dumps(fixture))
            broken["hosts"][host]["samples"][0]["https_sha256"] = "0" * 64
            self.assertNotIn(host, allowlisted_hosts(broken))
            self.assertFalse(sample_matches(broken["hosts"][host]["samples"][0]))

    def test_only_the_captured_resource_is_upgraded_not_the_host(self):
        digest = "a" * 64
        proven = _sample("http://sweetgum.nybg.org/images3/1.jpg", digest)
        fixture = {"hosts": {"sweetgum.nybg.org": {"samples": [proven]}}, "rejected_hosts": {}}
        upgraded, reason = upgrade_verified_url(proven["url"], fixture)
        self.assertIsNone(reason)
        self.assertEqual(upgraded, "https://sweetgum.nybg.org/images3/1.jpg")
        sibling, sibling_reason = upgrade_verified_url("http://sweetgum.nybg.org/images3/9.jpg", fixture)
        self.assertEqual(sibling, "http://sweetgum.nybg.org/images3/9.jpg")
        self.assertEqual(sibling_reason, "https_not_verified_for_url")
        other, other_reason = upgrade_verified_url("http://farm1.staticflickr.com/1.jpg", fixture)
        self.assertEqual(other_reason, "http_host_not_allowlisted")
        self.assertTrue(other.startswith("http://"))
        already, already_reason = upgrade_verified_url("https://images.example.test/a.jpg", fixture)
        self.assertIsNone(already_reason)
        self.assertEqual(already, "https://images.example.test/a.jpg")


class FetchHttpsPolicyTest(unittest.TestCase):
    def setUp(self):
        clear_fixture_cache()
        self._dns = patch("url_safety.socket.getaddrinfo", side_effect=_public_dns)
        self._dns.start()
        self.addCleanup(self._dns.stop)
        self.addCleanup(clear_fixture_cache)

    def test_prepare_upgrades_a_captured_url_and_leaves_credit_text(self):
        sample = _sample("http://images.example.test/captured.jpg", "ab" * 32)
        https_equivalence._CACHE = {
            "hosts": {"images.example.test": {"samples": [sample]}},
            "rejected_hosts": {},
        }
        row = {
            "occurrence_key": 7,
            "media_index": 0,
            "class_id": "boletus_edulis",
            "image_url": sample["url"],
            "source_url": "https://www.gbif.org/occurrence/7",
            "creator": f"Ada {sample['url']}",
        }
        self.assertIsNone(fetch_gbif.prepare_attribution_urls(row))
        self.assertEqual(row["image_url"], sample["https_url"])
        self.assertEqual(row["creator"], f"Ada {sample['url']}")
        sibling = {
            "occurrence_key": 8,
            "media_index": 0,
            "image_url": "http://images.example.test/other.jpg",
            "source_url": "https://www.gbif.org/occurrence/8",
            "creator": "Bea http://sweetgum.nybg.org/thanks",
        }
        reason = fetch_gbif.prepare_attribution_urls(sibling)
        self.assertEqual(reason, "https_not_verified_for_url")
        self.assertEqual(sibling["image_url"], "http://images.example.test/other.jpg")
        self.assertIn("http://", sibling["creator"])

    def test_captured_rejection_is_not_rewritten(self):
        clear_fixture_cache()
        fixture = load_equivalence_fixture()
        self.assertTrue(fixture.get("rejected_hosts"))
        for host, block in fixture["rejected_hosts"].items():
            url = block["samples"][0]["url"]
            row = {
                "image_url": url,
                "source_url": "https://www.gbif.org/occurrence/1",
                "creator": f"Ada {url}",
            }
            reason = fetch_gbif.prepare_attribution_urls(row)
            self.assertEqual(reason, "http_host_not_allowlisted", host)
            self.assertEqual(row["image_url"], url)
            self.assertTrue(row["creator"].startswith("Ada http://"))

    def test_verified_https_download_failure_is_an_explicit_reject(self):
        sample = _sample("http://images.example.test/captured.jpg", "cd" * 32)
        https_equivalence._CACHE = {
            "hosts": {"images.example.test": {"samples": [sample]}},
            "rejected_hosts": {},
        }
        row = {
            "occurrence_key": 11,
            "media_index": 0,
            "class_id": "boletus_edulis",
            "image_url": sample["url"],
            "source_url": "https://www.gbif.org/occurrence/11",
        }
        self.assertIsNone(fetch_gbif.prepare_attribution_urls(row))
        fetch_gbif._attach_file(row, "boletus_edulis")

        def urlopen(request, timeout=40):
            raise urllib.error.HTTPError(request.full_url, 404, "missing", None, None)

        with tempfile.TemporaryDirectory() as tmp, patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            opener = fetch_gbif._media_opener
            fetch_gbif._media_opener = _UrlopenOpener()
            try:
                fetch_gbif._download_rows([row], directory=Path(tmp), resume=False, workers=1)
            finally:
                fetch_gbif._media_opener = opener
        self.assertIsNot(row.get("downloaded"), True)
        self.assertEqual(row["_failure_reason"], "https_url_failed")
        self.assertTrue(row["_policy_reject"])
        listed = fetch_gbif._policy_rejected_records([row])
        self.assertEqual(listed[0]["reason"], "https_url_failed")
        self.assertEqual(listed[0]["class_id"], "boletus_edulis")


class MigrationTest(unittest.TestCase):
    def test_rewrite_requires_a_per_url_match_and_rejects_the_rest(self):
        seen: list[str] = []

        def verify(url: str) -> ResourceCheck:
            seen.append(url)
            if url.endswith("/same.jpg"):
                return ResourceCheck(True, "https_same_resource")
            return ResourceCheck(False, "https_not_same_resource")

        credit = "photo by Ada, http://sweetgum.nybg.org/same.jpg"
        rows = [
            {
                "class_id": "boletus_edulis",
                "file": "ok.jpg",
                "image_url": "http://sweetgum.nybg.org/same.jpg",
                "source_url": "https://www.gbif.org/occurrence/1",
                "creator": credit,
            },
            {
                "class_id": "boletus_edulis",
                "file": "no.jpg",
                "image_url": "http://sweetgum.nybg.org/other.jpg",
                "source_url": "https://www.gbif.org/occurrence/2",
                "creator": "Bea http://farm1.staticflickr.com/x",
            },
            {
                "class_id": "cantharellus_cibarius",
                "file": "page.jpg",
                "image_url": "https://cdn.example.test/a.jpg",
                "source_url": "http://specimens.kew.org/Fungarium/K-M1",
                "creator": "Cyra",
            },
        ]
        kept, report = migrate_rows(rows, verify)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["image_url"], "https://sweetgum.nybg.org/same.jpg")
        self.assertEqual(kept[0]["creator"], credit)
        self.assertEqual(report["rewritten_rows"], 1)
        self.assertEqual(report["rejected_rows"], 2)
        self.assertEqual(report["rejected_per_class"]["boletus_edulis"]["https_not_same_resource"], 1)
        self.assertEqual(report["rejected_per_class"]["cantharellus_cibarius"]["https_not_same_resource"], 1)
        self.assertTrue(report["rejected"][0]["image_url"].startswith("http://"))
        self.assertNotIn(credit, seen)
        self.assertNotIn("http://farm1.staticflickr.com/x", seen)

    def test_live_check_compares_bodies_and_ignores_the_host(self):
        bodies = {
            "http://sweetgum.nybg.org/a.jpg": b"same-bytes",
            "https://sweetgum.nybg.org/a.jpg": b"same-bytes",
            "http://sweetgum.nybg.org/b.jpg": b"left",
            "https://sweetgum.nybg.org/b.jpg": b"right",
        }

        def urlopen(request, timeout=60):
            return _Body(bodies[request.full_url])

        with patch("migrate_attribution_https.urllib.request.urlopen", side_effect=urlopen):
            good = live_same_resource("http://sweetgum.nybg.org/a.jpg")
            bad = live_same_resource("http://sweetgum.nybg.org/b.jpg")
        self.assertTrue(good.same_resource)
        self.assertEqual(good.reason, "https_same_resource")
        self.assertFalse(bad.same_resource)
        self.assertEqual(bad.reason, "https_not_same_resource")


class PrepareHttpsReportTest(unittest.TestCase):
    def test_http_rows_are_skipped_per_class_and_https_rows_stay(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            image = root / "images" / "boletus_edulis" / "ok.png"
            image.parent.mkdir(parents=True)
            Image.new("RGB", (8, 8), (10, 20, 30)).save(image)
            rows = [
                {
                    "downloaded": True,
                    "class_id": "boletus_edulis",
                    "file": "images/boletus_edulis/http.jpg",
                    "image_url": "http://sweetgum.nybg.org/images3/not-checked.jpg",
                    "source_url": "https://www.gbif.org/occurrence/1",
                    "creator": "Ada http://sweetgum.nybg.org/credit",
                },
                {
                    "downloaded": True,
                    "class_id": "cantharellus_cibarius",
                    "file": "images/boletus_edulis/ok.png",
                    "image_url": "https://images.example.test/ok.png",
                    "source_url": "https://www.gbif.org/occurrence/2",
                    "creator": "Bea http://example.test/thanks",
                },
            ]
            path = root / "attributions.jsonl"
            path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
            with patch("prepare_data.DATA_DIR", root):
                records, skipped = _usable_records([path])
        self.assertEqual([row["file"] for row in records], ["images/boletus_edulis/ok.png"])
        self.assertEqual(records[0]["creator"], "Bea http://example.test/thanks")
        http_skips = [row for row in skipped if row.get("skip_reason") == "url_not_https"]
        self.assertEqual(len(http_skips), 1)
        self.assertEqual(http_skips[0]["image_url"], "http://sweetgum.nybg.org/images3/not-checked.jpg")
        self.assertEqual(http_skips[0]["creator"], "Ada http://sweetgum.nybg.org/credit")
        self.assertEqual(http_skips[0]["non_https_fields"], ["image_url"])
        report = http_rejection_report(skipped)
        self.assertEqual(report["rejected_http_rows"], 1)
        self.assertEqual(report["rejected_http_per_class"]["boletus_edulis"]["url_not_https"], 1)

    def test_report_and_manifest_hash_the_gbif_fetch_files(self):
        fetch_bytes = b'{"classes":{"boletus_edulis":{"accepted":1}}}\n'
        rows_bytes = b'{"image_url":"https://images.example.test/a.jpg"}\n'
        splits = _balanced_splits()
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory / "fetch_report.json").write_bytes(fetch_bytes)
            (directory / "attributions.jsonl").write_bytes(rows_bytes)
            skipped = [
                {
                    "class_id": "boletus_edulis",
                    "skip_reason": "url_not_https",
                    "non_https_fields": ["source_url"],
                    "file": "old.jpg",
                    "image_url": "https://images.example.test/old.jpg",
                    "source_url": "http://specimens.kew.org/Fungarium/K-M9",
                }
            ]
            write_prepare_outputs(
                directory,
                prepared=splits["train"] + splits["val"] + splits["test"],
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
            manifest = json.loads((directory / "dataset_manifest.json").read_text(encoding="utf-8"))
        fetch_hash = hashlib.sha256(fetch_bytes).hexdigest()
        rows_hash = hashlib.sha256(rows_bytes).hexdigest()
        self.assertEqual(report["gbif_fetch_report_sha256"], fetch_hash)
        self.assertEqual(report["gbif_rows_sha256"], rows_hash)
        self.assertEqual(manifest["gbif_fetch_report_sha256"], fetch_hash)
        self.assertEqual(manifest["gbif_rows_sha256"], rows_hash)
        self.assertEqual(report["rejected_http_rows"], 1)
        self.assertEqual(report["rejected_http_per_class"]["boletus_edulis"]["url_not_https"], 1)
        self.assertIn("boletus_edulis", manifest["splits"]["train"]["per_class"])

    def test_missing_gbif_rows_file_records_a_null_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            payload = b"{}\n"
            (directory / "fetch_report.json").write_bytes(payload)
            hashes = gbif_input_hashes(directory)
        self.assertEqual(hashes["gbif_fetch_report_sha256"], hashlib.sha256(payload).hexdigest())
        self.assertIsNone(hashes["gbif_rows_sha256"])


def _balanced_splits() -> dict[str, list[dict]]:
    rows = []
    for index in range(10):
        rows.append(
            {
                "class_id": "boletus_edulis",
                "inat_observer": f"login_{index}",
                "author": "",
                "license": "CC BY",
                "image_url": f"https://images.example.test/boletus_edulis/{index}.jpg",
                "source_url": f"https://example.test/obs/{index}",
                "file": f"boletus_edulis_{index}.jpg",
                "occurrence_key": f"occ-{index}",
                "inat_photo_id": f"photo-{index}",
                "inat_observation_id": f"obs-{index}",
            }
        )
    return {"train": rows[:6], "val": rows[6:8], "test": rows[8:]}


def _public_dns(host, port, family=0, type=0, proto=0, flags=0):
    import socket

    return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("93.184.216.34", port or 0))]


class _UrlopenOpener:
    def open(self, request, timeout=40):
        return urllib.request.urlopen(request, timeout=timeout)


class _Body:
    def __init__(self, payload: bytes):
        self.status = 200
        self._payload = payload

    def read(self, size: int = -1) -> bytes:
        if not self._payload:
            return b""
        if size is None or size < 0 or size >= len(self._payload):
            chunk = self._payload
            self._payload = b""
            return chunk
        chunk = self._payload[:size]
        self._payload = self._payload[size:]
        return chunk

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


if __name__ == "__main__":
    unittest.main()
