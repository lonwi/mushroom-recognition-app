"""Resume, retry, and byte-stable output for the GBIF photo fetch.

Collected by unittest and by pytest. No network: urlopen is mocked.
"""

from __future__ import annotations

import io
import json
import os
import re
import socket
import ssl
import sys
import threading
import time
import unittest
import urllib.error
import urllib.parse
from email.message import EmailMessage
from email.utils import formatdate
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_gbif


def _jpeg_bytes(index: int = 0) -> bytes:
    width = 220 + (index % 5)
    image = Image.new("RGB", (width, width))
    image.putdata(
        [
            ((index * 17 + x) % 256, (index * 31 + y) % 256, (x * y + index) % 256)
            for y in range(width)
            for x in range(width)
        ]
    )
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    payload = buffer.getvalue()
    if len(payload) < 5_000:
        raise RuntimeError(f"fixture jpeg is {len(payload)} bytes")
    return payload


def _http_error(code: int, reason: str, headers: dict[str, str] | None = None, url: str = "https://img.example.test/a.jpg"):
    header = EmailMessage()
    for key, value in (headers or {}).items():
        header[key] = value
    return urllib.error.HTTPError(url, code, reason, header, None)


class _Response:
    def __init__(self, payload: bytes, content_type: str = "image/jpeg"):
        self._payload = payload
        self.headers = {"Content-Type": content_type}

    def read(self, size: int = -1) -> bytes:
        if size is None or size < 0 or size >= len(self._payload):
            return self._payload
        return self._payload[:size]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class _Gate:
    """Release mocked downloads in a fixed order that is not submission order."""

    def __init__(self, order: list[str]):
        self.order = order
        self.next = 0
        self.finished: list[str] = []
        self._cond = threading.Condition()

    def arrive(self, url: str) -> None:
        with self._cond:
            while self.next < len(self.order) and self.order[self.next] != url:
                if not self._cond.wait(5):
                    raise RuntimeError(f"timed out releasing {url}")
            self.finished.append(url)
            self.next += 1
            self._cond.notify_all()


class FetchCase(unittest.TestCase):
    jpeg: bytes

    @classmethod
    def setUpClass(cls):
        cls.jpeg = _jpeg_bytes(0)

    def setUp(self):
        fetch_gbif._last_gbif_api_at = None
        fetch_gbif._HOST_SEMAPHORES.clear()
        fetch_gbif._VERIFIED.clear()
        fetch_gbif.MAX_DOWNLOADS_PER_HOST = 4
        fetch_gbif._KEY_CACHE.clear()


class DownloadRetryTest(FetchCase):
    def setUp(self):
        super().setUp()
        import tempfile

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self._root = Path(self._tmp.name)
        self._dest = self._root / "images" / "boletus_edulis" / "1_0.jpg"
        self._url = "https://images.example.test/1.jpg"

    def test_retries_5xx_and_stops_on_403_and_404(self):
        calls = {"500": 0, "404": 0, "403": 0}

        def fail(code: int, bucket: str):
            def urlopen(request, timeout=40):
                calls[bucket] += 1
                raise _http_error(code, "nope", url=request.full_url)

            return urlopen

        sleeps: list[float] = []
        with patch("fetch_gbif.random.uniform", return_value=0.25), patch(
            "fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)
        ):
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=fail(500, "500")):
                with self.assertRaises(urllib.error.HTTPError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["500"], 3)
            self.assertEqual(sleeps, [0.75, 1.25])
            self.assertFalse(self._dest.exists())
            self.assertFalse(self._dest.with_name(self._dest.name + ".partial").exists())

            sleeps.clear()
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=fail(404, "404")):
                with self.assertRaises(urllib.error.HTTPError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["404"], 1)
            self.assertEqual(sleeps, [])

            with patch("fetch_gbif.urllib.request.urlopen", side_effect=fail(403, "403")):
                with self.assertRaises(urllib.error.HTTPError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["403"], 1)
            self.assertEqual(sleeps, [])

    def test_429_honors_retry_after_and_backoff_when_absent(self):
        calls = {"n": 0}

        def urlopen_with_header(request, timeout=40):
            calls["n"] += 1
            if calls["n"] == 1:
                raise _http_error(429, "Too Many Requests", {"Retry-After": "4"}, url=request.full_url)
            return _Response(self.jpeg)

        sleeps: list[float] = []
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen_with_header), patch(
            "fetch_gbif.random.uniform", return_value=0.25
        ), patch("fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)):
            size = fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [4.25])
        self.assertEqual(size, len(self.jpeg))

        calls["n"] = 0
        self._dest.unlink()

        def urlopen_without_header(request, timeout=40):
            calls["n"] += 1
            if calls["n"] == 1:
                raise _http_error(429, "Too Many Requests", url=request.full_url)
            return _Response(self.jpeg)

        sleeps.clear()
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen_without_header), patch(
            "fetch_gbif.random.uniform", return_value=0.25
        ), patch("fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)):
            fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [fetch_gbif.DOWNLOAD_BACKOFF_SECONDS + 0.25])

    def test_retry_after_date_and_cap(self):
        when = time.time() + 30
        error = _http_error(429, "Too Many Requests", {"Retry-After": formatdate(timeval=when, usegmt=True)})
        delay = fetch_gbif._retry_after_seconds(error)
        self.assertIsNotNone(delay)
        self.assertGreater(delay, 20)
        self.assertLessEqual(delay, 31)
        capped = _http_error(429, "Too Many Requests", {"Retry-After": "99999"})
        self.assertEqual(fetch_gbif._retry_after_seconds(capped), fetch_gbif.MAX_RETRY_AFTER_SECONDS)
        invalid = _http_error(429, "Too Many Requests", {"Retry-After": "soon"})
        self.assertIsNone(fetch_gbif._retry_after_seconds(invalid))
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            if calls["n"] == 1:
                raise _http_error(429, "Too Many Requests", {"Retry-After": "soon"}, url=request.full_url)
            return _Response(self.jpeg)

        sleeps: list[float] = []
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch(
            "fetch_gbif.random.uniform", return_value=0.25
        ), patch("fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)):
            fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [fetch_gbif.DOWNLOAD_BACKOFF_SECONDS + 0.25])

    def test_dns_timeout_reset_and_ssl_are_retried(self):
        reasons = [
            socket.gaierror(socket.EAI_AGAIN, "Temporary failure in name resolution"),
            TimeoutError("timed out"),
            ConnectionResetError("connection reset"),
            ssl.SSLError("ssl handshake failure"),
        ]
        for reason in reasons:
            calls = {"n": 0}

            def urlopen(request, timeout=40, reason=reason):
                calls["n"] += 1
                raise urllib.error.URLError(reason)

            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"):
                with self.assertRaises(urllib.error.URLError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["n"], 3, reason)

    def test_certificate_errors_are_not_retried(self):
        refused = [
            urllib.error.URLError(ssl.SSLCertVerificationError(1, "certificate verify failed")),
            urllib.error.URLError(ssl.SSLError("CERTIFICATE_VERIFY_FAILED")),
            urllib.error.URLError("certificate verify failed"),
        ]
        for reason in refused:
            calls = {"n": 0}

            def urlopen(request, timeout=40, reason=reason):
                calls["n"] += 1
                raise urllib.error.URLError(reason) if not isinstance(reason, urllib.error.URLError) else reason

            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"):
                with self.assertRaises(urllib.error.URLError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["n"], 1, reason)

        still_transient = [
            ssl.SSLError("EOF occurred in violation of protocol"),
            ssl.SSLError("The handshake operation timed out"),
            ssl.SSLError("ssl wrong version number from a broken connection"),
        ]
        for reason in still_transient:
            calls = {"n": 0}

            def urlopen(request, timeout=40, reason=reason):
                calls["n"] += 1
                raise urllib.error.URLError(reason)

            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"):
                with self.assertRaises(urllib.error.URLError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["n"], 3, reason)

    def test_html_and_tiny_payload_are_not_retried(self):
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            return _Response(b"<html>nope</html>", content_type="text/html")

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"):
            with self.assertRaises(RuntimeError):
                fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 1)
        self.assertFalse(self._dest.exists())

        calls["n"] = 0

        def tiny(request, timeout=40):
            calls["n"] += 1
            return _Response(self.jpeg[:100])

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=tiny), patch("fetch_gbif.time.sleep"):
            with self.assertRaises(RuntimeError):
                fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 1)
        self.assertFalse(list(self._dest.parent.glob("*.partial")))

    def test_skip_line_is_printed_once(self):
        def urlopen(request, timeout=40):
            raise _http_error(404, "Not Found", url=request.full_url)

        row = {
            "occurrence_key": 1,
            "media_index": 0,
            "image_url": self._url,
        }
        stderr = io.StringIO()
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"), patch(
            "sys.stderr", stderr
        ):
            kept = fetch_gbif._store_media(
                [row],
                folder="boletus_edulis",
                directory=self._root,
                dry_run=False,
                resume=True,
                workers=4,
            )
        self.assertEqual(kept, [])
        self.assertEqual(stderr.getvalue().count("skip "), 1)
        self.assertIn(f"skip {self._url}:", stderr.getvalue())


