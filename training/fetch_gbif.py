"""Download GBIF still images whose own media license is CC0 or CC-BY.

Usage (from the repo root):

    python training/fetch_gbif.py --dry-run --only amanita_phalloides --max-per-class 5
    python training/fetch_gbif.py --only amanita_phalloides --max-per-class 20

A file already listed in checkpoints/verified.jsonl with the same size and
mtime is skipped. Any other existing file must decode with a full Pillow
``load()``, and ``LOAD_TRUNCATED_IMAGES`` stays false. A file that fails is
moved to quarantine/<class>/ and downloaded again. A new download is decoded
in memory before it is written. ``--no-resume`` downloads again anyway.
``--verify-existing`` scans data/images with no network. If the spawn process
pool cannot start (``PermissionError``, ``OSError``, ``NotImplementedError``,
or ``BrokenProcessPool``), that scan uses threads and prints a warning.

``accepted`` in fetch_report.json is the number of files written and verified.
That is also the number of rows in attributions.jsonl for that class or probe.
A candidate that fails after retries is not accepted. The next photo in the
same ordered GBIF pool replaces it until the cap is full or GBIF has no further
licensed page. The first query keeps a margin of twice the cap. Later pages are
fetched only when those replacements run out, still in that same order, so one
worker and sixteen workers write the same bytes. ``pool_exhausted`` and
``gbif_licensed_count`` (the entire licensed pool) are set only when the query
really ended: no more records, or ``--max-pages``. ``exhausted_reason`` says
which. A margin that still has unused photos does not set either field.

Every run walks that pool from the first candidate. A file that already
verifies counts as accepted and is not downloaded again. A failed candidate in
that prefix is tried again, so a second run on an unchanged network rewrites
the same ``fetch_report.json``. A photo that is no longer in the selection is
moved to ``not_selected/<class>/``.

``--download-workers`` (default 16) fetches one class or probe at a time, with at
most 4 transfers per image host. GBIF API calls stay one at a time. Images and
attributions land in training/data/, which is gitignored. An interrupted run
keeps finished classes in attributions.jsonl and fetch_report.json.
"""

from __future__ import annotations

import argparse
import copy
import errno
import hashlib
import http.client
import io
import json
import os
import random
import re
import socket
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from licenses import accepted_media_records, normalize_cc_license
from manifest import CENTRAL_EUROPE, LABELS_PATH, ROOT, load_manifest
from sampling import (
    MAX_PER_OCCURRENCE,
    class_fetch_cap,
    taxon_fetch_plan,
    thin_class_report,
)

USER_AGENT = "GrzybobranieAI-training/1.0 (open-license photos only; CC0 and CC-BY)"
DATA_DIR = ROOT / "training" / "data"
GBIF_SEARCH = "https://api.gbif.org/v1/occurrence/search"
GBIF_MATCH = "https://api.gbif.org/v1/species/match"
# Occurrence search and species match stay on one thread. Image hosts are separate.
GBIF_API_MIN_INTERVAL = 0.2
GBIF_MATCH_DELAY = 0.2
GBIF_PAGE_DELAY = 0.25
MAX_DOWNLOADS_PER_HOST = 4
DOWNLOAD_ATTEMPTS = 3
DOWNLOAD_BACKOFF_SECONDS = 0.5
# Added on top of backoff and Retry-After so 16 workers do not wake together.
DOWNLOAD_JITTER_SECONDS = 0.5
MAX_RETRY_AFTER_SECONDS = 120.0
MAX_IMAGE_BYTES = 16_000_000
GBIF_PAGE_SIZE = 300
# First licensed batch is this many times the download cap. Further GBIF pages
# are requested only after that margin has been used as replacements.
POOL_MARGIN_FACTOR = 2
# Version 3 drops the download cap from the cache key and stores a GBIF cursor
# beside the rows fetched so far. Version 1 stopped at the cap. Version 2 stored
# an unbounded pool. Both miss this key. A fetch of that class or probe deletes
# the stale siblings. Delete training/data/gbif_cache/ to drop them without fetching.
_QUERY_CACHE_VERSION = 3
_CACHE_DOWNLOAD_FIELDS = (
    "file",
    "source",
    "downloaded",
    "bytes",
    "download_error",
    "_failure_reason",
    "_image_rejected",
)

_GBIF_API_LOCK = threading.Lock()
_last_gbif_api_at: float | None = None
_HOST_SEMAPHORES: dict[str, threading.BoundedSemaphore] = {}
_HOST_SEMAPHORES_LOCK = threading.Lock()
_PRINT_LOCK = threading.Lock()
_TRANSIENT_ERRNOS = {
    errno.ECONNRESET,
    errno.ETIMEDOUT,
    errno.EPIPE,
    errno.ECONNABORTED,
    errno.EHOSTUNREACH,
    errno.ENETUNREACH,
}

_FETCH_NOTE = (
    "Global fill runs after the Central European countries until the class cap. "
    "It is not limited to classes below --min-before-global. "
    "Cortinarius orellanus, Cortinarius rubellus, and Amanita virosa stay thin when CC0/CC-BY media is scarce."
)


def _wait_for_gbif_slot() -> None:
    """Space API calls by at least GBIF_API_MIN_INTERVAL. Caller holds the API lock."""
    if _last_gbif_api_at is None:
        return
    remaining = GBIF_API_MIN_INTERVAL - (time.monotonic() - _last_gbif_api_at)
    if remaining > 0:
        time.sleep(remaining)


def _close_http_error(error: urllib.error.HTTPError) -> None:
    try:
        error.close()
    except Exception:
        pass


def _retry_after_seconds(error: urllib.error.HTTPError) -> float | None:
    """Seconds to wait after HTTP 429. None when the header is missing or not a delay."""
    headers = getattr(error, "headers", None)
    if headers is None:
        return None
    raw = headers.get("Retry-After")
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        return min(MAX_RETRY_AFTER_SECONDS, max(0.0, float(text)))
    except ValueError:
        pass
    try:
        parsed = parsedate_to_datetime(text)
    except (TypeError, ValueError, OverflowError, OSError):
        return None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    try:
        delay = parsed.timestamp() - time.time()
    except (OverflowError, OSError, ValueError):
        return None
    return min(MAX_RETRY_AFTER_SECONDS, max(0.0, delay))


def _get_json(url: str, timeout: int = 60, attempts: int = 4) -> dict:
    """GET JSON from the GBIF API. One request at a time, with Retry-After on HTTP 429."""
    global _last_gbif_api_at
    with _GBIF_API_LOCK:
        _wait_for_gbif_slot()
        try:
            return _get_json_unlocked(url, timeout=timeout, attempts=attempts)
        finally:
            _last_gbif_api_at = time.monotonic()


def _get_json_unlocked(url: str, timeout: int, attempts: int) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    delay = 1.0
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            last_error = error
            retry_after = _retry_after_seconds(error) if error.code == 429 else None
            _close_http_error(error)
            if error.code not in (429, 500, 502, 503, 504):
                raise
            wait = retry_after if retry_after is not None else delay
        except urllib.error.URLError as error:
            last_error = error
            wait = delay
        if attempt + 1 >= attempts:
            break
        time.sleep(wait)
        delay *= 2
    raise RuntimeError(f"GBIF request failed: {url}") from last_error


_KEY_CACHE: dict[str, tuple[int, str] | None] = {}


_SPECIES_RANKS = {"SPECIES", "SUBSPECIES", "VARIETY", "FORM"}


