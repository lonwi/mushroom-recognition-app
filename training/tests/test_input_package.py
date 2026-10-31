"""The prepare input-tree digest and SHA256SUMS check for data kept outside the repo."""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from component_share import COMPONENT_SHARE_LIMIT
from prepare_data import input_tree_sha256, resolve_input_archive_sha256, write_prepare_outputs

# sha256 of zero bytes. A SHA256SUMS file cannot store its own digest, so this
# placeholder on the checksum file's own line must be ignored.
_EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
from salt_fixture import FIXTURE_SALT


def _write(root: Path, name: str, payload: bytes) -> None:
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)


def _file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _sums_line(root: Path, relative: str, *, binary: bool = False, digest: str | None = None) -> str:
    """One ``sha256sum`` line: ``<hex>  <path>`` or ``<hex> *<path>``."""
    if digest is None:
        digest = _file_sha(root / relative)
    marker = "*" if binary else " "
    return f"{digest} {marker}{relative}\n"


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


def _prepare(directory: Path, **kwargs) -> dict:
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
        **kwargs,
    )


def _seed_old_outputs(root: Path) -> None:
    (root / "dataset_manifest.json").write_text("{}\n", encoding="utf-8")
    (root / "splits.json").write_text("{}\n", encoding="utf-8")
    (root / "dedup_report.json").write_text("{}\n", encoding="utf-8")


def _assert_hard_stop(test: unittest.TestCase, root: Path, message: str) -> None:
    with test.assertRaises(SystemExit) as raised:
        _prepare(root)
    test.assertIn(message, str(raised.exception))
    test.assertFalse((root / "dataset_manifest.json").exists())
    test.assertFalse((root / "splits.json").exists())
    test.assertFalse((root / "dedup_report.json").exists())