class ResumeAndAtomicTest(FetchCase):
    def setUp(self):
        super().setUp()
        import tempfile

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self._root = Path(self._tmp.name)
        self._dest = self._root / "shot.jpg"
        self._url = "https://images.example.test/shot.jpg"

    def test_resume_skips_a_complete_image_and_records_its_size(self):
        self._dest.write_bytes(self.jpeg)
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            raise AssertionError("urlopen should not run")

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            size = fetch_gbif.download_image(self._url, self._dest, resume=True)
        self.assertEqual(calls["n"], 0)
        self.assertEqual(size, self._dest.stat().st_size)
        self.assertEqual(size, len(self.jpeg))

        row = {"occurrence_key": 7, "media_index": 1, "image_url": self._url}
        # The on-disk file is named by the helper from occurrence key and index.
        target = self._root / "images" / "boletus_edulis" / "7_1.jpg"
        target.parent.mkdir(parents=True)
        target.write_bytes(self.jpeg)
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            kept = fetch_gbif._store_media(
                [row],
                folder="boletus_edulis",
                directory=self._root,
                dry_run=False,
                resume=True,
                workers=4,
            )
        self.assertEqual(calls["n"], 0)
        self.assertTrue(kept[0]["downloaded"])
        self.assertEqual(kept[0]["bytes"], target.stat().st_size)
        self.assertEqual(kept[0]["source"], "gbif")
        self.assertEqual(kept[0]["file"], "images/boletus_edulis/7_1.jpg")

    def test_no_resume_downloads_again(self):
        self._dest.write_bytes(self.jpeg)
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            return _Response(self.jpeg)

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            size = fetch_gbif.download_image(self._url, self._dest, resume=False)
        self.assertEqual(calls["n"], 1)
        self.assertEqual(size, len(self.jpeg))

    def test_partial_file_never_counts_as_downloaded(self):
        partial = self._dest.with_name(self._dest.name + ".partial")
        partial.write_bytes(self.jpeg)
        self._dest.write_bytes(b"\xff\xd8\xff" + b"\x00" * 64)
        self.assertFalse(fetch_gbif._is_complete_image(self._dest))
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            return _Response(self.jpeg)

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            size = fetch_gbif.download_image(self._url, self._dest, resume=True)
        self.assertEqual(calls["n"], 1)
        self.assertEqual(size, len(self.jpeg))
        self.assertTrue(fetch_gbif._is_complete_image(self._dest))
        self.assertFalse(partial.exists())
        self.assertEqual(self._dest.read_bytes(), self.jpeg)

        # A partial with no destination is not a finished photo either.
        self._dest.unlink()
        partial.write_bytes(self.jpeg)
        calls["n"] = 0
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            fetch_gbif.download_image(self._url, self._dest, resume=True)
        self.assertEqual(calls["n"], 1)
        self.assertTrue(self._dest.is_file())
        self.assertFalse(partial.exists())

    def test_download_renames_a_temp_file_into_place(self):
        seen: list[tuple[str, str]] = []
        real_replace = fetch_gbif.os.replace

        def spy(src, dst):
            source = Path(src)
            target = Path(dst)
            seen.append((source.name, target.name))
            self.assertTrue(source.name.endswith(".partial"))
            self.assertEqual(source.read_bytes(), self.jpeg)
            self.assertFalse(target.exists())
            return real_replace(src, dst)

        def urlopen(request, timeout=40):
            self.assertFalse(self._dest.exists())
            self.assertFalse(self._dest.with_name(self._dest.name + ".partial").exists())
            return _Response(self.jpeg)

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.os.replace", side_effect=spy):
            fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(seen, [(self._dest.name + ".partial", self._dest.name)])
        self.assertEqual(self._dest.read_bytes(), self.jpeg)
        self.assertFalse(self._dest.with_name(self._dest.name + ".partial").exists())

    def test_failed_replace_leaves_the_previous_file_and_no_partial(self):
        self._dest.write_bytes(self.jpeg)
        real_replace = fetch_gbif.os.replace

        def boom(src, dst):
            if str(src).endswith(".partial"):
                raise OSError("disk full")
            return real_replace(src, dst)

        def urlopen(request, timeout=40):
            return _Response(_jpeg_bytes(3))

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.os.replace", side_effect=boom), patch(
            "fetch_gbif.time.sleep"
        ):
            with self.assertRaises(OSError):
                fetch_gbif.download_image(self._url, self._dest, resume=False)
        self.assertEqual(self._dest.read_bytes(), self.jpeg)
        self.assertFalse(self._dest.with_name(self._dest.name + ".partial").exists())

    def test_atomic_text_replace_keeps_the_previous_file(self):
        path = self._root / "attributions.jsonl"
        fetch_gbif._atomic_write_text(path, "old\n")

        def boom(src, dst):
            raise OSError("disk full")

        with patch("fetch_gbif.os.replace", side_effect=boom):
            with self.assertRaises(OSError):
                fetch_gbif._atomic_write_text(path, "new\n")
        self.assertEqual(path.read_text(encoding="utf-8"), "old\n")
        self.assertEqual(list(self._root.glob(".attributions.jsonl.*.tmp")), [])


class OutputOrderTest(FetchCase):
    def _manifest(self):
        return {
            "classes": [
                {
                    "id": "boletus_edulis",
                    "gbif_names": ["Boletus edulis"],
                    "safety_tag": "edible",
                }
            ]
        }

    def _rows(self):
        rows = []
        for index in range(8):
            rows.append(
                {
                    "occurrence_key": 1000 + index,
                    "media_index": 0,
                    "image_url": f"https://images.example.test/boletus/{index}.jpg",
                    "creator": "Ada Łąka",
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "license_normalized": "cc-by-4.0",
                    "class_id": "boletus_edulis",
                    "taxon_name": "Boletus edulis",
                    "queried_name": "Boletus edulis",
                    "region_scope": "central_europe" if index % 2 == 0 else "global_fill",
                    "held_out_taxon": False,
                    "toxic": False,
                    "genus_relation": "",
                    "decimal_latitude": None,
                }
            )
        return rows

    def test_workers_1_and_16_write_identical_bytes(self):
        urls = [row["image_url"] for row in self._rows()]
        release = [urls[index] for index in (3, 6, 1, 4, 0, 7, 2, 5)]
        payloads = {url: _jpeg_bytes(index + 1) for index, url in enumerate(urls)}
        gate = _Gate(release)
        sequential: list[str] = []

        def collect(species, max_per_class, max_per_occurrence, max_pages):
            return self._rows()

        def urlopen_parallel(request, timeout=40):
            gate.arrive(request.full_url)
            return _Response(payloads[request.full_url])

        def urlopen_sequential(request, timeout=40):
            sequential.append(request.full_url)
            return _Response(payloads[request.full_url])

        import tempfile

        with tempfile.TemporaryDirectory() as slow_dir, tempfile.TemporaryDirectory() as fast_dir:
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif.urllib.request.urlopen", side_effect=urlopen_sequential
            ):
                fetch_gbif.run_fetch(self._manifest(), max_per_class=8, max_pages=1, download_workers=1, data_dir=Path(slow_dir))
            fetch_gbif.MAX_DOWNLOADS_PER_HOST = 32
            fetch_gbif._HOST_SEMAPHORES.clear()
            try:
                with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                    "fetch_gbif.urllib.request.urlopen", side_effect=urlopen_parallel
                ):
                    fetch_gbif.run_fetch(
                        self._manifest(),
                        max_per_class=8,
                        max_pages=1,
                        download_workers=16,
                        data_dir=Path(fast_dir),
                    )
            finally:
                fetch_gbif.MAX_DOWNLOADS_PER_HOST = 4
                fetch_gbif._HOST_SEMAPHORES.clear()

            self.assertEqual(sequential, urls)
            self.assertEqual(gate.finished, release)
            self.assertNotEqual(gate.finished, urls)
            slow = Path(slow_dir)
            fast = Path(fast_dir)
            attributions = (slow / "attributions.jsonl").read_bytes()
            report = (slow / "fetch_report.json").read_bytes()
            self.assertEqual(attributions, (fast / "attributions.jsonl").read_bytes())
            self.assertEqual(report, (fast / "fetch_report.json").read_bytes())
            self.assertTrue(attributions.endswith(b"\n"))
            self.assertFalse(attributions.endswith(b"\n\n"))
            self.assertTrue(report.endswith(b"\n"))
            parsed = json.loads(report.decode("utf-8"))
            self.assertEqual(
                list(parsed.keys()),
                ["classes", "thin_classes", "toxic_probes", "taxa", "max_per_occurrence", "note"],
            )
            lines = attributions.decode("utf-8").splitlines()
            self.assertEqual(len(lines), 8)
            keys = list(json.loads(lines[0]).keys())
            self.assertEqual(keys[-4:], ["file", "source", "downloaded", "bytes"])
            for line, row in zip(lines, self._rows()):
                item = json.loads(line)
                self.assertEqual(item["image_url"], row["image_url"])
                self.assertNotIn("worker", item)
                self.assertNotIn("downloaded_at", item)
                self.assertTrue(item["downloaded"])
                self.assertEqual(item["bytes"], len(payloads[row["image_url"]]))
            self.assertNotIn("generated_at", parsed)

    def test_failed_middle_row_keeps_success_order_with_several_workers(self):
        rows = self._rows()[:3]
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            if request.full_url.endswith("/1.jpg"):
                raise _http_error(404, "Not Found", url=request.full_url)
            return _Response(self.jpeg)

        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            stderr = io.StringIO()
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"), patch(
                "sys.stderr", stderr
            ):
                kept = fetch_gbif._store_media(
                    rows,
                    folder="boletus_edulis",
                    directory=Path(directory),
                    dry_run=False,
                    resume=True,
                    workers=8,
                )
        self.assertEqual([row["image_url"] for row in kept], [rows[0]["image_url"], rows[2]["image_url"]])
        self.assertEqual(stderr.getvalue().count("skip "), 1)
        self.assertEqual(calls["n"], 3)


