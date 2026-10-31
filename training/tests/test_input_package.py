"""The prepare input-package digest is a stable reference for data kept outside the repo."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from component_share import COMPONENT_SHARE_LIMIT
from prepare_data import input_package_sha256, write_prepare_outputs
from salt_fixture import FIXTURE_SALT


def _write(root: Path, name: str, payload: bytes) -> None:
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def _package(root: Path, names: list[tuple[str, bytes]]) -> str:
    for name, payload in names:
        _write(root, name, payload)
    return input_package_sha256(root)


def _balanced() -> list[dict]:
    rows = []
    for index in range(10):
        rows.append(
            {
                "class_id": "boletus_edulis",
                "inat_observer": f"login_{index}",
                "author": f"Author {index}",
                "license": "CC BY 4.0",
                "license_normalized": "cc-by-4.0",
                "license_url": "https://creativecommons.org/licenses/by/4.0/",
                "image_url": f"https://images.example.test/boletus_edulis/{index}.jpg",
                "file": f"boletus_edulis_{index}.jpg",
                "occurrence_key": f"boletus_edulis-{index}",
                "inat_photo_id": str(index),
                "inat_observation_id": f"obs-{index}",
            }
        )
    return rows


def _prepare(directory: Path) -> dict:
    balanced = _balanced()
    return write_prepare_outputs(
        directory,
        prepared=balanced,
        splits={"train": balanced[:6], "val": balanced[6:8], "test": balanced[8:]},
        dropped=[],
        identity_dropped=[],
        skipped=[],
        withheld=[],
        salt=FIXTURE_SALT,
        share_config={"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}},
        model_png_size=224,
    )


class InputPackageHashTest(unittest.TestCase):
    def test_same_hash_regardless_of_write_order_and_ignored_files(self):
        files = [
            ("b.csv", b"beta\n"),
            ("nested/attributions.jsonl", b'{"id":1}\n'),
            ("external.jsonl", b'{"id":2}\n'),
            ("z.csv", b"zeta\n"),
        ]
        ignored = [
            ("notes.bak", b"backup"),
            ("a.csv.bak", b"old-csv"),
            ("attributions.jsonl.bak", b"old-jsonl"),
            ("__pycache__/cached.csv", b"cache"),
            ("logs/keep.csv", b"should-not-count"),
            ("run.log", b"log-line\n"),
            ("attributions.dedup.jsonl", b"output\n"),
        ]
        with tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            first = Path(first_tmp)
            second = Path(second_tmp)
            forward = _package(first, files)
            backward = _package(second, list(reversed(files)) + ignored)
            self.assertEqual(forward, backward)
            self.assertEqual(len(forward), 64)

    def test_one_changed_byte_changes_the_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "attributions.jsonl", b'{"n":1}\n')
            _write(root, "species.csv", b"amanita,1\n")
            original = input_package_sha256(root)
            path = root / "species.csv"
            payload = bytearray(path.read_bytes())
            payload[0] = payload[0] ^ 0x01
            path.write_bytes(bytes(payload))
            self.assertNotEqual(input_package_sha256(root), original)

    def test_mismatched_sha256sums_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "species.csv", b"amanita,1\n")
            digest = input_package_sha256(root)
            (root / "SHA256SUMS").write_text("0" * 64 + "\n", encoding="utf-8")
            (root / "dataset_manifest.json").write_text("{}\n", encoding="utf-8")
            (root / "splits.json").write_text("{}\n", encoding="utf-8")
            (root / "dedup_report.json").write_text("{}\n", encoding="utf-8")
            with self.assertRaises(SystemExit) as raised:
                _prepare(root)
            self.assertIn("SHA256SUMS", str(raised.exception))
            self.assertNotEqual("0" * 64, digest)
            self.assertFalse((root / "dataset_manifest.json").exists())
            self.assertFalse((root / "splits.json").exists())
            self.assertFalse((root / "dedup_report.json").exists())

    def test_matching_sha256sums_is_stored_on_the_report_and_the_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "species.csv", b"amanita,1\n")
            _write(root, "attributions.jsonl", b'{"id":1}\n')
            digest = input_package_sha256(root)
            (root / "SHA256SUMS").write_text(digest + "  data-package\n", encoding="utf-8")
            manifest = _prepare(root)
            report = json.loads((root / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["input_package_sha256"], digest)
            self.assertEqual(report["input_package_sha256"], digest)
            self.assertEqual(input_package_sha256(root), digest)


if __name__ == "__main__":
    unittest.main()
