"""One-time capture: does https serve the same bytes as http?

CI does not run this script. It talks to GBIF and to the image hosts, writes
``training/fixtures/https_host_equivalence.json``, and exits. The unit tests
only read that file. The script exits 0 when every host matched and 1 when
any host did not, after writing the fixture either way. A failed host is
not allowlisted.

For each host below, the script walks a fixed GBIF window (offset 0, three
pages of 300, StillImage), keeps URLs on that exact host, sorts them, and
downloads the first five over http and over https. Each sample stores both
status codes, both body SHA-256 values, the sizes, and the capture time.

A later test allowlists a host only when every one of those samples has a
2xx status on both schemes and the same SHA-256. A host that fails stays in
``rejected_hosts`` and is not allowlisted. Nothing here rewrites an
attribution row.

    python training/capture_https_equivalence.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

USER_AGENT = "GrzybobranieAI-training/1.0 (https equivalence capture; CC0 and CC-BY)"
GBIF_SEARCH = "https://api.gbif.org/v1/occurrence/search"
PAGE_LIMIT = 300
MAX_PAGES = 3
SAMPLES_PER_HOST = 5
MAX_BODY_BYTES = 32_000_000
# Hosts seen on GBIF rows for the New York Botanical Garden and Kew Fungarium.
# The capture decides which of them actually serve the same bytes over https.
HOSTS = (
    {
        "host": "sweetgum.nybg.org",
        "dataset_key": "d415c253-4d61-4459-9d25-4015b9084fb0",
        "kingdom_key": 5,
        "label": "NYBG Steere Herbarium",
    },
    {
        "host": "specimens.kew.org",
        "dataset_key": "2e8ab72b-5931-4e04-b8ff-e1fb61305d17",
        "kingdom_key": None,
        "label": "Kew Fungarium",
    },
)


def _request(url: str, timeout: int = 60) -> tuple[int | None, bytes, str | None]:
    """GET one URL. Returns status, body, and an error string when the socket fails."""
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
                if size > MAX_BODY_BYTES:
                    return status, b"", "body_too_large"
                chunks.append(chunk)
            return status, b"".join(chunks), None
    except urllib.error.HTTPError as error:
        body = error.read(65536) if error.fp is not None else b""
        return int(error.code), body, None
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return None, b"", str(error)


def _http_form(url: str, host: str) -> str | None:
    parts = urllib.parse.urlsplit(url.strip())
    if (parts.hostname or "").lower() != host:
        return None
    if parts.scheme.lower() not in ("http", "https"):
        return None
    return urllib.parse.urlunsplit(("http", parts.netloc, parts.path, parts.query, ""))


def _candidate_urls(record: dict, host: str) -> list[str]:
    raw: list[str] = []
    references = record.get("references")
    if isinstance(references, str):
        raw.append(references)
    for media in record.get("media") or []:
        if not isinstance(media, dict):
            continue
        for key in ("identifier", "references"):
            value = media.get(key)
            if isinstance(value, str):
                raw.append(value)
    found: list[str] = []
    for value in raw:
        formed = _http_form(value, host)
        if formed:
            found.append(formed)
    return found


def select_urls(dataset_key: str, host: str, kingdom_key: int | None) -> tuple[list[str], dict]:
    """Deterministic sample: fixed GBIF window, exact host, lexicographic first five."""
    found: set[str] = set()
    pages = 0
    end = False
    for page in range(MAX_PAGES):
        query = {
            "datasetKey": dataset_key,
            "mediaType": "StillImage",
            "limit": PAGE_LIMIT,
            "offset": page * PAGE_LIMIT,
        }
        if kingdom_key is not None:
            query["kingdomKey"] = kingdom_key
        url = GBIF_SEARCH + "?" + urllib.parse.urlencode(query)
        status, body, error = _request(url, timeout=90)
        pages += 1
        if error or status != 200:
            break
        payload = json.loads(body.decode("utf-8"))
        for record in payload.get("results") or []:
            if isinstance(record, dict):
                found.update(_candidate_urls(record, host))
        end = bool(payload.get("endOfRecords"))
        if end:
            break
        time.sleep(0.2)
    ordered = sorted(found)
    meta = {
        "dataset_key": dataset_key,
        "pages_fetched": pages,
        "page_limit": PAGE_LIMIT,
        "max_pages": MAX_PAGES,
        "candidates": len(ordered),
        "end_of_records": end,
        "order": "lexicographic",
    }
    return ordered[:SAMPLES_PER_HOST], meta


def capture_sample(http_url: str) -> dict:
    """Download the http URL and the same URL with the scheme forced to https."""
    parts = urllib.parse.urlsplit(http_url)
    https_url = urllib.parse.urlunsplit(("https", parts.netloc, parts.path, parts.query, ""))
    http_status, http_body, http_error = _request(http_url)
    time.sleep(0.2)
    https_status, https_body, https_error = _request(https_url)
    return {
        "url": http_url,
        "https_url": https_url,
        "http_status": http_status,
        "https_status": https_status,
        "http_sha256": hashlib.sha256(http_body).hexdigest() if http_error != "body_too_large" else "",
        "https_sha256": hashlib.sha256(https_body).hexdigest() if https_error != "body_too_large" else "",
        "http_bytes": len(http_body),
        "https_bytes": len(https_body),
        "http_error": http_error,
        "https_error": https_error,
    }


def _matches(sample: dict) -> bool:
    http_status = sample.get("http_status")
    https_status = sample.get("https_status")
    http_sha = sample.get("http_sha256")
    https_sha = sample.get("https_sha256")
    if not isinstance(http_status, int) or not isinstance(https_status, int):
        return False
    if not (200 <= http_status < 300 and 200 <= https_status < 300):
        return False
    return isinstance(http_sha, str) and len(http_sha) == 64 and http_sha == https_sha


def build_fixture() -> dict:
    captured_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    hosts: dict[str, dict] = {}
    rejected: dict[str, dict] = {}
    for spec in HOSTS:
        host = spec["host"]
        print(f"select {host}", file=sys.stderr)
        urls, meta = select_urls(spec["dataset_key"], host, spec["kingdom_key"])
        samples = []
        for url in urls:
            print(f"  get {url}", file=sys.stderr)
            samples.append(capture_sample(url))
            time.sleep(0.2)
        block = {
            "label": spec["label"],
            "dataset_key": spec["dataset_key"],
            "selection": meta,
            "samples": samples,
        }
        if len(samples) == SAMPLES_PER_HOST and all(_matches(sample) for sample in samples):
            hosts[host] = block
        else:
            rejected[host] = block
    return {
        "captured_at": captured_at,
        "samples_per_host": SAMPLES_PER_HOST,
        "note": (
            "One-time http versus https body comparison. Unit tests read this file "
            "and do not download it again. A host is allowlisted only when every "
            "sample has a 2xx status on both schemes and both bodies share a SHA-256. "
            "An attribution URL is rewritten only when that exact resource is one of "
            "these samples, or when migrate_attribution_https.py has checked that "
            "row's own https response."
        ),
        "hosts": hosts,
        "rejected_hosts": rejected,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Capture http/https body hashes for NYBG and Kew hosts")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "fixtures" / "https_host_equivalence.json",
    )
    args = parser.parse_args(argv)
    fixture = build_fixture()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "allowlisted": sorted(fixture["hosts"]),
                "rejected": sorted(fixture["rejected_hosts"]),
            }
        )
    )
    return 0 if not fixture["rejected_hosts"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