def resolve_accepted_keys(names: list[str]) -> dict[int, str]:
    """Map accepted GBIF usage keys to the scientific name we asked for.

    A HIGHERRANK match (a genus, a class, or the kingdom) used to be skipped
    with a one-line note, so names such as Helvella crispa and Boletus badius
    contributed zero photos and the fetch still looked successful. That is now
    a hard error. The process exits before any download.
    """
    errors: list[str] = []
    keys: dict[int, str] = {}
    for name in names:
        if name not in _KEY_CACHE:
            query = urllib.parse.urlencode({"name": name, "strict": "true"})
            payload = _get_json(f"{GBIF_MATCH}?{query}")
            match_type = payload.get("matchType")
            rank = payload.get("rank")
            usage = payload.get("acceptedUsageKey") or payload.get("usageKey")
            if match_type != "EXACT" or rank not in _SPECIES_RANKS or not usage:
                message = (
                    f"GBIF match for {name!r} is {match_type} rank {rank} "
                    f"({payload.get('scientificName')}). Expected an EXACT species. "
                    "Refusing to skip this name."
                )
                print(message, file=sys.stderr)
                errors.append(message)
                _KEY_CACHE[name] = None
            else:
                _KEY_CACHE[name] = (int(usage), name)
            time.sleep(GBIF_MATCH_DELAY)
        cached = _KEY_CACHE[name]
        if cached is None:
            continue
        usage_key, queried = cached
        keys[usage_key] = queried
    if errors:
        raise SystemExit("fetch stopped because one or more GBIF names are not an exact species:\n" + "\n".join(errors))
    return keys


def iter_occurrences(taxon_key: int, country: str | None, max_pages: int):
    offset = 0
    for _ in range(max_pages):
        params = {
            "taxonKey": str(taxon_key),
            "mediaType": "StillImage",
            "limit": str(GBIF_PAGE_SIZE),
            "offset": str(offset),
        }
        if country:
            params["country"] = country
        payload = _get_json(f"{GBIF_SEARCH}?{urllib.parse.urlencode(params)}")
        results = payload.get("results") or []
        for record in results:
            yield record
        offset += len(results)
        if not results or payload.get("endOfRecords") or offset >= int(payload.get("count") or 0):
            return
        time.sleep(GBIF_PAGE_DELAY)


def _margin_limit(cap: int) -> int:
    """Licensed photos to collect before the first download.

    Twice the cap leaves replacements on hand. A later page is fetched only
    when a download window still needs a candidate and this list is used up.
    """
    return max(0, int(cap)) * POOL_MARGIN_FACTOR


def _search_passes() -> list[tuple[str | None, str]]:
    return [(country, "central_europe") for country in CENTRAL_EUROPE] + [(None, "global_fill")]


def _blank_cursor(names: list[str], seen: set) -> dict:
    return {
        "names": list(names),
        "keys": None,
        "seen": [key for key in seen],
        "pass_index": 0,
        "name_index": 0,
        "offset": 0,
        "pages_used": 0,
        "media_skip": 0,
        "partial_key": None,
        "hit_max_pages": False,
        "exhausted": False,
        "exhausted_reason": None,
    }


def _mark_exhausted(cursor: dict) -> None:
    cursor["exhausted"] = True
    cursor["exhausted_reason"] = "max_pages" if cursor.get("hit_max_pages") else "end_of_records"


def _advance_name(cursor: dict, name_count: int, pass_count: int) -> None:
    cursor["name_index"] = int(cursor["name_index"]) + 1
    cursor["offset"] = 0
    cursor["pages_used"] = 0
    cursor["media_skip"] = 0
    cursor["partial_key"] = None
    if cursor["name_index"] >= name_count:
        cursor["pass_index"] = int(cursor["pass_index"]) + 1
        cursor["name_index"] = 0
        if cursor["pass_index"] >= pass_count:
            _mark_exhausted(cursor)


def _fetch_occurrence_page(taxon_key: int, country: str | None, offset: int) -> dict:
    params = {
        "taxonKey": str(taxon_key),
        "mediaType": "StillImage",
        "limit": str(GBIF_PAGE_SIZE),
        "offset": str(offset),
    }
    if country:
        params["country"] = country
    return _get_json(f"{GBIF_SEARCH}?{urllib.parse.urlencode(params)}")


def _take_from_occurrence(
    record: dict,
    *,
    seen: set,
    seen_list: list,
    max_per_occurrence: int,
    media_skip: int,
    partial_key,
    room: int,
) -> tuple[list[dict], int, object, str]:
    """Take the next licensed photos from one occurrence.

    Returns rows, the next media offset, the occurrence key when a photo
    remains, and ``full``, ``partial``, or ``skip``.
    """
    key = record.get("key")
    if key in seen and key != partial_key:
        return [], 0, None, "skip"
    licensed = accepted_media_records(record)
    if not licensed or max_per_occurrence < 1 or room < 1:
        return [], 0, None, "skip"
    takeable = licensed[:max_per_occurrence]
    start = media_skip if key == partial_key else 0
    if start < 0:
        start = 0
    got = takeable[start : start + room]
    consumed = start + len(got)
    if consumed >= len(takeable):
        if key not in seen:
            seen.add(key)
            seen_list.append(key)
        return got, 0, None, "full"
    return got, consumed, key, "partial"


def _fetch_licensed(
    cursor: dict,
    want: int,
    max_per_occurrence: int,
    max_pages: int,
) -> tuple[list[dict], dict]:
    """Append up to ``want`` licensed photos. Stop before the next GBIF page once ``want`` is met."""
    cursor = copy.deepcopy(cursor)
    if want < 1 or cursor.get("exhausted"):
        return [], cursor
    if max_per_occurrence < 1:
        _mark_exhausted(cursor)
        return [], cursor
    if cursor.get("keys") is None:
        resolved = resolve_accepted_keys(list(cursor.get("names") or []))
        cursor["keys"] = [[key, name] for key, name in resolved.items()]
    passes = _search_passes()
    seen_list = list(cursor.get("seen") or [])
    seen = set(seen_list)
    name_count = len(cursor["keys"])
    pass_count = len(passes)
    page_budget = max(1, int(max_pages))
    rows: list[dict] = []
    if name_count == 0 or pass_count == 0:
        _mark_exhausted(cursor)
        cursor["seen"] = seen_list
        return [], cursor

    while len(rows) < want and not cursor.get("exhausted"):
        if int(cursor["pass_index"]) >= pass_count:
            _mark_exhausted(cursor)
            break
        if int(cursor["name_index"]) >= name_count:
            _advance_name(cursor, name_count, pass_count)
            continue
        page_index = int(cursor["offset"]) // GBIF_PAGE_SIZE
        if page_index >= page_budget:
            cursor["hit_max_pages"] = True
            _advance_name(cursor, name_count, pass_count)
            continue
        country, scope = passes[int(cursor["pass_index"])]
        taxon_key, queried_name = cursor["keys"][int(cursor["name_index"])]
        page_start = int(cursor["offset"])
        if int(cursor["pages_used"]) > 0:
            time.sleep(GBIF_PAGE_DELAY)
        payload = _fetch_occurrence_page(int(taxon_key), country, page_start)
        cursor["pages_used"] = page_index + 1
        results = payload.get("results") or []
        count = int(payload.get("count") or 0)
        reached_count = count > 0 and page_start + len(results) >= count
        end = (not results) or bool(payload.get("endOfRecords")) or reached_count or count == 0
        stopped_early = False
        for index, record in enumerate(results):
            if len(rows) >= want:
                cursor["offset"] = page_start + index
                cursor["media_skip"] = 0
                cursor["partial_key"] = None
                stopped_early = True
                break
            resume_skip = int(cursor.get("media_skip") or 0) if index == 0 else 0
            resume_key = cursor.get("partial_key") if index == 0 else None
            got, media_skip, partial_key, status = _take_from_occurrence(
                record,
                seen=seen,
                seen_list=seen_list,
                max_per_occurrence=max_per_occurrence,
                media_skip=resume_skip,
                partial_key=resume_key,
                room=want - len(rows),
            )
            for row in got:
                row["region_scope"] = scope
                row["queried_name"] = queried_name
                row["taxon_name"] = queried_name
            rows.extend(got)
            if status == "partial":
                cursor["offset"] = page_start + index
                cursor["media_skip"] = media_skip
                cursor["partial_key"] = partial_key
                stopped_early = True
                break
            if index == 0:
                cursor["media_skip"] = 0
                cursor["partial_key"] = None
            if len(rows) >= want:
                cursor["offset"] = page_start + index + 1
                cursor["media_skip"] = 0
                cursor["partial_key"] = None
                stopped_early = True
                break
        if stopped_early:
            break
        cursor["offset"] = page_start + len(results)
        cursor["media_skip"] = 0
        cursor["partial_key"] = None
        if end:
            _advance_name(cursor, name_count, pass_count)
    cursor["seen"] = seen_list
    return rows, cursor