class CheckpointRecoveryTest(FetchCase):
    def _manifest(self):
        return {
            "classes": [
                {
                    "id": "boletus_edulis",
                    "gbif_names": ["Boletus edulis"],
                    "safety_tag": "edible",
                },
                {
                    "id": "amanita_virosa",
                    "gbif_names": ["Amanita virosa"],
                    "safety_tag": "toxic",
                },
                {
                    "id": "unknown_mushroom",
                    "gbif_names": ["Amanita verna"],
                    "safety_tag": "other",
                    "sampling": {
                        "per_taxon_cap": 80,
                        "class_cap": 2500,
                        "taxa": [
                            {
                                "name": "Amanita verna",
                                "toxic": True,
                                "held_out": True,
                                "relation": "",
                                "gbif_key": 1,
                            }
                        ],
                    },
                },
            ],
            "toxic_probes": {
                "per_taxon_cap": 80,
                "class_id": "unknown_mushroom",
                "taxa": [{"name": "Lepiota cristata", "relation": "lookalike", "gbif_key": 2535471}],
            },
        }

    def _class_rows(self, species):
        base = {"boletus_edulis": 1000, "amanita_virosa": 2000, "unknown_mushroom": 3000}[species["id"]]
        taxon = species["gbif_names"][0]
        rows = []
        for index in range(2):
            rows.append(
                {
                    "occurrence_key": base + index,
                    "media_index": 0,
                    "image_url": f"https://images.example.test/{species['id']}/{index}.jpg",
                    "creator": "Ada Łąka",
                    "license": "http://creativecommons.org/licenses/by/4.0/",
                    "license_normalized": "cc-by-4.0",
                    "class_id": species["id"],
                    "taxon_name": taxon,
                    "queried_name": taxon,
                    "region_scope": "central_europe" if index == 0 else "global_fill",
                    "held_out_taxon": bool(species.get("sampling")),
                    "toxic": species.get("safety_tag") == "toxic" or bool(species.get("sampling")),
                    "genus_relation": "",
                    "decimal_latitude": None,
                }
            )
        return rows

    def _probe_rows(self, names, cap, max_per_occurrence, max_pages, seen):
        return [
            {
                "occurrence_key": 9001,
                "media_index": 0,
                "image_url": "https://cdn.example.test/probe/lepiota.jpg",
                "creator": "Ada Łąka",
                "license": "https://creativecommons.org/publicdomain/zero/1.0/",
                "license_normalized": "cc0-1.0",
                "queried_name": names[0],
                "region_scope": "global_fill",
                "decimal_latitude": None,
            }
        ]

    def test_checkpoint_resume_matches_uninterrupted_bytes(self):
        import tempfile

        collected: list[str] = []
        downloads: list[str] = []

        def collect(species, max_per_class, max_per_occurrence, max_pages):
            collected.append(species["id"])
            return self._class_rows(species)

        def urlopen(request, timeout=40):
            downloads.append(request.full_url)
            return _Response(self.jpeg)

        with tempfile.TemporaryDirectory() as fresh_dir, tempfile.TemporaryDirectory() as resume_dir:
            fresh = Path(fresh_dir)
            resumed = Path(resume_dir)
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif._pull_names", side_effect=self._probe_rows
            ), patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif.run_fetch(
                    self._manifest(),
                    max_per_class=2,
                    max_pages=1,
                    download_workers=1,
                    data_dir=fresh,
                )
            fresh_attributions = (fresh / "attributions.jsonl").read_bytes()
            fresh_report = (fresh / "fetch_report.json").read_bytes()
            fresh_downloads = list(downloads)

            collected.clear()
            downloads.clear()
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif._pull_names", side_effect=self._probe_rows
            ), patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif.run_fetch(
                    self._manifest(),
                    max_per_class=2,
                    max_pages=1,
                    only="boletus_edulis",
                    download_workers=4,
                    data_dir=resumed,
                )
            partial_lines = (resumed / "attributions.jsonl").read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(partial_lines), 2)
            self.assertTrue(all("boletus_edulis" in line for line in partial_lines))
            self.assertFalse((resumed / "checkpoints" / "boletus_edulis.jsonl").exists())
            partial_report = json.loads((resumed / "fetch_report.json").read_text(encoding="utf-8"))
            self.assertEqual(list(partial_report["classes"]), ["boletus_edulis"])
            self.assertEqual(partial_report["toxic_probes"], [])
            self.assertEqual(collected, ["boletus_edulis"])

            collected.clear()
            downloads.clear()
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif._pull_names", side_effect=self._probe_rows
            ), patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif.run_fetch(
                    self._manifest(),
                    max_per_class=2,
                    max_pages=1,
                    download_workers=16,
                    resume=True,
                    data_dir=resumed,
                )
            self.assertEqual((resumed / "attributions.jsonl").read_bytes(), fresh_attributions)
            self.assertEqual((resumed / "fetch_report.json").read_bytes(), fresh_report)
            self.assertNotIn("boletus_edulis", " ".join(downloads))
            self.assertEqual(collected, ["amanita_virosa", "unknown_mushroom"])
            self.assertFalse((resumed / "checkpoints" / "probe-Lepiota_cristata.jsonl").exists())
            self.assertTrue(fresh_attributions.splitlines()[0].startswith(partial_lines[0].encode("utf-8")))
            # A second resume does not page GBIF or download the photos again.
            collected.clear()
            downloads.clear()
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif._pull_names", side_effect=self._probe_rows
            ), patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif.run_fetch(
                    self._manifest(),
                    max_per_class=2,
                    max_pages=1,
                    download_workers=16,
                    resume=True,
                    data_dir=resumed,
                )
            self.assertEqual(collected, [])
            self.assertEqual(downloads, [])
            self.assertEqual((resumed / "attributions.jsonl").read_bytes(), fresh_attributions)
            self.assertEqual(len(fresh_downloads), 2 + 2 + 2 + 1)


