"""Resume, retry, and byte-stable output for the GBIF photo fetch.

Collected by unittest and by pytest. No network: urlopen is mocked.
"""

from __future__ import annotations

import io
import json
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
        with patch("fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)):
            with patch("fetch_gbif.urllib.request.urlopen", side_effect=fail(500, "500")):
                with self.assertRaises(urllib.error.HTTPError):
                    fetch_gbif.download_image(self._url, self._dest)
            self.assertEqual(calls["500"], 3)
            self.assertEqual(sleeps, [0.5, 1.0])
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
            "fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)
        ):
            size = fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [4.0])
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
            "fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)
        ):
            fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [fetch_gbif.DOWNLOAD_BACKOFF_SECONDS])

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
            "fetch_gbif.time.sleep", side_effect=lambda seconds: sleeps.append(seconds)
        ):
            fetch_gbif.download_image(self._url, self._dest)
        self.assertEqual(calls["n"], 2)
        self.assertEqual(sleeps, [fetch_gbif.DOWNLOAD_BACKOFF_SECONDS])

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
            checkpoint = (resumed / "checkpoints" / "boletus_edulis.jsonl").read_bytes()
            self.assertEqual(checkpoint, (resumed / "attributions.jsonl").read_bytes())
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
            self.assertTrue((resumed / "checkpoints" / "probe-Lepiota_cristata.jsonl").is_file())
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


if __name__ == "__main__":
    unittest.main()