class _PoolList(list):
    """Rows plus the per-taxon pools a live GBIF query can extend."""

    pools: list | None = None


class _Pool:
    """One ordered licensed list. ``finite`` means nothing further will be queried."""

    def __init__(self, name: str, rows: list[dict], cursor: dict | None, fetch: dict | None, meta: dict, finite: bool):
        self.name = name
        self.rows = rows
        self.cursor = cursor
        self.fetch = fetch
        self.meta = dict(meta)
        self.finite = finite
        self.bundle: _Bundle | None = None

    def pages_ended(self) -> bool:
        if self.finite or not isinstance(self.cursor, dict):
            return True
        return bool(self.cursor.get("exhausted"))

    def end_reason(self) -> str | None:
        if not self.pages_ended():
            return None
        if isinstance(self.cursor, dict) and self.cursor.get("exhausted_reason"):
            return str(self.cursor["exhausted_reason"])
        return "end_of_records"

    def stamp(self, meta: dict) -> None:
        self.meta.update(meta)
        for row in self.rows:
            row.update(self.meta)

    def fetch_more(self, count: int) -> int:
        """Append licensed photos. Returns how many were added. One thread, between download windows."""
        if count < 1 or self.finite or not isinstance(self.cursor, dict) or self.cursor.get("exhausted"):
            return 0
        if not isinstance(self.fetch, dict):
            self.cursor["exhausted"] = True
            self.cursor["exhausted_reason"] = self.cursor.get("exhausted_reason") or "end_of_records"
            return 0
        batch, new_cursor = _fetch_licensed(
            self.cursor,
            count,
            int(self.fetch["max_per_occurrence"]),
            int(self.fetch["max_pages"]),
        )
        self.cursor = new_cursor
        if not batch and not self.cursor.get("exhausted"):
            self.cursor["exhausted"] = True
            self.cursor["exhausted_reason"] = self.cursor.get("exhausted_reason") or "end_of_records"
        for row in batch:
            row.update(self.meta)
        self.rows.extend(batch)
        if self.bundle is not None:
            self.bundle.save()
        return len(batch)


class _Bundle:
    def __init__(self, pools: list[_Pool]):
        self.pools = pools
        self.path: Path | None = None
        self.key: str | None = None
        for pool in pools:
            pool.bundle = self

    def attach_cache(self, path: Path, key: str) -> None:
        self.path = path
        self.key = key

    def save(self) -> None:
        if self.path is None or self.key is None:
            return
        payload = {"key": self.key, "pools": [_pool_cache_entry(pool) for pool in self.pools]}
        _atomic_write_text(self.path, json.dumps(payload, ensure_ascii=False))


def _pool_cache_entry(pool: _Pool) -> dict:
    return {
        "name": pool.name,
        "rows": [_cache_row(row) for row in pool.rows],
        "cursor": pool.cursor if isinstance(pool.cursor, dict) else None,
        "fetch": pool.fetch if isinstance(pool.fetch, dict) else None,
        "meta": pool.meta,
        "finite": bool(pool.finite),
    }


def _cache_row(row: dict) -> dict:
    return {key: value for key, value in row.items() if key not in _CACHE_DOWNLOAD_FIELDS}


def _pull_names(
    names: list[str],
    limit: int,
    max_per_occurrence: int,
    max_pages: int,
    seen: set,
) -> _PoolList:
    """Regional countries first, then a country-less search, up to ``limit`` photos.

    ``limit`` is the first margin, not the download cap. The cursor on the
    returned list continues at the next occurrence when a later window needs
    more replacements.
    """
    cursor = _blank_cursor(names, seen)
    fetch = {"max_per_occurrence": int(max_per_occurrence), "max_pages": int(max_pages)}
    rows, cursor = _fetch_licensed(cursor, int(limit), int(max_per_occurrence), int(max_pages))
    pooled = _PoolList(rows)
    pooled.cursor = cursor
    pooled.fetch = fetch
    return pooled


def _live_pool(name: str, rows: list[dict], cursor: dict, fetch: dict, meta: dict) -> _Pool:
    pool = _Pool(name, rows, cursor, fetch, meta, finite=False)
    for row in rows:
        row.update(meta)
    return pool


def collect_class_media(
    species: dict,
    max_per_class: int,
    max_per_occurrence: int,
    max_pages: int,
) -> list[dict]:
    """CC0/CC-BY candidate pool for one label, capped at twice each download cap.

    Photos are still capped per observation. The download cap is how many
    verified files to keep. A later candidate replaces one that fails, and a
    further GBIF page is fetched only when that margin runs out. Taxon caps
    still decide which names are queried. A name with a zero cap is not queried.
    The returned list's ``pools`` attribute is what a live fetch extends.
    """
    pooled = _PoolList()
    pools: list[_Pool] = []
    pooled.pools = pools
    if max_per_class < 1:
        return pooled
    class_id = species["id"]
    sampling = species.get("sampling") or None
    if not sampling:
        names = list(species["gbif_names"])
        pulled = _pull_names(names, _margin_limit(max_per_class), max_per_occurrence, max_pages, set())
        meta = {
            "class_id": class_id,
            "held_out_taxon": False,
            "toxic": species.get("safety_tag") == "toxic",
            "genus_relation": "",
        }
        pool = _live_pool("", list(pulled), pulled.cursor, pulled.fetch, meta)
        pools.append(pool)
        pooled.extend(pool.rows)
        return pooled

    taxa = list(sampling.get("taxa") or [])
    if not taxa:
        held = {str(name) for name in sampling.get("held_out_gbif_names") or []}
        taxa = [
            {"name": str(name), "toxic": False, "held_out": str(name) in held, "relation": ""}
            for name in species["gbif_names"]
        ]
    configured = int(sampling["per_taxon_cap"])
    plan = taxon_fetch_plan(taxa, max_per_class, configured)
    by_name = {str(taxon["name"]): taxon for taxon in taxa}
    for name, cap in plan.items():
        taxon = by_name[name]
        meta = {
            "class_id": class_id,
            "taxon_name": name,
            "held_out_taxon": bool(taxon.get("held_out")),
            "toxic": bool(taxon.get("toxic")),
            "genus_relation": taxon.get("relation") or "",
        }
        if cap < 1:
            pools.append(_Pool(name, [], None, None, meta, finite=True))
            continue
        pulled = _pull_names([name], _margin_limit(cap), max_per_occurrence, max_pages, set())
        pool = _live_pool(name, list(pulled), pulled.cursor, pulled.fetch, meta)
        pools.append(pool)
        pooled.extend(pool.rows)
    return pooled


def _mentions_certificate_failure(value: object) -> bool:
    lowered = str(value).lower()
    return "certificate_verify_failed" in lowered or "certificate verify failed" in lowered


def _is_certificate_failure(error: BaseException) -> bool:
    """Certificate failures are not transient. Other SSL errors still are."""
    if isinstance(error, ssl.SSLCertVerificationError):
        return True
    if _mentions_certificate_failure(error):
        return True
    reason = getattr(error, "reason", None)
    if reason is None:
        return False
    if isinstance(reason, ssl.SSLCertVerificationError):
        return True
    return _mentions_certificate_failure(reason)


def _text_is_transient(text: str) -> bool:
    if _mentions_certificate_failure(text):
        return False
    lowered = text.lower()
    markers = (
        "timed out",
        "timeout",
        "temporary failure in name resolution",
        "name or service not known",
        "nodename nor servname",
        "getaddrinfo",
        "name resolution",
        "connection reset",
        "connection aborted",
        "broken pipe",
        "handshake",
        "ssl",
        "eof occurred",
        "network is unreachable",
        "host is unreachable",
    )
    return any(marker in lowered for marker in markers)


def _reason_is_transient(reason: object) -> bool:
    if reason is None:
        return False
    if isinstance(reason, ssl.SSLCertVerificationError) or _mentions_certificate_failure(reason):
        return False
    if isinstance(reason, str):
        return _text_is_transient(reason)
    if isinstance(
        reason,
        (
            TimeoutError,
            ConnectionResetError,
            BrokenPipeError,
            ConnectionAbortedError,
            ssl.SSLError,
            socket.gaierror,
            http.client.IncompleteRead,
        ),
    ):
        return True
    if isinstance(reason, OSError) and getattr(reason, "errno", None) in _TRANSIENT_ERRNOS:
        return True
    return _text_is_transient(str(reason))