class InputPackageHashTest(unittest.TestCase):
    def test_same_tree_hash_regardless_of_write_order_and_ignored_files(self):
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
            for name, payload in files:
                _write(first, name, payload)
            for name, payload in list(reversed(files)) + ignored:
                _write(second, name, payload)
            forward = input_tree_sha256(first)
            self.assertEqual(input_tree_sha256(second), forward)
            self.assertEqual(len(forward), 64)

    def test_one_changed_byte_changes_the_tree_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "attributions.jsonl", b'{"n":1}\n')
            _write(root, "species.csv", b"amanita,1\n")
            original = input_tree_sha256(root)
            path = root / "species.csv"
            payload = bytearray(path.read_bytes())
            payload[0] = payload[0] ^ 0x01
            path.write_bytes(bytes(payload))
            self.assertNotEqual(input_tree_sha256(root), original)

    def test_sha256sum_listing_is_checked_and_recorded(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            _write(root, "attributions.jsonl", b'{"id":1}\n')
            text = _sums_line(root, "zdjecia/plik.csv", binary=True) + _sums_line(root, "attributions.jsonl")
            sums_path = root / "SHA256SUMS"
            sums_path.write_text(text, encoding="utf-8")
            sums_sha = _file_sha(sums_path)
            tree = input_tree_sha256(root)
            manifest = _prepare(root, input_archive_sha256="ab" * 32)
            report = json.loads((root / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["input_tree_sha256"], tree)
            self.assertEqual(report["input_tree_sha256"], tree)
            self.assertTrue(manifest["sums_checked"])
            self.assertTrue(report["sums_checked"])
            self.assertEqual(manifest["sha256sums_sha256"], sums_sha)
            self.assertEqual(report["sha256sums_sha256"], sums_sha)
            self.assertEqual(manifest["input_archive_sha256"], "ab" * 32)
            self.assertEqual(report["input_archive_sha256"], "ab" * 32)
            self.assertNotIn("input_package_sha256", manifest)
            self.assertNotIn("input_package_sha256", report)

    def test_sha256sum_hash_mismatch_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            (root / "SHA256SUMS").write_text(_sums_line(root, "zdjecia/plik.csv", digest="0" * 64), encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS hash mismatch: zdjecia/plik.csv")

    def test_sha256sum_missing_file_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            present = _sums_line(root, "zdjecia/plik.csv")
            missing = f"{'ab' * 32}  zdjecia/brak.csv\n"
            (root / "SHA256SUMS").write_text(present + missing, encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS lists a missing file: zdjecia/brak.csv")

    def test_sha256sum_absolute_path_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            (root / "SHA256SUMS").write_text(f"{'ab' * 32}  /etc/passwd\n", encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS path is absolute: /etc/passwd")

    def test_sha256sum_parent_segment_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            (root / "SHA256SUMS").write_text(f"{'ab' * 32}  zdjecia/../../etc/passwd\n", encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS path escapes the package: zdjecia/../../etc/passwd")

    def test_unlisted_csv_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            _write(root, "zdjecia/extra.csv", b"extra\n")
            (root / "SHA256SUMS").write_text(_sums_line(root, "zdjecia/plik.csv"), encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS does not list package file: zdjecia/extra.csv")

    def test_unlisted_script_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            _write(root, "fetch.py", b"print('no')\n")
            (root / "SHA256SUMS").write_text(_sums_line(root, "zdjecia/plik.csv"), encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS does not list package file: fetch.py")

    def test_missing_sha256sums_is_recorded_and_warned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/plik.csv", b"amanita,1\n")
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                manifest = _prepare(root)
            report = json.loads((root / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertIn("SHA256SUMS", stderr.getvalue())
            self.assertFalse(manifest["sums_checked"])
            self.assertFalse(report["sums_checked"])
            self.assertIsNone(manifest["sha256sums_sha256"])
            self.assertIsNone(report["sha256sums_sha256"])
            self.assertFalse(manifest["self_entry_ignored"])
            self.assertIsNone(manifest["self_entry_path"])
            self.assertEqual(manifest["input_tree_sha256"], input_tree_sha256(root))
            self.assertIsNone(manifest["input_archive_sha256"])

    def test_zdjecia_checksum_ignores_its_own_empty_hash_line(self):
        """Paths in zdjecia/SHA256SUMS are relative to the directory above zdjecia/."""
        self.assertEqual(hashlib.sha256(b"").hexdigest(), _EMPTY_SHA256)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/sample_a.csv", b"alpha,1\n")
            text = _sums_line(root, "zdjecia/sample_a.csv") + f"{_EMPTY_SHA256}  zdjecia/SHA256SUMS\n"
            (root / "zdjecia" / "SHA256SUMS").write_text(text, encoding="utf-8")
            manifest = _prepare(root)
            report = json.loads((root / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertTrue(manifest["self_entry_ignored"])
            self.assertEqual(manifest["self_entry_path"], "zdjecia/SHA256SUMS")
            self.assertTrue(report["self_entry_ignored"])
            self.assertEqual(report["self_entry_path"], "zdjecia/SHA256SUMS")
            self.assertTrue(manifest["sums_checked"])

    def test_attributions_beside_zdjecia_are_not_required_in_sha256sums(self):
        """fetch's attributions.jsonl sits next to zdjecia/ and is not in the package list."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "attributions.jsonl", b'{"source":"fetch"}\n')
            _write(root, "zdjecia/a.csv", b"alpha,1\n")
            _write(root, "zdjecia/script.py", b"print('synthetic')\n")
            text = (
                _sums_line(root, "zdjecia/a.csv")
                + _sums_line(root, "zdjecia/script.py", binary=True)
                + f"{_EMPTY_SHA256}  zdjecia/SHA256SUMS\n"
            )
            (root / "zdjecia" / "SHA256SUMS").write_text(text, encoding="utf-8")
            manifest = _prepare(root)
            report = json.loads((root / "dedup_report.json").read_text(encoding="utf-8"))
            self.assertTrue(manifest["sums_checked"])
            self.assertTrue(report["sums_checked"])
            self.assertEqual(manifest["self_entry_path"], "zdjecia/SHA256SUMS")
            self.assertEqual(manifest["input_tree_sha256"], input_tree_sha256(root))
            without_attributions = input_tree_sha256(root)
            (root / "attributions.jsonl").write_bytes(b'{"source":"changed"}\n')
            self.assertNotEqual(input_tree_sha256(root), without_attributions)

    def test_unlisted_csv_inside_zdjecia_still_stops(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "attributions.jsonl", b'{"source":"fetch"}\n')
            _write(root, "zdjecia/a.csv", b"alpha,1\n")
            _write(root, "zdjecia/b.csv", b"beta,2\n")
            _write(root, "zdjecia/script.py", b"print('synthetic')\n")
            text = _sums_line(root, "zdjecia/a.csv") + _sums_line(root, "zdjecia/script.py")
            (root / "zdjecia" / "SHA256SUMS").write_text(text, encoding="utf-8")
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS does not list package file: zdjecia/b.csv")

    def test_empty_file_hash_on_any_other_file_is_a_hard_stop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(root, "zdjecia/sample_a.csv", b"alpha,1\n")
            (root / "zdjecia" / "SHA256SUMS").write_text(
                f"{_EMPTY_SHA256}  zdjecia/sample_a.csv\n",
                encoding="utf-8",
            )
            _seed_old_outputs(root)
            _assert_hard_stop(self, root, "SHA256SUMS hash mismatch: zdjecia/sample_a.csv")

    def test_archive_path_and_digest_must_agree(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "pack.tgz"
            archive.write_bytes(b"tarball-bytes")
            digest = _file_sha(archive)
            self.assertEqual(resolve_input_archive_sha256(path=str(archive), digest=None, environ={}), digest)
            self.assertEqual(
                resolve_input_archive_sha256(path=None, digest=None, environ={"GRZYBOBRANIE_INPUT_ARCHIVE": str(archive)}),
                digest,
            )
            with self.assertRaises(SystemExit) as raised:
                resolve_input_archive_sha256(path=str(archive), digest="ab" * 32, environ={})
            self.assertIn("does not match", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