class PolitenessTest(FetchCase):
    def test_api_calls_do_not_overlap(self):
        inflight = {"n": 0, "peak": 0}
        lock = threading.Lock()

        def urlopen(request, timeout=60):
            with lock:
                inflight["n"] += 1
                inflight["peak"] = max(inflight["peak"], inflight["n"])
            time.sleep(0.03)
            with lock:
                inflight["n"] -= 1
            return _Response(b"{}", content_type="application/json")

        def run():
            fetch_gbif._get_json("https://api.gbif.org/v1/occurrence/search?limit=1")

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen), patch("fetch_gbif.time.sleep"):
            threads = [threading.Thread(target=run) for _ in range(6)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
        self.assertEqual(inflight["peak"], 1)

    def test_api_minimum_interval_and_429_retry_after(self):
        clock = {"now": 50.0}
        sleeps: list[float] = []

        def fake_sleep(seconds):
            sleeps.append(seconds)
            clock["now"] += seconds

        def fake_monotonic():
            return clock["now"]

        def ok(request, timeout=60):
            return _Response(b'{"ok": true}', content_type="application/json")

        fetch_gbif._last_gbif_api_at = None
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=ok), patch(
            "fetch_gbif.time.sleep", side_effect=fake_sleep
        ), patch("fetch_gbif.time.monotonic", side_effect=fake_monotonic):
            fetch_gbif._get_json("https://api.gbif.org/v1/species/match?name=A")
            fetch_gbif._get_json("https://api.gbif.org/v1/species/match?name=B")
        self.assertEqual(sleeps, [fetch_gbif.GBIF_API_MIN_INTERVAL])

        calls = {"n": 0}

        def limited(request, timeout=60):
            calls["n"] += 1
            if calls["n"] == 1:
                raise _http_error(429, "Too Many Requests", {"Retry-After": "4"}, url=request.full_url)
            return _Response(b'{"ok": true}', content_type="application/json")

        sleeps.clear()
        fetch_gbif._last_gbif_api_at = None
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=limited), patch(
            "fetch_gbif.time.sleep", side_effect=fake_sleep
        ), patch("fetch_gbif.time.monotonic", side_effect=fake_monotonic):
            payload = fetch_gbif._get_json("https://api.gbif.org/v1/species/match?name=C")
        self.assertEqual(payload, {"ok": True})
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [4.0])

        calls["n"] = 0
        sleeps.clear()

        def missing_header(request, timeout=60):
            calls["n"] += 1
            if calls["n"] == 1:
                raise _http_error(429, "Too Many Requests", url=request.full_url)
            return _Response(b'{"ok": true}', content_type="application/json")

        fetch_gbif._last_gbif_api_at = None
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=missing_header), patch(
            "fetch_gbif.time.sleep", side_effect=fake_sleep
        ), patch("fetch_gbif.time.monotonic", side_effect=fake_monotonic):
            fetch_gbif._get_json("https://api.gbif.org/v1/species/match?name=D")
        self.assertEqual(sleeps, [1.0])

    def test_image_concurrency_is_capped_per_host(self):
        entered = {"n": 0, "peak": 0}
        per_host: dict[str, int] = {}
        peaks: dict[str, int] = {}
        lock = threading.Lock()
        release = threading.Event()

        def urlopen(request, timeout=40):
            host = urllib.parse.urlsplit(request.full_url).netloc
            with lock:
                entered["n"] += 1
                entered["peak"] = max(entered["peak"], entered["n"])
                per_host[host] = per_host.get(host, 0) + 1
                peaks[host] = max(peaks.get(host, 0), per_host[host])
            release.wait(5)
            with lock:
                entered["n"] -= 1
                per_host[host] -= 1
            return _Response(self.jpeg)

        def watch(target: int):
            deadline = time.time() + 3
            while time.time() < deadline:
                with lock:
                    if entered["peak"] >= target:
                        break
                time.sleep(0.01)
            time.sleep(0.1)
            release.set()

        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            self._root = Path(directory)
            one_host = [f"https://one.example.test/{index}.jpg" for index in range(8)]
            # _download_rows expects file paths already attached.
            rows = []
            for index, url in enumerate(one_host):
                row = {"occurrence_key": index, "media_index": 0, "image_url": url}
                fetch_gbif._attach_file(row, "one")
                rows.append(row)
            watcher = threading.Thread(target=watch, args=(4,))
            watcher.start()
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif._download_rows(rows, directory=self._root, resume=False, workers=16)
            watcher.join()
            self.assertEqual(entered["peak"], 4)
            self.assertEqual(peaks["one.example.test"], 4)

        entered["n"] = 0
        entered["peak"] = 0
        per_host.clear()
        peaks.clear()
        release.clear()
        fetch_gbif._HOST_SEMAPHORES.clear()
        with tempfile.TemporaryDirectory() as directory:
            self._root = Path(directory)
            urls = [f"https://one.example.test/{index}.jpg" for index in range(4)]
            urls += [f"https://two.example.test/{index}.jpg" for index in range(4)]
            rows = []
            for index, url in enumerate(urls):
                row = {"occurrence_key": index, "media_index": 0, "image_url": url}
                fetch_gbif._attach_file(row, "mixed")
                rows.append(row)
            watcher = threading.Thread(target=watch, args=(8,))
            watcher.start()
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
                fetch_gbif._download_rows(rows, directory=self._root, resume=False, workers=16)
            watcher.join()
            self.assertEqual(entered["peak"], 8)
            self.assertEqual(peaks["one.example.test"], 4)
            self.assertEqual(peaks["two.example.test"], 4)


class CliFlagTest(FetchCase):
    def test_defaults_and_no_resume_flag(self):
        parser = fetch_gbif.build_parser()
        args = parser.parse_args([])
        self.assertEqual(args.download_workers, 16)
        self.assertFalse(args.no_resume)
        with patch("fetch_gbif.run_fetch") as run_fetch, patch("fetch_gbif.load_manifest", return_value={"classes": []}):
            fetch_gbif.main(["--no-resume", "--download-workers", "8", "--only", "boletus_edulis"])
        self.assertFalse(run_fetch.call_args.kwargs["resume"])
        self.assertEqual(run_fetch.call_args.kwargs["download_workers"], 8)
        self.assertEqual(run_fetch.call_args.kwargs["only"], "boletus_edulis")
        with patch("sys.stderr", io.StringIO()), self.assertRaises(SystemExit):
            fetch_gbif.main(["--download-workers", "0"])