def _is_transient_download_error(error: BaseException) -> bool:
    """DNS, timeout, reset, HTTP 429/5xx, and SSL handshake. Not 403, 404, or a bad certificate."""
    if _is_certificate_failure(error):
        return False
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or 500 <= int(error.code) <= 599
    if isinstance(error, urllib.error.URLError):
        return _reason_is_transient(error.reason)
    return _reason_is_transient(error)


def _with_retry_jitter(base: float) -> float:
    """Backoff or Retry-After, plus a short random offset for the download pool."""
    return base + random.uniform(0.0, DOWNLOAD_JITTER_SECONDS)


def _ensure_truncated_images_rejected() -> None:
    """Pillow must not accept a JPEG whose scan was cut off.

    ``Image.verify()`` can succeed on a file that still fails ``load()``.
    Nothing in this pipeline turns the truncated-image flag on. Force it off
    before every decode so a resumed file is a real image.
    """
    from PIL import ImageFile

    ImageFile.LOAD_TRUNCATED_IMAGES = False
    assert ImageFile.LOAD_TRUNCATED_IMAGES is False


def _is_json_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _full_load_ok(path_str: str) -> bool:
    """True only when Pillow decodes every pixel. Header checks are not enough."""
    _ensure_truncated_images_rejected()
    path = Path(path_str)
    try:
        if not path.is_file() or path.stat().st_size <= 0:
            return False
        from PIL import Image

        with Image.open(path) as image:
            image.load()
        return True
    except Exception:
        return False


def _is_complete_image(path: Path) -> bool:
    """True when a non-empty file survives a full decode.

    A sibling ``*.partial`` file is not this path, so an interrupted write
    cannot be resumed as a finished photo.
    """
    return _full_load_ok(str(path))


def _data_dir_for(destination: Path, data_dir: Path | None) -> Path:
    if data_dir is not None:
        return data_dir.resolve()
    resolved = destination.resolve()
    parts = resolved.parts
    if "images" in parts:
        index = parts.index("images")
        if index > 0:
            return Path(*parts[:index])
    return resolved.parent


class _VerifiedIndex:
    """Size and mtime of files that already survived a full decode."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir.resolve()
        self.path = self.data_dir / "checkpoints" / "verified.jsonl"
        self.entries: dict[str, tuple[int, int]] = {}
        self._lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            text = self.path.read_text(encoding="utf-8")
        except OSError:
            return
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(item, dict):
                continue
            rel = item.get("path")
            size = item.get("size")
            mtime = item.get("mtime_ns")
            if isinstance(rel, str) and _is_json_int(size) and _is_json_int(mtime) and size >= 0 and mtime >= 0:
                self.entries[rel] = (int(size), int(mtime))

    def relative(self, destination: Path) -> str:
        return destination.resolve().relative_to(self.data_dir).as_posix()

    def matches(self, destination: Path) -> bool:
        try:
            stat = destination.stat()
        except OSError:
            return False
        if stat.st_size <= 0:
            return False
        try:
            rel = self.relative(destination)
        except ValueError:
            return False
        with self._lock:
            return self.entries.get(rel) == (stat.st_size, stat.st_mtime_ns)

    def remember(self, destination: Path) -> None:
        stat = destination.stat()
        rel = self.relative(destination)
        line = json.dumps(
            {"path": rel, "size": stat.st_size, "mtime_ns": stat.st_mtime_ns},
            ensure_ascii=False,
        ) + "\n"
        with self._lock:
            self.entries[rel] = (stat.st_size, stat.st_mtime_ns)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(line)
                handle.flush()
                os.fsync(handle.fileno())

    def replace_all(self, rows: list[tuple[str, int, int]]) -> None:
        lines = [
            json.dumps({"path": rel, "size": size, "mtime_ns": mtime}, ensure_ascii=False)
            for rel, size, mtime in sorted(rows)
        ]
        text = ("\n".join(lines) + "\n") if lines else ""
        with self._lock:
            _atomic_write_text(self.path, text)
            self.entries = {rel: (size, mtime) for rel, size, mtime in rows}


_VERIFIED: dict[str, _VerifiedIndex] = {}
_VERIFIED_LOCK = threading.Lock()


def _verified_index(data_dir: Path) -> _VerifiedIndex:
    key = str(data_dir.resolve())
    with _VERIFIED_LOCK:
        index = _VERIFIED.get(key)
        if index is None:
            index = _VerifiedIndex(data_dir)
            _VERIFIED[key] = index
        return index


def _quarantine_file(data_dir: Path, destination: Path) -> Path:
    """Move a file that failed a full decode. The bytes are kept."""
    index = _verified_index(data_dir)
    try:
        rel = index.relative(destination)
    except ValueError:
        rel = destination.name
    parts = rel.split("/")
    if len(parts) >= 3 and parts[0] == "images":
        class_id = parts[1]
        name = parts[-1]
    else:
        class_id = "_loose"
        name = destination.name
    folder = data_dir / "quarantine" / class_id
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / name
    if target.exists():
        stamp = time.time_ns()
        target = folder / f"{Path(name).stem}-{stamp}{Path(name).suffix}"
    os.replace(destination, target)
    with index._lock:
        index.entries.pop(rel, None)
    return target


def _semaphore_for_host(url: str) -> threading.BoundedSemaphore:
    host = urllib.parse.urlsplit(url).netloc.lower() or "unknown"
    with _HOST_SEMAPHORES_LOCK:
        semaphore = _HOST_SEMAPHORES.get(host)
        if semaphore is None:
            semaphore = threading.BoundedSemaphore(MAX_DOWNLOADS_PER_HOST)
            _HOST_SEMAPHORES[host] = semaphore
        return semaphore


def _atomic_write_bytes(destination: Path, payload: bytes) -> None:
    partial = destination.with_name(destination.name + ".partial")
    try:
        with partial.open("wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(partial, destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


class _RejectedImage(RuntimeError):
    """A finished response that is not a usable photo. Not retried."""


class _TruncatedTransfer(OSError):
    """The body ended early. Retried once, as a dropped connection."""


def _decode_image_bytes(payload: bytes) -> None:
    """Full-decode bytes before they are stored. Truncated JPEGs do not pass."""
    _ensure_truncated_images_rejected()
    from PIL import Image

    try:
        with Image.open(io.BytesIO(payload)) as image:
            image.load()
    except Exception as error:
        if "truncated" in str(error).lower():
            raise _TruncatedTransfer(str(error)) from error
        raise _RejectedImage(f"image did not decode ({error})") from error


def _download_once(url: str, destination: Path, timeout: int) -> int:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    semaphore = _semaphore_for_host(url)
    semaphore.acquire()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if content_type and not content_type.startswith("image/"):
                raise RuntimeError(f"not an image ({content_type})")
            payload = response.read(MAX_IMAGE_BYTES + 1)
    finally:
        semaphore.release()
    if len(payload) < 5_000:
        raise RuntimeError(f"image too small ({len(payload)} bytes)")
    if len(payload) > MAX_IMAGE_BYTES:
        raise _RejectedImage(f"image too large ({len(payload)} bytes)")
    _decode_image_bytes(payload)
    _atomic_write_bytes(destination, payload)
    return len(payload)


def download_image(
    url: str,
    destination: Path,
    timeout: int = 40,
    *,
    resume: bool = True,
    attempts: int = DOWNLOAD_ATTEMPTS,
    data_dir: Path | None = None,
) -> int:
    """Download one photo. A verified image already at `destination` is skipped.

    Bytes land in a temporary file in the same directory and are renamed into
    place. The bytes are decoded in memory first. HTTP 429 honors Retry-After
    plus a short random offset. Other transient errors use exponential backoff
    with the same offset. HTTP 403, 404, certificate errors, and undecodable
    bodies are not retried. A truncated body is retried once.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    root = _data_dir_for(destination, data_dir)
    index = _verified_index(root)
    partial = destination.with_name(destination.name + ".partial")
    if resume and destination.is_file():
        if index.matches(destination):
            partial.unlink(missing_ok=True)
            return destination.stat().st_size
        if _full_load_ok(str(destination)):
            index.remember(destination)
            partial.unlink(missing_ok=True)
            return destination.stat().st_size
        _quarantine_file(root, destination)
    if attempts < 1:
        raise ValueError("attempts must be positive")
    delay = DOWNLOAD_BACKOFF_SECONDS
    last_error: Exception | None = None
    truncated_retries = 0
    for attempt in range(attempts):
        try:
            size = _download_once(url, destination, timeout)
        except _TruncatedTransfer as error:
            last_error = error
            if truncated_retries >= 1 or attempt + 1 >= attempts:
                raise
            truncated_retries += 1
            time.sleep(_with_retry_jitter(delay))
            delay *= 2
            continue
        except Exception as error:
            last_error = error
            retry_after = None
            if isinstance(error, urllib.error.HTTPError):
                if error.code == 429:
                    retry_after = _retry_after_seconds(error)
                _close_http_error(error)
            if attempt + 1 >= attempts or not _is_transient_download_error(error):
                raise
            base = delay if retry_after is None else retry_after
            time.sleep(_with_retry_jitter(base))
            delay *= 2
            continue
        try:
            index.remember(destination)
        except OSError:
            pass
        return size
    assert last_error is not None
    raise last_error


