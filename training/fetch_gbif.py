"""Download GBIF still images whose own media license is CC0 or CC-BY.

Usage (from the repo root):

    python training/fetch_gbif.py --dry-run --only amanita_phalloides --max-per-class 5
    python training/fetch_gbif.py --only amanita_phalloides --max-per-class 20

A file already listed in checkpoints/verified.jsonl with the same size and
mtime is skipped. Any other existing file must decode with a full Pillow
``load()``, and ``LOAD_TRUNCATED_IMAGES`` stays false. A file that fails is
moved to quarantine/<class>/ and downloaded again. A new download is decoded
in memory before it is written. ``--no-resume`` downloads again anyway.
``--verify-existing`` scans data/images with no network.

``--download-workers`` (default 16) fetches one class or probe at a time, with at
most 4 transfers per image host. GBIF API calls stay one at a time. Images and
attributions land in training/data/, which is gitignored. An interrupted run
keeps finished classes in attributions.jsonl and fetch_report.json.
"""

from __future__ import annotations

import argparse
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
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from licenses import accepted_media_records, normalize_cc_license
from manifest import CENTRAL_EUROPE, LABELS_PATH, ROOT, load_manifest
from sampling import (
    MAX_PER_OCCURRENCE,
    class_fetch_cap,
    collect_licensed_media,
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
_QUERY_CACHE_VERSION = 1

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
            "limit": "300",
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


def _pull_names(
    names: list[str],
    cap: int,
    max_per_occurrence: int,
    max_pages: int,
    seen: set,
) -> list[dict]:
    """Regional countries first, then a country-less search until `cap`."""
    keys = resolve_accepted_keys(names)
    if not keys:
        return []
    accepted: list[dict] = []

    def pull(country: str | None, scope: str) -> None:
        if len(accepted) >= cap:
            return
        for taxon_key, queried_name in keys.items():
            if len(accepted) >= cap:
                return
            batch = collect_licensed_media(
                iter_occurrences(taxon_key, country, max_pages),
                max_items=cap - len(accepted),
                max_per_occurrence=max_per_occurrence,
                seen=seen,
                accept_media=accepted_media_records,
            )
            for row in batch:
                row["region_scope"] = scope
                row["queried_name"] = queried_name
                row["taxon_name"] = queried_name
            accepted.extend(batch)

    for country in CENTRAL_EUROPE:
        pull(country, "central_europe")
        if len(accepted) >= cap:
            break
    if len(accepted) < cap:
        pull(None, "global_fill")
    return accepted


def collect_class_media(
    species: dict,
    max_per_class: int,
    max_per_occurrence: int,
    max_pages: int,
) -> list[dict]:
    """CC0/CC-BY photos for one label, capped per observation and per taxon."""
    class_id = species["id"]
    sampling = species.get("sampling") or None
    if not sampling:
        seen: set = set()
        rows = _pull_names(list(species["gbif_names"]), max_per_class, max_per_occurrence, max_pages, seen)
        toxic = species.get("safety_tag") == "toxic"
        for row in rows:
            row["class_id"] = class_id
            row["held_out_taxon"] = False
            row["toxic"] = toxic
            row["genus_relation"] = ""
        return rows

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
    buckets: dict[str, list[dict]] = {name: [] for name in by_name}
    seen_by_name = {name: set() for name in by_name}

    def pull(name: str, cap: int) -> None:
        have = len(buckets[name])
        if have >= cap or cap < 1:
            return
        taxon = by_name[name]
        rows = _pull_names([name], cap - have, max_per_occurrence, max_pages, seen_by_name[name])
        for row in rows:
            row["class_id"] = class_id
            row["taxon_name"] = name
            row["held_out_taxon"] = bool(taxon.get("held_out"))
            row["toxic"] = bool(taxon.get("toxic"))
            row["genus_relation"] = taxon.get("relation") or ""
        buckets[name].extend(rows)

    for name, cap in plan.items():
        pull(name, cap)
    return [row for name in by_name for row in buckets[name]]


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


def taxon_acceptance_rows(names_and_caps: list[tuple[str, int]], media: list[dict], class_id: str, keys: dict[str, object]) -> list[dict]:
    """One fetch-report row per taxon. Licensed count is set only when accepted < cap."""
    counts = Counter(str(row.get("taxon_name") or "") for row in media)
    report = []
    for name, cap in names_and_caps:
        accepted = int(counts.get(name) or 0)
        item = {"taxon": name, "accepted": accepted, "cap": cap, "class_id": class_id}
        if name in keys and keys[name] is not None:
            item["gbif_key"] = keys[name]
        if accepted < cap:
            item["gbif_licensed_count"] = accepted
        report.append(item)
    return report


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


def _read_query_cache(path: Path, key: str) -> list[dict] | None:
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
    rows = payload.get("rows")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        return None
    return rows


def _cached_media(directory: Path, kind: str, identity: str, parameters: dict, produce) -> list[dict]:
    """Reuse a finished GBIF media list. The file is written before download fields are added."""
    key = _query_cache_key(kind, identity, parameters)
    path = _cache_file(directory, kind, identity, key)
    loaded = _read_query_cache(path, key)
    if loaded is not None:
        return [row for row in loaded if _row_license_allowed(row)]
    rows = produce()
    _atomic_write_text(path, json.dumps({"key": key, "rows": rows}, ensure_ascii=False))
    return rows


def _destination_for(directory: Path, relative: str) -> Path:
    return directory.joinpath(*relative.split("/"))


def _attach_file(row: dict, folder: str) -> Path:
    filename = f"{row['occurrence_key']}_{row['media_index']}{suffix_for(row['image_url'])}"
    relative = Path("images") / folder / filename
    row["file"] = str(relative).replace("\\", "/")
    row["source"] = "gbif"
    row["downloaded"] = False
    return relative


def _download_rows(media: list[dict], *, directory: Path, resume: bool, workers: int) -> None:
    """Download in place. Completion order does not change `media` order."""

    def fetch(row: dict) -> None:
        destination = _destination_for(directory, row["file"])
        try:
            row["bytes"] = download_image(row["image_url"], destination, resume=resume, data_dir=directory)
            row["downloaded"] = True
        except Exception as error:  # noqa: BLE001 — keep the crawl going
            if isinstance(error, (_RejectedImage, _TruncatedTransfer)):
                row["_image_rejected"] = True
            row["download_error"] = str(error)
            with _PRINT_LOCK:
                print(f"  skip {row['image_url']}: {error}", file=sys.stderr)

    if workers <= 1 or len(media) <= 1:
        for row in media:
            fetch(row)
        return
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(fetch, row) for row in media]
        for future in futures:
            future.result()