class ImageIntegrityTest(FetchCase):
    def setUp(self):
        super().setUp()
        import tempfile

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self._root = Path(self._tmp.name)
        self._url = "https://images.example.test/boletus/9.jpg"

    def _truncated(self) -> bytes:
        payload = self.jpeg[:-32]
        self.assertGreater(len(payload), 32)
        path = self._root / "_probe.jpg"
        path.write_bytes(payload)
        from PIL import Image

        with Image.open(path) as image:
            image.verify()
        path.unlink()
        return payload

    def test_truncated_jpeg_is_quarantined_on_resume_and_by_verify_existing(self):
        truncated = self._truncated()
        destination = self._root / "images" / "boletus_edulis" / "9_0.jpg"
        destination.parent.mkdir(parents=True)
        destination.write_bytes(truncated)
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            return _Response(self.jpeg)

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            size = fetch_gbif.download_image(self._url, destination, resume=True, data_dir=self._root)
        self.assertEqual(calls["n"], 1)
        self.assertEqual(size, len(self.jpeg))
        self.assertEqual(destination.read_bytes(), self.jpeg)
        quarantined = self._root / "quarantine" / "boletus_edulis" / "9_0.jpg"
        self.assertEqual(quarantined.read_bytes(), truncated)
        self.assertFalse(fetch_gbif._full_load_ok(str(quarantined)))

        other = self._root / "images" / "amanita_virosa" / "1_0.jpg"
        other.parent.mkdir(parents=True)
        other.write_bytes(self.jpeg)
        broken = self._root / "images" / "amanita_virosa" / "2_0.jpg"
        broken.write_bytes(truncated)
        partial = self._root / "images" / "amanita_virosa" / "3_0.jpg.partial"
        partial.write_bytes(truncated)
        stdout = io.StringIO()
        with patch("fetch_gbif.urllib.request.urlopen", side_effect=AssertionError("network")), patch("sys.stdout", stdout):
            counts = fetch_gbif.verify_existing_images(self._root, workers=2)
        self.assertEqual(counts["boletus_edulis"]["ok"], 1)
        self.assertEqual(counts["amanita_virosa"]["ok"], 1)
        self.assertEqual(counts["amanita_virosa"]["quarantined"], 1)
        self.assertEqual(other.read_bytes(), self.jpeg)
        self.assertFalse(broken.exists())
        moved = self._root / "quarantine" / "amanita_virosa" / "2_0.jpg"
        self.assertEqual(moved.read_bytes(), truncated)
        self.assertTrue(partial.is_file())
        sidecar = (self._root / "checkpoints" / "verified.jsonl").read_text(encoding="utf-8")
        self.assertIn("images/boletus_edulis/9_0.jpg", sidecar)
        self.assertIn("images/amanita_virosa/1_0.jpg", sidecar)
        self.assertNotIn("2_0.jpg", sidecar)
        self.assertIn("amanita_virosa: ok 1, quarantined 1", stdout.getvalue())
        self.assertIn("boletus_edulis: ok 1, quarantined 0", stdout.getvalue())

    def test_sidecar_skips_decode_until_size_or_mtime_changes(self):
        destination = self._root / "images" / "boletus_edulis" / "4_0.jpg"
        destination.parent.mkdir(parents=True)
        destination.write_bytes(self.jpeg)
        fetch_gbif._verified_index(self._root).remember(destination)
        from PIL import Image

        real_open = Image.open

        def fail_open(*args, **kwargs):
            raise AssertionError("image opened")

        with patch("PIL.Image.open", side_effect=fail_open), patch(
            "fetch_gbif.urllib.request.urlopen", side_effect=AssertionError("network")
        ):
            size = fetch_gbif.download_image(self._url, destination, resume=True, data_dir=self._root)
        self.assertEqual(size, destination.stat().st_size)

        stat = destination.stat()
        os.utime(destination, ns=(stat.st_atime_ns, stat.st_mtime_ns + 2_000_000_000))
        opened = {"n": 0}

        def spy_open(*args, **kwargs):
            opened["n"] += 1
            return real_open(*args, **kwargs)

        with patch("PIL.Image.open", side_effect=spy_open), patch(
            "fetch_gbif.urllib.request.urlopen", side_effect=AssertionError("network")
        ):
            fetch_gbif.download_image(self._url, destination, resume=True, data_dir=self._root)
        self.assertGreaterEqual(opened["n"], 1)
        self.assertEqual(destination.read_bytes(), self.jpeg)

        truncated = self._truncated()
        destination.write_bytes(truncated)
        calls = {"n": 0}

        def urlopen(request, timeout=40):
            calls["n"] += 1
            return _Response(self.jpeg)

        with patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen):
            fetch_gbif.download_image(self._url, destination, resume=True, data_dir=self._root)
        self.assertEqual(calls["n"], 1)
        self.assertEqual(destination.read_bytes(), self.jpeg)
        self.assertTrue((self._root / "quarantine" / "boletus_edulis" / "4_0.jpg").is_file())

    def test_verify_existing_cli_does_not_fetch(self):
        destination = self._root / "images" / "boletus_edulis" / "1_0.jpg"
        destination.parent.mkdir(parents=True)
        destination.write_bytes(self.jpeg)
        with patch.object(fetch_gbif, "DATA_DIR", self._root), patch(
            "fetch_gbif.collect_class_media", side_effect=AssertionError("fetched")
        ), patch("sys.stdout", io.StringIO()):
            fetch_gbif.main(["--verify-existing"])
        self.assertTrue(destination.is_file())
        self.assertIn("images/boletus_edulis/1_0.jpg", (self._root / "checkpoints" / "verified.jsonl").read_text(encoding="utf-8"))

    def test_truncated_image_flag_stays_false(self):
        from PIL import ImageFile

        ImageFile.LOAD_TRUNCATED_IMAGES = True
        fetch_gbif._ensure_truncated_images_rejected()
        self.assertIs(ImageFile.LOAD_TRUNCATED_IMAGES, False)
        destination = self._root / "images" / "boletus_edulis" / "cut.jpg"
        destination.parent.mkdir(parents=True)
        destination.write_bytes(self._truncated())
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        self.assertFalse(fetch_gbif._full_load_ok(str(destination)))
        self.assertIs(ImageFile.LOAD_TRUNCATED_IMAGES, False)
        training = Path(fetch_gbif.__file__).resolve().parent
        for path in training.rglob("*.py"):
            if "tests" in path.parts:
                continue
            text = path.read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"LOAD_TRUNCATED_IMAGES\s*=\s*True", text), path)

    def test_bad_payloads_do_not_land_in_images_sidecar_or_reports(self):
        truncated = self._truncated()
        garbage = b"not-a-jpeg" * 800
        self.assertGreaterEqual(len(garbage), 5_000)
        self.assertGreater(len(self.jpeg), 8_000)
        cases = [
            ("truncated", truncated, "image/jpeg", None, 2),
            ("garbage", garbage, "image/gif", None, 1),
            ("oversize", self.jpeg, "image/jpeg", 8_000, 1),
        ]
        for name, payload, content_type, limit, expected_calls in cases:
            with self.subTest(name=name):
                root = self._root / name
                calls = {"n": 0}

                def urlopen(request, timeout=40, payload=payload, content_type=content_type):
                    calls["n"] += 1
                    return _Response(payload, content_type=content_type)

                def collect(species, max_per_class, max_per_occurrence, max_pages):
                    return [
                        {
                            "occurrence_key": 42,
                            "media_index": 0,
                            "image_url": f"https://images.example.test/rejected/{name}.jpg",
                            "license": "https://creativecommons.org/licenses/by/4.0/",
                            "license_normalized": "cc-by-4.0",
                            "class_id": "boletus_edulis",
                            "taxon_name": "Boletus edulis",
                            "queried_name": "Boletus edulis",
                            "region_scope": "central_europe",
                            "held_out_taxon": False,
                            "toxic": False,
                            "genus_relation": "",
                        }
                    ]

                manifest = {
                    "classes": [
                        {
                            "id": "boletus_edulis",
                            "gbif_names": ["Boletus edulis"],
                            "safety_tag": "edible",
                        }
                    ]
                }
                patches = [
                    patch("fetch_gbif.collect_class_media", side_effect=collect),
                    patch("fetch_gbif.urllib.request.urlopen", side_effect=urlopen),
                    patch("fetch_gbif.time.sleep"),
                    patch("fetch_gbif.random.uniform", return_value=0.0),
                ]
                if limit is not None:
                    patches.append(patch.object(fetch_gbif, "MAX_IMAGE_BYTES", limit))
                with patches[0], patches[1], patches[2], patches[3]:
                    if limit is None:
                        fetch_gbif.run_fetch(
                            manifest,
                            max_per_class=1,
                            max_pages=1,
                            only="boletus_edulis",
                            download_workers=2,
                            data_dir=root,
                        )
                    else:
                        with patches[4]:
                            fetch_gbif.run_fetch(
                                manifest,
                                max_per_class=1,
                                max_pages=1,
                                only="boletus_edulis",
                                download_workers=2,
                                data_dir=root,
                            )
                self.assertEqual(calls["n"], expected_calls)
                stored = [path for path in root.rglob("*") if path.is_file() and "images" in path.parts]
                self.assertEqual(stored, [])
                sidecar = root / "checkpoints" / "verified.jsonl"
                self.assertFalse(sidecar.exists())
                marker = f"rejected/{name}.jpg"
                attributions = (root / "attributions.jsonl").read_text(encoding="utf-8")
                report = (root / "fetch_report.json").read_text(encoding="utf-8")
                self.assertNotIn(marker, attributions)
                self.assertNotIn(marker, report)
                self.assertNotIn("42_0.jpg", attributions)
                self.assertNotIn("42_0.jpg", report)
                parsed = json.loads(report)
                self.assertEqual(parsed["classes"]["boletus_edulis"]["accepted"], 0)

    def test_cached_disallowed_license_does_not_reach_attributions(self):
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
        with patch.object(fetch_gbif, "_policy_hash", return_value="other-policy"):
            self.assertNotEqual(key, fetch_gbif._query_cache_key("class", "boletus_edulis", parameters))
        bad = {
            "occurrence_key": 1,
            "media_index": 0,
            "image_url": "https://images.example.test/nc.jpg",
            "license": "http://creativecommons.org/licenses/by-nc/4.0/",
            "license_normalized": "cc-by-nc-4.0",
            "class_id": "boletus_edulis",
            "taxon_name": "Boletus edulis",
            "queried_name": "Boletus edulis",
            "region_scope": "central_europe",
            "held_out_taxon": False,
            "toxic": False,
            "genus_relation": "",
        }
        good = dict(bad)
        good.update(
            {
                "occurrence_key": 2,
                "image_url": "https://images.example.test/ok.jpg",
                "license": "http://creativecommons.org/licenses/by/4.0/",
                "license_normalized": "cc-by-4.0",
            }
        )
        cache = fetch_gbif._cache_file(self._root, "class", "boletus_edulis", key)
        cache.parent.mkdir(parents=True)
        cache.write_text(json.dumps({"key": key, "rows": [bad, good]}), encoding="utf-8")
        stale = cache.with_name("class-boletus_edulis-v1-old-cache.json")
        stale.write_text("{}", encoding="utf-8")

        def collect(*args, **kwargs):
            raise AssertionError("GBIF was queried")

        def urlopen(request, timeout=40):
            self.assertNotIn("nc.jpg", request.full_url)
            return _Response(self.jpeg)

        with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
            "fetch_gbif.urllib.request.urlopen", side_effect=urlopen
        ), patch("fetch_gbif.time.sleep"):
            fetch_gbif.run_fetch(
                {"classes": [species]},
                max_per_class=2,
                max_pages=1,
                only="boletus_edulis",
                download_workers=2,
                data_dir=self._root,
            )
        attributions = (self._root / "attributions.jsonl").read_text(encoding="utf-8")
        self.assertEqual(len(attributions.splitlines()), 1)
        self.assertNotIn("nc.jpg", attributions)
        self.assertNotIn("by-nc", attributions)
        self.assertIn("ok.jpg", attributions)
        report = json.loads((self._root / "fetch_report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["classes"]["boletus_edulis"]["accepted"], 1)
        self.assertFalse((self._root / "images" / "boletus_edulis" / "1_0.jpg").exists())
        self.assertTrue((self._root / "images" / "boletus_edulis" / "2_0.jpg").is_file())
        self.assertFalse(stale.exists())

    def test_verify_existing_drops_quarantined_attribution_rows(self):
        good_a = self._root / "images" / "boletus_edulis" / "1_0.jpg"
        bad = self._root / "images" / "boletus_edulis" / "2_0.jpg"
        good_b = self._root / "images" / "amanita_virosa" / "3_0.jpg"
        for path, payload in ((good_a, self.jpeg), (bad, self._truncated()), (good_b, self.jpeg)):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        rows = [
            {"file": "images/boletus_edulis/1_0.jpg", "image_url": "https://images.example.test/a.jpg", "downloaded": True},
            {"file": "images/boletus_edulis/2_0.jpg", "image_url": "https://images.example.test/b.jpg", "downloaded": True},
            {"file": "images/amanita_virosa/3_0.jpg", "image_url": "https://images.example.test/c.jpg", "downloaded": True},
        ]
        original = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
        (self._root / "attributions.jsonl").write_text(original, encoding="utf-8")
        stdout = io.StringIO()
        with patch("sys.stdout", stdout):
            fetch_gbif.verify_existing_images(self._root, workers=2)
        kept = (self._root / "attributions.jsonl").read_text(encoding="utf-8")
        self.assertEqual(
            kept,
            json.dumps(rows[0], ensure_ascii=False) + "\n" + json.dumps(rows[2], ensure_ascii=False) + "\n",
        )
        self.assertNotIn("2_0.jpg", kept)
        self.assertIn("dropped 1 attribution rows", stdout.getvalue())
        self.assertFalse(bad.exists())
        self.assertTrue((self._root / "quarantine" / "boletus_edulis" / "2_0.jpg").is_file())
        again = io.StringIO()
        with patch("sys.stdout", again):
            fetch_gbif.verify_existing_images(self._root, workers=1)
        self.assertEqual((self._root / "attributions.jsonl").read_text(encoding="utf-8"), kept)
        self.assertIn("dropped 0 attribution rows", again.getvalue())

    def test_verify_existing_falls_back_to_threads_when_the_process_pool_cannot_start(self):
        for name in ("1_0.jpg", "2_0.jpg"):
            path = self._root / "images" / "boletus_edulis" / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(self.jpeg)
        from concurrent.futures.process import BrokenProcessPool

        cases = (
            ("permission", PermissionError("spawn blocked")),
            ("os", OSError("spawn blocked")),
            ("not implemented", NotImplementedError("spawn")),
            ("broken pool", BrokenProcessPool("worker exited")),
        )
        for label, failure in cases:
            with self.subTest(label=label):
                stderr = io.StringIO()
                with patch("fetch_gbif.ProcessPoolExecutor", side_effect=failure), patch("sys.stderr", stderr):
                    counts = fetch_gbif.verify_existing_images(self._root, workers=2)
                self.assertIn("process pool unavailable", stderr.getvalue())
                self.assertIn("threads", stderr.getvalue())
                self.assertEqual(counts["boletus_edulis"]["ok"], 2)
                self.assertEqual(counts["boletus_edulis"]["quarantined"], 0)


def _candidate(class_id: str, index: int, occurrence_key: int, taxon: str) -> dict:
    return {
        "occurrence_key": occurrence_key,
        "media_index": 0,
        "image_url": f"https://cdn.example.test/{class_id}/{occurrence_key}_{index}.jpg",
        "creator": "Ada Łąka",
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "license_normalized": "cc-by-4.0",
        "class_id": class_id,
        "taxon_name": taxon,
        "queried_name": taxon,
        "region_scope": "central_europe",
        "held_out_taxon": False,
        "toxic": False,
        "genus_relation": "",
    }


class AcceptedCountAndReplacementTest(FetchCase):
    """accepted matches files and attribution rows, including after replacements."""

    def _manifest(self):
        return {
            "classes": [
                {"id": "boletus_edulis", "gbif_names": ["Boletus edulis"], "safety_tag": "edible"},
                {"id": "cantharellus_cibarius", "gbif_names": ["Cantharellus cibarius"], "safety_tag": "edible"},
                {"id": "macrolepiota_procera", "gbif_names": ["Macrolepiota procera"], "safety_tag": "edible"},
            ],
            "toxic_probes": {
                "per_taxon_cap": 80,
                "class_id": "unknown_mushroom",
                "taxa": [
                    {"name": "Lepiota cristata", "relation": "lookalike", "gbif_key": 2535471},
                    {"name": "Omphalotus olearius", "relation": "lookalike", "gbif_key": 2538088},
                ],
            },
        }

    def _pools(self):
        key = 8000
        pools = {
            "boletus_edulis": [],
            "cantharellus_cibarius": [],
            "macrolepiota_procera": [],
        }
        probes = {"Lepiota cristata": [], "Omphalotus olearius": []}
        plan = {
            "boletus_edulis": (8, "Boletus edulis"),
            "cantharellus_cibarius": (4, "Cantharellus cibarius"),
            "macrolepiota_procera": (3, "Macrolepiota procera"),
        }
        for class_id, (count, taxon) in plan.items():
            for index in range(count):
                pools[class_id].append(_candidate(class_id, index, key, taxon))
                key += 1
        for name, count in (("Lepiota cristata", 6), ("Omphalotus olearius", 2)):
            for index in range(count):
                row = _candidate("unknown_mushroom", index, key, name)
                row["held_out_taxon"] = True
                row["toxic"] = True
                probes[name].append(row)
                key += 1
        failures = {}
        for index, kind in ((1, "timeout"), (3, "403"), (4, "too_large"), (6, "garbage")):
            failures[pools["boletus_edulis"][index]["image_url"]] = kind
        failures[pools["macrolepiota_procera"][1]["image_url"]] = "timeout"
        failures[pools["macrolepiota_procera"][2]["image_url"]] = "403"
        failures[probes["Lepiota cristata"][1]["image_url"]] = "403"
        failures[probes["Omphalotus olearius"][1]["image_url"]] = "timeout"
        return pools, probes, failures

    def _urlopen(self, failures: dict[str, str], payloads: dict[str, bytes], calls: list[str]):
        def urlopen(request, timeout=40):
            url = request.full_url
            calls.append(url)
            kind = failures.get(url)
            if kind == "timeout":
                raise urllib.error.URLError(TimeoutError("timed out"))
            if kind == "403":
                raise _http_error(403, "Forbidden", url=url)
            if kind == "too_large":
                return _Response(b"x" * (fetch_gbif.MAX_IMAGE_BYTES + 1))
            if kind == "garbage":
                return _Response(b"not-a-jpeg" * 800, content_type="image/jpeg")
            return _Response(payloads[url])

        return urlopen

    def _payloads(self, pools: dict, probes: dict) -> dict[str, bytes]:
        payloads = {}
        index = 1
        for rows in list(pools.values()) + list(probes.values()):
            for row in rows:
                payloads[row["image_url"]] = _jpeg_bytes(index)
                index += 1
        return payloads

    def _run(self, directory: Path, *, workers: int, pools, probes, failures, payloads, calls: list[str]):
        def collect(species, max_per_class, max_per_occurrence, max_pages):
            return [dict(row) for row in pools[species["id"]]]

        def pull(names, limit, max_per_occurrence, max_pages, seen):
            return [dict(row) for row in probes[names[0]]]

        with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
            "fetch_gbif._pull_names", side_effect=pull
        ), patch(
            "fetch_gbif.urllib.request.urlopen",
            side_effect=self._urlopen(failures, payloads, calls),
        ), patch("fetch_gbif.time.sleep"), patch("fetch_gbif.random.uniform", return_value=0.0):
            fetch_gbif.run_fetch(
                self._manifest(),
                max_per_class=4,
                max_pages=1,
                download_workers=workers,
                data_dir=directory,
            )

    def _rows(self, root: Path) -> list[dict]:
        text = (root / "attributions.jsonl").read_text(encoding="utf-8")
        return [json.loads(line) for line in text.splitlines() if line.strip()]

    def _files(self, root: Path, class_id: str) -> list[Path]:
        folder = root / "images" / class_id
        if not folder.is_dir():
            return []
        return [
            path
            for path in folder.rglob("*")
            if path.is_file() and not path.name.endswith((".partial", ".tmp"))
        ]

    def test_accepted_never_exceeds_attribution_rows_and_matches_files(self):
        pools, probes, failures = self._pools()
        payloads = self._payloads(pools, probes)
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._run(root, workers=4, pools=pools, probes=probes, failures=failures, payloads=payloads, calls=[])
            report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
            rows = self._rows(root)
            self.assertFalse(list(root.rglob("*.partial")))

            def class_rows(class_id: str) -> list[dict]:
                return [row for row in rows if row.get("class_id") == class_id and not row.get("probe")]

            def probe_rows(taxon: str) -> list[dict]:
                return [row for row in rows if row.get("probe") is True and row.get("taxon_name") == taxon]

            for class_id, block in report["classes"].items():
                matched = class_rows(class_id)
                self.assertLessEqual(block["accepted"], len(matched), class_id)
                self.assertEqual(block["accepted"], len(matched), class_id)
                self.assertEqual(block["accepted"], len(self._files(root, class_id)), class_id)
                for row in matched:
                    self.assertTrue((root / row["file"]).is_file())
                    self.assertEqual((root / row["file"]).read_bytes(), payloads[row["image_url"]])
                self.assertEqual(block["selected"], block["accepted"] + sum(block["failed"].values()))
                self.assertEqual(block["regional"] + block["global_fill"], block["accepted"])

            for probe in report["toxic_probes"]:
                matched = probe_rows(probe["taxon"])
                self.assertLessEqual(probe["accepted"], len(matched), probe["taxon"])
                self.assertEqual(probe["accepted"], len(matched), probe["taxon"])
                self.assertEqual(probe["selected"], probe["accepted"] + sum(probe["failed"].values()))
                for row in matched:
                    self.assertTrue((root / row["file"]).is_file())

            normal = report["classes"]["cantharellus_cibarius"]
            self.assertEqual(normal["accepted"], 4)
            self.assertEqual(normal["failed"], {})
            self.assertEqual(normal["shortfall"], 0)
            self.assertFalse(normal["any_taxon_pool_exhausted"])
            self.assertEqual(len(class_rows("cantharellus_cibarius")), normal["accepted"])

            mixed = report["classes"]["boletus_edulis"]
            self.assertEqual(mixed["accepted"], 4)
            self.assertEqual(mixed["pool"], 8)
            self.assertEqual(mixed["selected"], 8)
            self.assertEqual(
                mixed["failed"],
                {"http_403": 1, "timeout": 1, "too_large": 1, "undecodable": 1},
            )
            self.assertEqual(mixed["shortfall"], 0)
            self.assertFalse(mixed["any_taxon_pool_exhausted"])

            short = report["classes"]["macrolepiota_procera"]
            self.assertEqual(short["accepted"], 1)
            self.assertEqual(short["selected"], 3)
            self.assertEqual(short["failed"], {"http_403": 1, "timeout": 1})
            self.assertEqual(short["shortfall"], 3)
            self.assertTrue(short["any_taxon_pool_exhausted"])
            self.assertEqual(short["exhausted_reason"], "end_of_records")
            self.assertEqual(short["pool"], 3)

            filled = next(item for item in report["toxic_probes"] if item["taxon"] == "Lepiota cristata")
            self.assertEqual(filled["accepted"], 4)
            self.assertEqual(filled["failed"], {"http_403": 1})
            self.assertEqual(filled["shortfall"], 0)
            self.assertNotIn("gbif_licensed_count", filled)
            exhausted = next(item for item in report["toxic_probes"] if item["taxon"] == "Omphalotus olearius")
            self.assertEqual(exhausted["accepted"], 1)
            self.assertEqual(exhausted["failed"], {"timeout": 1})
            self.assertEqual(exhausted["gbif_licensed_count"], 2)
            self.assertEqual(exhausted["shortfall"], 3)
            self.assertTrue(exhausted["pool_exhausted"])
            self.assertEqual(len(self._files(root, "unknown_mushroom")), filled["accepted"] + exhausted["accepted"])

    def test_resume_replacements_match_for_1_and_16_workers(self):
        pools, probes, failures = self._pools()
        # One class, no probes: the resume comparison is the image bytes too.
        pools = {"boletus_edulis": pools["boletus_edulis"]}
        failures = {
            url: kind
            for url, kind in failures.items()
            if url.startswith("https://cdn.example.test/boletus_edulis/")
        }
        payloads = self._payloads(pools, {})
        manifest = {"classes": [self._manifest()["classes"][0]]}
        import shutil
        import tempfile

        def collect(species, max_per_class, max_per_occurrence, max_pages):
            return [dict(row) for row in pools[species["id"]]]

        def run(directory: Path, workers: int, calls: list[str], *, resume: bool = True):
            with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
                "fetch_gbif.urllib.request.urlopen",
                side_effect=self._urlopen(failures, payloads, calls),
            ), patch("fetch_gbif.time.sleep"), patch("fetch_gbif.random.uniform", return_value=0.0):
                fetch_gbif.run_fetch(
                    manifest,
                    max_per_class=4,
                    max_pages=1,
                    download_workers=workers,
                    resume=resume,
                    data_dir=directory,
                )

        def snapshot(root: Path) -> dict:
            images = {}
            folder = root / "images"
            for path in sorted(folder.rglob("*")):
                if path.is_file():
                    images[path.relative_to(root).as_posix()] = path.read_bytes()
            return {
                "images": images,
                "attributions": (root / "attributions.jsonl").read_bytes(),
                "report": (root / "fetch_report.json").read_bytes(),
            }

        with tempfile.TemporaryDirectory() as seed_dir, tempfile.TemporaryDirectory() as slow_dir, tempfile.TemporaryDirectory() as fast_dir:
            seed = Path(seed_dir)
            run(seed, 1, [])
            fresh = snapshot(seed)
            report = json.loads(fresh["report"].decode("utf-8"))
            self.assertEqual(report["classes"]["boletus_edulis"]["accepted"], 4)
            self.assertEqual(report["classes"]["boletus_edulis"]["shortfall"], 0)
            kept_urls = [json.loads(line)["image_url"] for line in fresh["attributions"].decode("utf-8").splitlines()]
            self.assertEqual(len(kept_urls), 4)
            survivors = set(kept_urls[:2])
            replaced = kept_urls[2:]
            rows = [json.loads(line) for line in fresh["attributions"].decode("utf-8").splitlines()]
            for row in rows[2:]:
                (seed / row["file"]).unlink()
            fetch_gbif._VERIFIED.clear()
            shutil.copytree(seed, Path(slow_dir), dirs_exist_ok=True)
            shutil.copytree(seed, Path(fast_dir), dirs_exist_ok=True)
            fetch_gbif._VERIFIED.clear()
            fetch_gbif._HOST_SEMAPHORES.clear()
            slow_calls: list[str] = []
            fast_calls: list[str] = []
            run(Path(slow_dir), 1, slow_calls)
            fetch_gbif._VERIFIED.clear()
            fetch_gbif._HOST_SEMAPHORES.clear()
            fetch_gbif.MAX_DOWNLOADS_PER_HOST = 32
            try:
                run(Path(fast_dir), 16, fast_calls)
            finally:
                fetch_gbif.MAX_DOWNLOADS_PER_HOST = 4
                fetch_gbif._HOST_SEMAPHORES.clear()
            slow = snapshot(Path(slow_dir))
            fast = snapshot(Path(fast_dir))
            self.assertEqual(slow["images"], fast["images"])
            self.assertEqual(slow["attributions"], fast["attributions"])
            self.assertEqual(slow["report"], fast["report"])
            self.assertEqual(slow["images"], fresh["images"])
            self.assertEqual(slow["attributions"], fresh["attributions"])
            self.assertEqual(slow["report"], fresh["report"])
            self.assertEqual(sorted(slow_calls), sorted(fast_calls))
            self.assertTrue(slow_calls)
            self.assertFalse(survivors.intersection(slow_calls))
            self.assertFalse(survivors.intersection(fast_calls))
            for url in replaced:
                self.assertIn(url, slow_calls)
                self.assertIn(url, fast_calls)