def _taxon_report_row(name: str, cap: int, stats: dict, class_id: str, gbif_key: object) -> dict:
    """One fetch-report row. ``accepted`` is verified files, not licensed URLs.

    ``gbif_licensed_count`` is the entire licensed GBIF pool. It is written
    only when that query really ended (no more records, or ``--max-pages``)
    and ``accepted`` is still below the cap. ``exhausted_reason`` says which.
    A download failure leaves ``accepted`` below that count. ``selected`` =
    ``accepted`` + the failed-reason counts. ``pool_exhausted`` on this row
    is this taxon's query, not a sibling taxon's.
    """
    item = {"taxon": name, "accepted": stats["accepted"], "cap": cap, "class_id": class_id}
    if gbif_key is not None:
        item["gbif_key"] = gbif_key
    item["selected"] = stats["selected"]
    item["failed"] = stats["failed"]
    item["pool"] = stats["pool"]
    item["shortfall"] = stats["shortfall"]
    item["pool_exhausted"] = stats["pool_exhausted"]
    if stats.get("exhausted_reason"):
        item["exhausted_reason"] = stats["exhausted_reason"]
    if stats.get("gbif_licensed_count") is not None:
        item["gbif_licensed_count"] = stats["gbif_licensed_count"]
    return item


def suffix_for(url: str) -> str:
    path = urllib.parse.urlparse(url).path.lower()
    for suffix in (".jpg", ".jpeg", ".png", ".webp"):
        if path.endswith(suffix):
            return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def _jsonl(rows: list[dict]) -> str:
    return "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)


def _report_payload(
    per_class: dict[str, dict],
    probe_report: list[dict],
    taxon_report: list[dict],
    max_per_occurrence: int,
) -> dict:
    return {
        "classes": per_class,
        "thin_classes": thin_class_report(per_class),
        "toxic_probes": probe_report,
        "taxa": taxon_report,
        "max_per_occurrence": max_per_occurrence,
        "note": _FETCH_NOTE,
    }


def _report_text(report: dict) -> str:
    return json.dumps(report, indent=2, ensure_ascii=False) + "\n"


def _write_outputs(
    directory: Path,
    rows: list[dict],
    per_class: dict[str, dict],
    probe_report: list[dict],
    taxon_report: list[dict],
    max_per_occurrence: int,
) -> dict:
    """Rewrite the attribution and report files in request order.

    The same bytes are written after each class and again at the end of a
    finished run. Nothing in either file depends on which download finished first.
    Per-class checkpoint files are not written: nothing read them.
    """
    report = _report_payload(per_class, probe_report, taxon_report, max_per_occurrence)
    _atomic_write_text(directory / "attributions.jsonl", _jsonl(rows))
    _atomic_write_text(directory / "fetch_report.json", _report_text(report))
    return report


