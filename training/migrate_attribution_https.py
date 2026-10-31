"""Rewrite http attribution URLs only after that URL's https body matches.

This is not a host allowlist. For each row, ``image_url`` and ``source_url``
that still use http are checked one URL at a time. The row is rewritten only
when every such URL returns the same bytes over https. Anything else is left
out of the output and counted by class and reason. Creator, licence, and
other text fields are not inspected, so an http address inside a credit line
stays as it was written.

The default check downloads both schemes. Unit tests pass their own check and
do not use the network. CI does not run this script.

    python training/migrate_attribution_https.py attributions.jsonl \\
        --output attributions.https.jsonl --report https_migration_report.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from url_safety import force_https_url

USER_AGENT = "GrzybobranieAI-training/1.0 (https attribution migration; CC0 and CC-BY)"
_URL_FIELDS = ("image_url", "source_url")
_MAX_BODY_BYTES = 32_000_000


@dataclass(frozen=True)
class ResourceCheck:
    """Result of comparing one http URL with its https form."""

    same_resource: bool
    reason: str


def _read_body(url: str, timeout: int = 60) -> tuple[int | None, bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = int(response.status)
            chunks: list[bytes] = []
            size = 0
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > _MAX_BODY_BYTES:
                    return status, b""
                chunks.append(chunk)
            return status, b"".join(chunks)
    except urllib.error.HTTPError as error:
        body = error.read(65536) if error.fp is not None else b""
        return int(error.code), body


def live_same_resource(url: str) -> ResourceCheck:
    """Download ``url`` and the same URL over https. Equal 2xx bodies pass.

    The host is not consulted. Two paths on one host are two checks.
    """
    parts = urlsplit(url.strip())
    if parts.scheme.lower() != "http" or not parts.hostname:
        return ResourceCheck(False, "url_not_https")
    https_url = urlunsplit(("https", parts.netloc, parts.path, parts.query, parts.fragment))
    try:
        http_status, http_body = _read_body(url.strip())
        https_status, https_body = _read_body(https_url)
    except (urllib.error.URLError, TimeoutError, OSError):
        return ResourceCheck(False, "https_check_failed")
    if http_status is None or https_status is None:
        return ResourceCheck(False, "https_check_failed")
    if not (200 <= http_status < 300 and 200 <= https_status < 300):
        return ResourceCheck(False, "https_request_failed")
    if not http_body or not https_body:
        return ResourceCheck(False, "https_request_failed")
    if hashlib.sha256(http_body).digest() != hashlib.sha256(https_body).digest():
        return ResourceCheck(False, "https_not_same_resource")
    return ResourceCheck(True, "https_same_resource")


def _http_fields(row: dict) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for field in _URL_FIELDS:
        value = row.get(field)
        if not isinstance(value, str) or not value.strip():
            continue
        text = value.strip()
        scheme = urlsplit(text).scheme.lower()
        if scheme == "https":
            continue
        found.append((field, text))
    return found


def migrate_rows(rows: list[dict], verify) -> tuple[list[dict], dict]:
    """Keep rewritten rows. Drop the rest with a counted reason.

    ``verify`` receives one http URL and returns a :class:`ResourceCheck`.
    A true result is what allows ``force_https_url``. The host is not a
    shortcut: a second path on the same host is checked on its own, and a
    failed check rejects the row.
    """
    kept: list[dict] = []
    rejected_rows: list[dict] = []
    per_class: dict[str, Counter[str]] = {}
    rewritten = 0
    for row in rows:
        if not isinstance(row, dict):
            rejected_rows.append({"class_id": "", "reason": "row_not_object", "fields": []})
            per_class.setdefault("", Counter())["row_not_object"] += 1
            continue
        pending = _http_fields(row)
        updates: dict[str, str] = {}
        reason = None
        fields: list[str] = []
        for field, text in pending:
            scheme = urlsplit(text).scheme.lower()
            if scheme != "http":
                reason = reason or "url_not_https"
                fields.append(field)
                continue
            try:
                check = verify(text)
            except Exception:
                check = ResourceCheck(False, "https_check_failed")
            if not getattr(check, "same_resource", False):
                reason = reason or (getattr(check, "reason", None) or "https_not_same_resource")
                fields.append(field)
                continue
            updates[field] = force_https_url(text)
        if reason:
            class_id = str(row.get("class_id") or "")
            per_class.setdefault(class_id, Counter())[reason] += 1
            rejected_rows.append(
                {
                    "class_id": class_id,
                    "file": row.get("file") or "",
                    "reason": reason,
                    "fields": fields,
                    "image_url": row.get("image_url") if isinstance(row.get("image_url"), str) else "",
                    "source_url": row.get("source_url") if isinstance(row.get("source_url"), str) else "",
                }
            )
            continue
        if updates:
            rewritten += 1
            row = {**row, **updates}
        kept.append(row)
    report = {
        "input_rows": len(rows),
        "kept_rows": len(kept),
        "rewritten_rows": rewritten,
        "rejected_rows": len(rejected_rows),
        "rejected_per_class": {
            class_id: dict(sorted(counts.items())) for class_id, counts in sorted(per_class.items())
        },
        "rejected": rejected_rows,
    }
    return kept, report


def _read_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Rewrite attribution URLs to https only when that URL's https body matches"
    )
    parser.add_argument("source", type=Path, help="Existing attributions.jsonl")
    parser.add_argument("--output", type=Path, required=True, help="JSONL of kept rows")
    parser.add_argument("--report", type=Path, required=True, help="JSON report of rewritten and rejected rows")
    args = parser.parse_args(argv)
    kept, report = migrate_rows(_read_jsonl(args.source), live_same_resource)
    _write_jsonl(args.output, kept)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "input_rows": report["input_rows"],
                "kept_rows": report["kept_rows"],
                "rewritten_rows": report["rewritten_rows"],
                "rejected_rows": report["rejected_rows"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