class CandidatePoolTest(FetchCase):
    def _occurrence(self, key: int, photos: int = 1) -> dict:
        media = []
        for index in range(photos):
            media.append(
                {
                    "type": "StillImage",
                    "identifier": f"https://images.example.test/pool/{key}_{index}.jpg",
                    "license": "https://creativecommons.org/licenses/by/4.0/",
                    "creator": "Ada",
                }
            )
        return {"key": key, "country": "PL", "scientificName": "Boletus edulis", "media": media}

    def test_initial_pool_stops_at_twice_the_cap(self):
        calls = {"search": 0}

        def get_json(url, timeout=60, attempts=4):
            if "species/match" in url:
                return {
                    "matchType": "EXACT",
                    "rank": "SPECIES",
                    "usageKey": 1,
                    "acceptedUsageKey": 1,
                    "scientificName": "Boletus edulis",
                }
            if "occurrence/search" in url:
                calls["search"] += 1
                results = [self._occurrence(5000 + index) for index in range(6)]
                return {"results": results, "endOfRecords": False, "count": 1000, "offset": 0}
            raise AssertionError(url)

        species = {"id": "boletus_edulis", "gbif_names": ["Boletus edulis"], "safety_tag": "edible"}
        with patch("fetch_gbif._get_json", side_effect=get_json), patch("fetch_gbif.time.sleep"):
            rows = fetch_gbif.collect_class_media(species, 2, 2, 40)
        self.assertEqual(calls["search"], 1)
        self.assertEqual(len(rows), 4)
        self.assertFalse(rows.pools[0].cursor["exhausted"])
        self.assertEqual(
            [row["image_url"] for row in rows],
            [f"https://images.example.test/pool/{5000 + index}_0.jpg" for index in range(4)],
        )

    def test_two_names_and_cap_80_stay_within_one_margin(self):
        searches: list[str] = []

        def get_json(url, timeout=60, attempts=4):
            parsed = urllib.parse.urlparse(url)
            query = urllib.parse.parse_qs(parsed.query)
            if "species/match" in url:
                name = query["name"][0]
                key = 111 if "edulis" in name else 222
                return {
                    "matchType": "EXACT",
                    "rank": "SPECIES",
                    "usageKey": key,
                    "acceptedUsageKey": key,
                    "scientificName": name,
                }
            if "occurrence/search" in url:
                searches.append(url)
                offset = int(query.get("offset", ["0"])[0])
                results = []
                for index in range(fetch_gbif.GBIF_PAGE_SIZE):
                    results.append(self._occurrence(10_000 + offset + index, photos=2))
                return {"results": results, "endOfRecords": False, "count": 100_000, "offset": offset}
            raise AssertionError(url)

        species = {
            "id": "boletus_edulis",
            "gbif_names": ["Boletus edulis", "Boletus pinophilus"],
            "safety_tag": "edible",
        }
        manifest = {"classes": [species]}
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch("fetch_gbif._get_json", side_effect=get_json), patch(
                "fetch_gbif.urllib.request.urlopen",
                side_effect=lambda request, timeout=40: _Response(self.jpeg),
            ), patch("fetch_gbif.time.sleep"):
                fetch_gbif.run_fetch(
                    manifest,
                    max_per_class=80,
                    max_pages=40,
                    only="boletus_edulis",
                    download_workers=1,
                    data_dir=root,
                )
            report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
            block = report["classes"]["boletus_edulis"]
            self.assertLessEqual(len(searches), 4)
            self.assertEqual(len(searches), 1)
            self.assertLessEqual(block["pool"], 160)
            self.assertEqual(block["pool"], 160)
            self.assertEqual(block["accepted"], 80)
            self.assertEqual(block["failed"], {})
            self.assertFalse(block["any_taxon_pool_exhausted"])
            self.assertNotIn("gbif_licensed_count", block)
            self.assertNotIn("exhausted_reason", block)
            files = list((root / "images" / "boletus_edulis").glob("*.jpg"))
            self.assertEqual(len(files), 80)

    def test_the_next_page_is_fetched_only_after_the_margin_fails(self):
        searches: list[int] = []

        def get_json(url, timeout=60, attempts=4):
            parsed = urllib.parse.urlparse(url)
            query = urllib.parse.parse_qs(parsed.query)
            if "species/match" in url:
                return {
                    "matchType": "EXACT",
                    "rank": "SPECIES",
                    "usageKey": 1,
                    "acceptedUsageKey": 1,
                    "scientificName": "Boletus edulis",
                }
            if "occurrence/search" in url:
                offset = int(query.get("offset", ["0"])[0])
                searches.append(offset)
                results = [self._occurrence(7000 + offset + index) for index in range(4)]
                return {"results": results, "endOfRecords": False, "count": 1000, "offset": offset}
            raise AssertionError(url)

        def urlopen(request, timeout=40):
            name = request.full_url.rsplit("/", 1)[-1]
            key = int(name.split("_", 1)[0])
            if 7000 <= key <= 7003:
                raise _http_error(404, "Not Found", url=request.full_url)
            return _Response(self.jpeg)

        species = {"id": "boletus_edulis", "gbif_names": ["Boletus edulis"], "safety_tag": "edible"}
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch("fetch_gbif._get_json", side_effect=get_json), patch(
                "fetch_gbif.urllib.request.urlopen", side_effect=urlopen
            ), patch("fetch_gbif.time.sleep"):
                fetch_gbif.run_fetch(
                    {"classes": [species]},
                    max_per_class=2,
                    max_pages=40,
                    only="boletus_edulis",
                    download_workers=1,
                    data_dir=root,
                )
            report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
            block = report["classes"]["boletus_edulis"]
            self.assertEqual(searches, [0, 4])
            self.assertEqual(block["accepted"], 2)
            self.assertEqual(block["pool"], 6)
            self.assertFalse(block["any_taxon_pool_exhausted"])
            self.assertNotIn("gbif_licensed_count", block)

    def test_max_pages_is_named_when_the_page_budget_ends_the_pool(self):
        serial = {"n": 8000}

        def get_json(url, timeout=60, attempts=4):
            if "species/match" in url:
                return {
                    "matchType": "EXACT",
                    "rank": "SPECIES",
                    "usageKey": 1,
                    "acceptedUsageKey": 1,
                    "scientificName": "Boletus edulis",
                }
            if "occurrence/search" in url:
                start = serial["n"]
                serial["n"] += 2
                results = [self._occurrence(start + index) for index in range(2)]
                return {"results": results, "endOfRecords": False, "count": 50, "offset": 0}
            raise AssertionError(url)

        species = {"id": "boletus_edulis", "gbif_names": ["Boletus edulis"], "safety_tag": "edible"}
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(fetch_gbif, "GBIF_PAGE_SIZE", 2), patch.object(
                fetch_gbif, "CENTRAL_EUROPE", ("PL",)
            ), patch("fetch_gbif._get_json", side_effect=get_json), patch(
                "fetch_gbif.urllib.request.urlopen",
                side_effect=lambda request, timeout=40: _Response(self.jpeg),
            ), patch("fetch_gbif.time.sleep"):
                fetch_gbif.run_fetch(
                    {"classes": [species]},
                    max_per_class=5,
                    max_pages=1,
                    only="boletus_edulis",
                    download_workers=1,
                    data_dir=root,
                )
            report = json.loads((root / "fetch_report.json").read_text(encoding="utf-8"))
            block = report["classes"]["boletus_edulis"]
            self.assertEqual(block["accepted"], 4)
            self.assertEqual(block["pool"], 4)
            self.assertEqual(block["shortfall"], 1)
            self.assertTrue(block["any_taxon_pool_exhausted"])
            self.assertEqual(block["exhausted_reason"], "max_pages")