def _policy_hash() -> str:
    """Hash the licence filter and the sampling rules that choose rows."""
    digest = hashlib.sha256()
    root = Path(__file__).resolve().parent
    for name in ("licenses.py", "sampling.py"):
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        digest.update((root / name).read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _row_license_allowed(row: dict) -> bool:
    """Re-apply the current CC0/CC-BY filter to one cached media row."""
    raw = row.get("license")
    normalized = normalize_cc_license(raw if isinstance(raw, str) else None)
    if normalized is None:
        return False
    row["license_normalized"] = normalized
    return True


def _cache_file(directory: Path, kind: str, identity: str, key: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", identity).strip("._") or "item"
    return directory / "gbif_cache" / f"{kind}-{safe[:60]}-{key[:20]}.json"


def _query_cache_key(kind: str, identity: str, parameters: dict) -> str:
    payload = {
        "v": _QUERY_CACHE_VERSION,
        "kind": kind,
        "identity": identity,
        "parameters": parameters,
        "policy": _policy_hash(),
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _cache_identity_prefix(kind: str, identity: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", identity).strip("._") or "item"
    return f"{kind}-{safe[:60]}-"


def _drop_stale_cache_files(directory: Path, kind: str, identity: str, keep: Path) -> None:
    """Delete other cache files for this class or probe, including version 1 and 2."""
    folder = directory / "gbif_cache"
    if not folder.is_dir():
        return
    prefix = _cache_identity_prefix(kind, identity)
    keep_resolved = keep.resolve()
    for path in folder.glob(prefix + "*.json"):
        try:
            if path.resolve() == keep_resolved:
                continue
            path.unlink(missing_ok=True)
        except OSError:
            continue


def _pool_from_cache_entry(item: dict) -> _Pool | None:
    rows = item.get("rows")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        return None
    kept = [row for row in rows if _row_license_allowed(row)]
    cursor = item.get("cursor") if isinstance(item.get("cursor"), dict) else None
    fetch = item.get("fetch") if isinstance(item.get("fetch"), dict) else None
    meta = item.get("meta") if isinstance(item.get("meta"), dict) else {}
    finite = bool(item.get("finite")) or cursor is None
    return _Pool(str(item.get("name") or ""), kept, cursor, fetch, meta, finite)


def _read_bundle(path: Path, key: str) -> _Bundle | None:
    if not path.is_file():
        return None
    try:
        if path.stat().st_size <= 0:
            return None
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or payload.get("key") != key:
        return None
    pools_payload = payload.get("pools")
    if isinstance(pools_payload, list):
        pools = []
        for item in pools_payload:
            if not isinstance(item, dict):
                return None
            pool = _pool_from_cache_entry(item)
            if pool is None:
                return None
            pools.append(pool)
        return _Bundle(pools)
    rows = payload.get("rows")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        return None
    pool = _pool_from_cache_entry({"name": "", "rows": rows, "finite": True, "meta": {}})
    if pool is None:
        return None
    return _Bundle([pool])


def _finite_bundle(rows: list[dict], targets: list[tuple[str, int, list[dict]]]) -> _Bundle:
    """A mocked or hand-written list is the whole pool: nothing further is queried."""
    pools = [
        _Pool(name, list(group), None, None, {}, finite=True) for name, _cap, group in targets
    ]
    if not pools:
        pools = [_Pool("", [row for row in rows if isinstance(row, dict)], None, None, {}, finite=True)]
    return _Bundle(pools)


def _bundle_from_produced(produced, split_finite) -> _Bundle:
    pools = getattr(produced, "pools", None)
    if pools:
        return _Bundle(list(pools))
    cursor = getattr(produced, "cursor", None)
    fetch = getattr(produced, "fetch", None)
    if isinstance(cursor, dict) and isinstance(fetch, dict):
        pool = _Pool("", list(produced), cursor, fetch, {}, finite=False)
        return _Bundle([pool])
    return split_finite(list(produced))


def _cached_media(directory: Path, kind: str, identity: str, parameters: dict, produce, split_finite) -> _Bundle:
    """Reuse GBIF rows and, for a live query, the cursor. Download fields are not stored."""
    key = _query_cache_key(kind, identity, parameters)
    path = _cache_file(directory, kind, identity, key)
    loaded = _read_bundle(path, key)
    if loaded is not None:
        loaded.attach_cache(path, key)
        _drop_stale_cache_files(directory, kind, identity, path)
        return loaded
    bundle = _bundle_from_produced(produce(), split_finite)
    bundle.attach_cache(path, key)
    bundle.save()
    _drop_stale_cache_files(directory, kind, identity, path)
    return bundle


def _destination_for(directory: Path, relative: str) -> Path:
    return directory.joinpath(*relative.split("/"))


def _attach_file(row: dict, folder: str) -> Path:
    filename = f"{row['occurrence_key']}_{row['media_index']}{suffix_for(row['image_url'])}"
    relative = Path("images") / folder / filename
    row["file"] = str(relative).replace("\\", "/")
    row["source"] = "gbif"
    row["downloaded"] = False
    return relative


def _failure_reason(error: BaseException) -> str:
    """Stable bucket for one candidate that will not be retried."""
    if isinstance(error, _RejectedImage):
        text = str(error).lower()
        if "too large" in text:
            return "too_large"
        return "undecodable"
    if isinstance(error, _TruncatedTransfer):
        return "truncated"
    if isinstance(error, urllib.error.HTTPError):
        return f"http_{int(error.code)}"
    if _is_certificate_failure(error):
        return "ssl_certificate"
    text = str(error).lower()
    if "too large" in text:
        return "too_large"
    if "too small" in text or "not an image" in text:
        return "undecodable"
    reason = getattr(error, "reason", None)
    blob = f"{error} {reason}".lower()
    if "timed out" in blob or "timeout" in blob:
        return "timeout"
    if isinstance(reason, ssl.SSLError) or "ssl" in blob:
        return "ssl"
    if isinstance(reason, socket.gaierror) or "name resolution" in blob or "getaddrinfo" in blob:
        return "dns"
    return "other"


def _accept_row(row: dict, size: int) -> None:
    row["bytes"] = int(size)
    row["downloaded"] = True
    row.pop("download_error", None)
    row.pop("_failure_reason", None)
    row.pop("_image_rejected", None)


def _download_rows(media: list[dict], *, directory: Path, resume: bool, workers: int) -> None:
    """Download in place. Completion order does not change `media` order."""

    def fetch(row: dict) -> None:
        destination = _destination_for(directory, row["file"])
        try:
            size = download_image(row["image_url"], destination, resume=resume, data_dir=directory)
        except Exception as error:  # noqa: BLE001 — keep the crawl going
            if isinstance(error, (_RejectedImage, _TruncatedTransfer)):
                row["_image_rejected"] = True
            row["_failure_reason"] = _failure_reason(error)
            row["download_error"] = str(error)
            row["downloaded"] = False
            with _PRINT_LOCK:
                print(f"  skip {row['image_url']}: {error}", file=sys.stderr)
            return
        _accept_row(row, size)

    if workers <= 1 or len(media) <= 1:
        for row in media:
            fetch(row)
        return
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(fetch, row) for row in media]
        for future in futures:
            future.result()


def _existing_verified(directory: Path, row: dict) -> bool:
    """True when this candidate's file is already on disk and decodes."""
    destination = _destination_for(directory, row["file"])
    if not destination.is_file():
        return False
    index = _verified_index(directory)
    if index.matches(destination):
        return True
    if _full_load_ok(str(destination)):
        try:
            index.remember(destination)
        except OSError:
            pass
        return True
    return False


def _outcome_stats(
    kept: list[dict],
    attempted: list[dict],
    pool_len: int,
    cap: int,
    *,
    dry_run: bool,
    no_more_pages: bool,
    exhausted_reason: str | None,
) -> dict:
    """Counts that add up: selected = accepted + failed reasons.

    ``accepted`` is verified files (or, in a dry run, the candidates that would
    be written). ``shortfall``, ``pool_exhausted``, and ``gbif_licensed_count``
    are set only when the GBIF query has really ended below the cap.
    """
    if dry_run:
        accepted = len(kept)
        failed: dict[str, int] = {}
        selected = len(attempted)
    else:
        failed_counts: Counter[str] = Counter()
        accepted = 0
        for row in attempted:
            if row.get("downloaded") is True:
                accepted += 1
                continue
            failed_counts[str(row.get("_failure_reason") or "other")] += 1
        failed = {key: failed_counts[key] for key in sorted(failed_counts)}
        selected = len(attempted)
    if selected != accepted + sum(failed.values()):
        raise RuntimeError(
            f"fetch counts do not add up: selected {selected}, accepted {accepted}, failed {failed}"
        )
    exhausted = bool(no_more_pages) and accepted < cap
    reason = None
    if exhausted:
        reason = exhausted_reason or "end_of_records"
    return {
        "accepted": accepted,
        "selected": selected,
        "failed": failed,
        "pool": pool_len,
        "shortfall": (cap - accepted) if exhausted else 0,
        "pool_exhausted": exhausted,
        "exhausted_reason": reason,
        "gbif_licensed_count": pool_len if exhausted else None,
    }


def _combine_stats(parts: list[dict]) -> dict:
    failed: Counter[str] = Counter()
    for part in parts:
        failed.update(part["failed"])
    accepted = sum(int(part["accepted"]) for part in parts)
    selected = sum(int(part["selected"]) for part in parts)
    combined_failed = {key: failed[key] for key in sorted(failed)}
    if selected != accepted + sum(combined_failed.values()):
        raise RuntimeError(
            f"fetch counts do not add up: selected {selected}, accepted {accepted}, failed {combined_failed}"
        )
    shortfall = sum(int(part["shortfall"]) for part in parts)
    reasons = [str(part["exhausted_reason"]) for part in parts if part.get("pool_exhausted") and part.get("exhausted_reason")]
    if any(reason == "max_pages" for reason in reasons):
        reason = "max_pages"
    elif reasons:
        reason = "end_of_records"
    else:
        reason = None
    return {
        "accepted": accepted,
        "selected": selected,
        "failed": combined_failed,
        "pool": sum(int(part["pool"]) for part in parts),
        "shortfall": shortfall,
        "any_taxon_pool_exhausted": any(bool(part["pool_exhausted"]) for part in parts),
        "exhausted_reason": reason,
    }


def _download_targets(species: dict, media: list[dict], class_cap: int) -> list[tuple[str, int, list[dict]]]:
    """Per-taxon pools and download caps. A species class is one pool."""
    sampling = species.get("sampling") or {}
    planned = list(sampling.get("taxa") or [])
    if not planned:
        return [("", class_cap, media)]
    plan = taxon_fetch_plan(planned, class_cap, int(sampling["per_taxon_cap"]))
    grouped: dict[str, list[dict]] = {name: [] for name in plan}
    for row in media:
        name = str(row.get("taxon_name") or row.get("queried_name") or "")
        if name in grouped:
            grouped[name].append(row)
    return [(name, plan[name], grouped[name]) for name in plan]


def _fill_to_cap(
    pool: _Pool,
    cap: int,
    *,
    folder: str,
    directory: Path,
    dry_run: bool,
    resume: bool,
    workers: int,
) -> tuple[list[dict], list[dict]]:
    """Keep the first `cap` successes in pool order.

    Every run starts at the first candidate. A window is exactly the number of
    slots still open. Workers download that window together, then the next
    window is chosen on this thread. The set of files does not depend on which
    transfer finishes first. A file that already verifies counts as accepted
    and is not downloaded again. A failed candidate in the prefix is tried
    again. When the rows on hand run out, one more GBIF batch is fetched
    before the next window.
    """
    media = pool.rows
    for row in media:
        _attach_file(row, folder)
    if cap < 1:
        return [], []
    if dry_run:
        kept = list(media[:cap])
        return kept, list(kept)

    def verified(row: dict) -> bool:
        return bool(resume) and _existing_verified(directory, row)

    kept: list[dict] = []
    attempted: list[dict] = []
    cursor = 0
    while len(kept) < cap:
        if cursor >= len(media):
            added = pool.fetch_more(cap - len(kept))
            if added:
                for row in media[len(media) - added :]:
                    _attach_file(row, folder)
            if cursor >= len(media):
                break
        need = cap - len(kept)
        window = media[cursor : cursor + need]
        if not window:
            break
        cursor += len(window)
        attempted.extend(window)
        pending = []
        for row in window:
            if verified(row):
                destination = _destination_for(directory, row["file"])
                _accept_row(row, destination.stat().st_size)
            else:
                pending.append(row)
        if pending:
            _download_rows(pending, directory=directory, resume=resume, workers=workers)
        for row in window:
            if row.get("downloaded") is True:
                kept.append(row)
    return kept, attempted


def _store_media(
    media: list[dict],
    *,
    folder: str,
    directory: Path,
    dry_run: bool,
    resume: bool,
    workers: int,
) -> list[dict]:
    for row in media:
        _attach_file(row, folder)
    if dry_run:
        return list(media)
    _download_rows(media, directory=directory, resume=resume, workers=workers)
    return [row for row in media if row.get("downloaded") is True]


def _part_caps(species: dict, class_cap: int) -> dict[str, int]:
    sampling = species.get("sampling") or {}
    planned = list(sampling.get("taxa") or [])
    if not planned:
        return {"": class_cap}
    return taxon_fetch_plan(planned, class_cap, int(sampling["per_taxon_cap"]))


def _stats_for(pool: _Pool, kept: list[dict], attempted: list[dict], cap: int, *, dry_run: bool) -> dict:
    ran_out = len(kept) < cap
    return _outcome_stats(
        kept,
        attempted,
        len(pool.rows),
        cap,
        dry_run=dry_run,
        no_more_pages=ran_out,
        exhausted_reason=pool.end_reason() if ran_out else None,
    )


def _class_report_entry(kept: list[dict], stats: dict, cap: int, min_before_global: int) -> dict:
    regional = sum(1 for row in kept if row.get("region_scope") == "central_europe")
    taxa = sorted({str(row.get("taxon_name") or row.get("queried_name") or "") for row in kept})
    accepted = int(stats["accepted"])
    entry = {
        "accepted": accepted,
        "regional": regional,
        "global_fill": accepted - regional,
        "cap": cap,
        "taxa_with_photos": len([name for name in taxa if name]),
        "held_out_photos": sum(1 for row in kept if row.get("held_out_taxon")),
        "below_regional_minimum": regional < min_before_global,
        "selected": stats["selected"],
        "failed": stats["failed"],
        "pool": stats["pool"],
        "shortfall": stats["shortfall"],
        "any_taxon_pool_exhausted": bool(stats["any_taxon_pool_exhausted"]),
    }
    if stats.get("exhausted_reason"):
        entry["exhausted_reason"] = stats["exhausted_reason"]
    return entry


def run_fetch(
    manifest: dict,
    *,
    max_per_class: int | None = None,
    min_before_global: int = 40,
    max_per_occurrence: int = MAX_PER_OCCURRENCE,
    max_pages: int = 40,
    only: str = "",
    dry_run: bool = False,
    resume: bool = True,
    download_workers: int = 16,
    data_dir: Path | None = None,
) -> None:
    """Collect a licensed candidate pool and download until each cap is filled."""
    _ensure_truncated_images_rejected()
    if download_workers < 1:
        raise ValueError("download-workers must be at least 1")
    wanted = {item.strip() for item in only.split(",") if item.strip()}
    directory = data_dir or DATA_DIR
    directory.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    per_class: dict[str, dict] = {}
    taxon_report: list[dict] = []
    probe_report: list[dict] = []

    touched_folders: set[str] = set()
    for species in manifest["classes"]:
        if wanted and species["id"] not in wanted:
            continue
        cap = class_fetch_cap(species, max_per_class)
        touched_folders.add(str(species["id"]))
        print(f"fetch {species['id']} (cap {cap}, {max_per_occurrence} photos/occurrence)")
        bundle = _cached_media(
            directory,
            "class",
            str(species["id"]),
            {
                "max_per_occurrence": max_per_occurrence,
                "max_pages": max_pages,
                "gbif_names": list(species.get("gbif_names") or []),
                "sampling": species.get("sampling"),
                "safety_tag": species.get("safety_tag"),
            },
            lambda species=species, cap=cap: collect_class_media(species, cap, max_per_occurrence, max_pages),
            lambda rows, species=species, cap=cap: _finite_bundle(rows, _download_targets(species, rows, cap)),
        )
        part_caps = _part_caps(species, cap)
        kept_parts: list[dict] = []
        part_stats: list[dict] = []
        for pool in bundle.pools:
            part_cap = part_caps.get(pool.name, 0)
            kept, attempted = _fill_to_cap(
                pool,
                part_cap,
                folder=species["id"],
                directory=directory,
                dry_run=dry_run,
                resume=resume,
                workers=download_workers,
            )
            stats = _stats_for(pool, kept, attempted, part_cap, dry_run=dry_run)
            kept_parts.extend(kept)
            part_stats.append(stats)
            if pool.name:
                sampling = species.get("sampling") or {}
                planned = list(sampling.get("taxa") or [])
                keys = {str(taxon["name"]): taxon.get("gbif_key") for taxon in planned}
                taxon_report.append(_taxon_report_row(pool.name, part_cap, stats, species["id"], keys.get(pool.name)))
        kept = kept_parts
        if part_stats:
            class_stats = _combine_stats(part_stats)
        else:
            class_stats = _outcome_stats(
                [],
                [],
                0,
                cap,
                dry_run=dry_run,
                no_more_pages=True,
                exhausted_reason="end_of_records",
            )
            class_stats["any_taxon_pool_exhausted"] = bool(class_stats["pool_exhausted"])
        per_class[species["id"]] = _class_report_entry(kept, class_stats, cap, min_before_global)
        entry = per_class[species["id"]]
        print(
            f"  accepted media: {entry['accepted']} "
            f"(regional {entry['regional']}, global {entry['global_fill']}, "
            f"taxa {entry['taxa_with_photos']}, shortfall {entry['shortfall']})"
        )
        rows.extend(kept)
        _write_outputs(
            directory,
            rows,
            per_class,
            probe_report,
            taxon_report,
            max_per_occurrence,
        )

    probes = manifest.get("toxic_probes") or {}
    fetch_probes = not wanted or "unknown_mushroom" in wanted or "toxic_probes" in wanted
    probe_folder = str(probes.get("class_id") or "unknown_mushroom")
    if fetch_probes:
        touched_folders.add(probe_folder)
        cap = int(probes.get("per_taxon_cap") or 80)
        if max_per_class is not None:
            cap = min(cap, max_per_class)
        for taxon in probes.get("taxa") or []:
            name = str(taxon["name"])
            print(f"fetch toxic probe {name} (cap {cap}, test only)")
            probe_meta = {
                "class_id": probe_folder,
                "taxon_name": name,
                "held_out_taxon": True,
                "toxic": True,
                "genus_relation": taxon.get("relation") or "",
                "probe": True,
            }
            bundle = _cached_media(
                directory,
                "probe",
                name,
                {
                    "max_per_occurrence": max_per_occurrence,
                    "max_pages": max_pages,
                    "name": name,
                    "gbif_key": taxon.get("gbif_key"),
                    "relation": taxon.get("relation") or "",
                },
                lambda name=name: _pull_names(
                    [name],
                    _margin_limit(cap),
                    max_per_occurrence,
                    max_pages,
                    set(),
                ),
                lambda rows: _finite_bundle(rows, [("", 0, list(rows))]),
            )
            pool = bundle.pools[0] if bundle.pools else _Pool("", [], None, None, {}, finite=True)
            pool.stamp(probe_meta)
            kept, attempted = _fill_to_cap(
                pool,
                cap,
                folder=probe_folder,
                directory=directory,
                dry_run=dry_run,
                resume=resume,
                workers=download_workers,
            )
            stats = _stats_for(pool, kept, attempted, cap, dry_run=dry_run)
            rows.extend(kept)
            probe_row = _taxon_report_row(name, cap, stats, probe_folder, taxon.get("gbif_key"))
            probe_report.append(probe_row)
            taxon_report.append(probe_row)
            print(f"  accepted probe media: {stats['accepted']} (shortfall {stats['shortfall']})")
            _write_outputs(
                directory,
                rows,
                per_class,
                probe_report,
                taxon_report,
                max_per_occurrence,
            )

    report = _write_outputs(directory, rows, per_class, probe_report, taxon_report, max_per_occurrence)
    kept_files = {str(row["file"]).replace("\\", "/") for row in rows if isinstance(row.get("file"), str)}
    _move_unselected_images(directory, kept_files, touched_folders)
    attribution_path = directory / "attributions.jsonl"
    print(f"wrote {len(rows)} rows to {attribution_path}")
    for item in report["thin_classes"]:
        print(f"  thin {item['class_id']}: {item['accepted']} accepted", file=sys.stderr)


def _probe_existing(path_str: str) -> tuple[str, bool, int, int]:
    """Full-decode one file. Used by the process pool, so it stays picklable."""
    try:
        path = Path(path_str)
        stat = path.stat()
        ok = _full_load_ok(path_str)
        return path_str, ok, int(stat.st_size), int(stat.st_mtime_ns)
    except Exception:
        return path_str, False, 0, 0


def _move_unselected_images(directory: Path, kept_files: set[str], folders: set[str]) -> None:
    """Move photos in this run's class folders that have no attribution row.

    Quarantine is unchanged. These files are previous selections that a later
    successful retry pushed past the cap. ``images/<class>/`` then matches the
    attribution rows for that class.
    """
    images = directory / "images"
    if not images.is_dir() or not folders:
        return
    index = _verified_index(directory)
    moved: list[str] = []
    for path in _iter_stored_images(images):
        try:
            rel = path.resolve().relative_to(directory.resolve()).as_posix()
        except ValueError:
            continue
        parts = rel.split("/")
        class_id = parts[1] if len(parts) >= 3 and parts[0] == "images" else ""
        if class_id not in folders or rel in kept_files:
            continue
        destination_dir = directory / "not_selected" / class_id
        destination_dir.mkdir(parents=True, exist_ok=True)
        target = destination_dir / path.name
        if target.exists():
            stamp = time.time_ns()
            target = destination_dir / f"{path.stem}-{stamp}{path.suffix}"
        os.replace(path, target)
        moved.append(rel)
    if not moved:
        return
    with index._lock:
        for rel in moved:
            index.entries.pop(rel, None)
        snapshot = [(rel, size, mtime) for rel, (size, mtime) in index.entries.items()]
    index.replace_all(snapshot)


def _iter_stored_images(images_root: Path) -> list[Path]:
    if not images_root.is_dir():
        return []
    found: list[Path] = []
    for path in images_root.rglob("*"):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.name.endswith((".partial", ".tmp")):
            continue
        found.append(path)
    found.sort()
    return found


def _map_image_probes(paths: list[str], workers: int) -> list[tuple[str, bool, int, int]]:
    if workers <= 1 or len(paths) <= 1:
        return [_probe_existing(path) for path in paths]
    try:
        import multiprocessing

        context = multiprocessing.get_context("spawn")
        with ProcessPoolExecutor(max_workers=workers, mp_context=context) as pool:
            return list(pool.map(_probe_existing, paths))
    except (PermissionError, OSError, NotImplementedError, BrokenProcessPool) as error:
        print(
            f"warning: process pool unavailable ({error}); verifying images with threads",
            file=sys.stderr,
        )
        with ThreadPoolExecutor(max_workers=workers) as pool:
            return list(pool.map(_probe_existing, paths))


def _drop_quarantined_attributions(data_dir: Path, quarantined: set[str]) -> int:
    """Remove attribution rows whose file was quarantined. Order of the rest stays."""
    path = data_dir / "attributions.jsonl"
    if not path.is_file():
        print("dropped 0 attribution rows")
        return 0
    original = path.read_text(encoding="utf-8")
    kept: list[str] = []
    dropped = 0
    for line in original.splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            kept.append(line)
            continue
        file_name = ""
        if isinstance(row, dict) and isinstance(row.get("file"), str):
            file_name = row["file"].replace("\\", "/")
        if file_name and file_name in quarantined:
            dropped += 1
            continue
        kept.append(line)
    if dropped:
        text = ("\n".join(kept) + "\n") if kept else ""
        _atomic_write_text(path, text)
    print(f"dropped {dropped} attribution rows")
    return dropped


def verify_existing_images(data_dir: Path, *, workers: int | None = None) -> dict[str, dict[str, int]]:
    """Full-load every stored photo, quarantine failures, and rewrite the sidecar.

    No network. Counts are ``ok`` and ``quarantined`` per class directory under
    ``images/``. Attribution rows for quarantined files are removed in their
    original order. A spawn process pool does the decode. If that pool cannot
    start, or a worker breaks it (``BrokenProcessPool``), the same work runs
    on threads.
    """
    _ensure_truncated_images_rejected()
    root = data_dir.resolve()
    files = _iter_stored_images(root / "images")
    if workers is None:
        worker_count = os.cpu_count() or 1
    else:
        worker_count = workers
    worker_count = max(1, worker_count)
    if files:
        worker_count = min(worker_count, len(files))
    results = _map_image_probes([str(path) for path in files], worker_count)
    index = _verified_index(root)
    counts: dict[str, dict[str, int]] = {}
    verified_rows: list[tuple[str, int, int]] = []
    quarantined: set[str] = set()
    for path_str, ok, size, mtime in results:
        path = Path(path_str)
        try:
            rel = index.relative(path)
        except ValueError:
            rel = path.name
        parts = rel.split("/")
        class_id = parts[1] if len(parts) >= 3 and parts[0] == "images" else "_loose"
        slot = counts.setdefault(class_id, {"ok": 0, "quarantined": 0})
        if ok and path.is_file():
            slot["ok"] += 1
            verified_rows.append((rel, size, mtime))
            continue
        slot["quarantined"] += 1
        quarantined.add(rel)
        if path.is_file():
            _quarantine_file(root, path)
    index.replace_all(verified_rows)
    for class_id in sorted(counts):
        item = counts[class_id]
        print(f"{class_id}: ok {item['ok']}, quarantined {item['quarantined']}")
    ok_total = sum(item["ok"] for item in counts.values())
    bad_total = sum(item["quarantined"] for item in counts.values())
    print(f"verified {ok_total}, quarantined {bad_total}")
    _drop_quarantined_attributions(root, quarantined)
    return counts


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fetch CC0/CC-BY mushroom photos from GBIF")
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=None,
        help="Cap for every selected class. Default is 500 for species and the class_cap in labels.json for aggregate classes.",
    )
    parser.add_argument(
        "--min-before-global",
        type=int,
        default=40,
        help="Reported when a class has fewer regional photos than this. Global fill still runs up to the class cap.",
    )
    parser.add_argument("--max-per-occurrence", type=int, default=MAX_PER_OCCURRENCE)
    parser.add_argument("--max-pages", type=int, default=40)
    parser.add_argument("--only", default="", help="Comma-separated class ids")
    parser.add_argument("--dry-run", action="store_true", help="Write attributions but do not download bytes")
    parser.add_argument(
        "--download-workers",
        type=int,
        default=16,
        help="Parallel image downloads per class or probe batch. At most 4 run per image host. GBIF API calls stay sequential.",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="Download again even when a complete image is already on disk.",
    )
    parser.add_argument(
        "--verify-existing",
        action="store_true",
        help="Full-decode training/data/images with no network, quarantine broken files, and rewrite checkpoints/verified.jsonl.",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.download_workers < 1:
        parser.error("--download-workers must be at least 1")
    if args.verify_existing:
        verify_existing_images(DATA_DIR)
        return
    manifest = load_manifest(LABELS_PATH)
    run_fetch(
        manifest,
        max_per_class=args.max_per_class,
        min_before_global=args.min_before_global,
        max_per_occurrence=args.max_per_occurrence,
        max_pages=args.max_pages,
        only=args.only,
        dry_run=args.dry_run,
        resume=not args.no_resume,
        download_workers=args.download_workers,
    )


if __name__ == "__main__":
    main()