def _countable_media(media: list[dict]) -> list[dict]:
    """Licensed rows that were not rejected as an undecodable or oversized body."""
    return [row for row in media if not row.get("_image_rejected")]


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
    """Collect licensed media and download it. Selection rules are unchanged."""
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

    for species in manifest["classes"]:
        if wanted and species["id"] not in wanted:
            continue
        cap = class_fetch_cap(species, max_per_class)
        print(f"fetch {species['id']} (cap {cap}, {max_per_occurrence} photos/occurrence)")
        media = _cached_media(
            directory,
            "class",
            str(species["id"]),
            {
                "cap": cap,
                "max_per_occurrence": max_per_occurrence,
                "max_pages": max_pages,
                "gbif_names": list(species.get("gbif_names") or []),
                "sampling": species.get("sampling"),
                "safety_tag": species.get("safety_tag"),
            },
            lambda species=species, cap=cap: collect_class_media(species, cap, max_per_occurrence, max_pages),
        )
        kept = _store_media(
            media,
            folder=species["id"],
            directory=directory,
            dry_run=dry_run,
            resume=resume,
            workers=download_workers,
        )
        counted = _countable_media(media)
        regional = sum(1 for row in counted if row.get("region_scope") == "central_europe")
        taxa = sorted({row.get("taxon_name") or row.get("queried_name") or "" for row in counted})
        per_class[species["id"]] = {
            "accepted": len(counted),
            "regional": regional,
            "global_fill": len(counted) - regional,
            "cap": cap,
            "taxa_with_photos": len([name for name in taxa if name]),
            "held_out_photos": sum(1 for row in counted if row.get("held_out_taxon")),
            "below_regional_minimum": regional < min_before_global,
        }
        print(
            f"  accepted media: {len(counted)} "
            f"(regional {regional}, global {len(counted) - regional}, taxa {per_class[species['id']]['taxa_with_photos']})"
        )
        sampling = species.get("sampling") or {}
        planned = list(sampling.get("taxa") or [])
        if planned:
            plan = taxon_fetch_plan(planned, cap, int(sampling["per_taxon_cap"]))
            taxon_report.extend(
                taxon_acceptance_rows(
                    list(plan.items()),
                    counted,
                    species["id"],
                    {str(taxon["name"]): taxon.get("gbif_key") for taxon in planned},
                )
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
    if fetch_probes:
        cap = int(probes.get("per_taxon_cap") or 80)
        if max_per_class is not None:
            cap = min(cap, max_per_class)
        for taxon in probes.get("taxa") or []:
            name = str(taxon["name"])
            print(f"fetch toxic probe {name} (cap {cap}, test only)")
            media = _cached_media(
                directory,
                "probe",
                name,
                {
                    "cap": cap,
                    "max_per_occurrence": max_per_occurrence,
                    "max_pages": max_pages,
                    "name": name,
                    "gbif_key": taxon.get("gbif_key"),
                    "relation": taxon.get("relation") or "",
                },
                lambda name=name, cap=cap: _pull_names([name], cap, max_per_occurrence, max_pages, set()),
            )
            for row in media:
                row["class_id"] = probes.get("class_id") or "unknown_mushroom"
                row["taxon_name"] = name
                row["held_out_taxon"] = True
                row["toxic"] = True
                row["genus_relation"] = taxon.get("relation") or ""
                row["probe"] = True
            kept = _store_media(
                media,
                folder="unknown_mushroom",
                directory=directory,
                dry_run=dry_run,
                resume=resume,
                workers=download_workers,
            )
            counted = _countable_media(media)
            rows.extend(kept)
            probe_row = {"taxon": name, "accepted": len(counted), "cap": cap, "gbif_key": taxon.get("gbif_key")}
            if len(counted) < cap:
                probe_row["gbif_licensed_count"] = len(counted)
            probe_report.append(probe_row)
            taxon_report.append(probe_row)
            print(f"  accepted probe media: {len(counted)}")
            _write_outputs(
                directory,
                rows,
                per_class,
                probe_report,
                taxon_report,
                max_per_occurrence,
            )

    report = _write_outputs(directory, rows, per_class, probe_report, taxon_report, max_per_occurrence)
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
    import multiprocessing

    context = multiprocessing.get_context("spawn")
    with ProcessPoolExecutor(max_workers=workers, mp_context=context) as pool:
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
    original order.
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