class IdempotentReportTest(FetchCase):
    def _rows(self, count: int) -> list[dict]:
        return [_candidate("boletus_edulis", index, 9000 + index, "Boletus edulis") for index in range(count)]

    def _run(self, root: Path, rows: list[dict], failures: dict[str, str], *, workers: int = 2, cap: int = 6):
        payloads = {row["image_url"]: _jpeg_bytes(index + 3) for index, row in enumerate(rows)}

        def collect(species, max_per_class, max_per_occurrence, max_pages):
            return [dict(row) for row in rows]

        def urlopen(request, timeout=40):
            kind = failures.get(request.full_url)
            if kind == "404":
                raise _http_error(404, "Not Found", url=request.full_url)
            if kind == "timeout":
                raise urllib.error.URLError(TimeoutError("timed out"))
            if kind == "garbage":
                return _Response(b"not-a-jpeg" * 800, content_type="image/jpeg")
            return _Response(payloads[request.full_url])

        with patch("fetch_gbif.collect_class_media", side_effect=collect), patch(
            "fetch_gbif.urllib.request.urlopen", side_effect=urlopen
        ), patch("fetch_gbif.time.sleep"), patch("fetch_gbif.random.uniform", return_value=0.0):
            fetch_gbif.run_fetch(
                {"classes": [{"id": "boletus_edulis", "gbif_names": ["Boletus edulis"], "safety_tag": "edible"}]},
                max_per_class=cap,
                max_pages=1,
                only="boletus_edulis",
                download_workers=workers,
                data_dir=root,
            )

    def _images(self, root: Path) -> dict[str, bytes]:
        folder = root / "images"
        found = {}
        if not folder.is_dir():
            return found
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                found[path.relative_to(root).as_posix()] = path.read_bytes()
        return found

    def test_a_second_run_with_the_same_failures_rewrites_the_same_report(self):
        import tempfile

        rows = self._rows(9)
        failures = {
            rows[0]["image_url"]: "404",
            rows[2]["image_url"]: "timeout",
            rows[4]["image_url"]: "garbage",
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._run(root, rows, failures)
            report = (root / "fetch_report.json").read_bytes()
            attributions = (root / "attributions.jsonl").read_bytes()
            images = self._images(root)
            parsed = json.loads(report.decode("utf-8"))["classes"]["boletus_edulis"]
            self.assertEqual(parsed["accepted"], 6)
            self.assertEqual(parsed["selected"], 9)
            self.assertEqual(parsed["failed"], {"http_404": 1, "timeout": 1, "undecodable": 1})
            fetch_gbif._VERIFIED.clear()
            self._run(root, rows, failures)
            self.assertEqual((root / "fetch_report.json").read_bytes(), report)
            self.assertEqual((root / "attributions.jsonl").read_bytes(), attributions)
            self.assertEqual(self._images(root), images)

    def test_a_retried_failure_does_not_leave_the_replacement_in_images(self):
        import tempfile

        rows = self._rows(4)
        first = {rows[0]["image_url"]: "404"}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._run(root, rows, first, cap=2)
            fetch_gbif._VERIFIED.clear()
            self._run(root, rows, {}, cap=2)
            attributions = [
                json.loads(line)
                for line in (root / "attributions.jsonl").read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
            folder = root / "images" / "boletus_edulis"
            stored = sorted(path.name for path in folder.glob("*.jpg"))
            named = sorted(Path(row["file"]).name for row in attributions)
            self.assertEqual(stored, named)
            self.assertEqual(len(attributions), 2)
            self.assertNotIn(f"{rows[2]['occurrence_key']}_0.jpg", stored)
            moved = list((root / "not_selected" / "boletus_edulis").glob("*.jpg"))
            self.assertEqual([path.name for path in moved], [f"{rows[2]['occurrence_key']}_0.jpg"])


if __name__ == "__main__":
    unittest.main()
