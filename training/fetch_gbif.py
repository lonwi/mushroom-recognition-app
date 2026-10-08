"""Download GBIF still images whose own media license is CC0 or CC-BY.

Usage (from the repo root):

    python training/fetch_gbif.py --dry-run --only amanita_phalloides --max-per-class 5
    python training/fetch_gbif.py --only amanita_phalloides --max-per-class 20

A file that is already a complete image is skipped unless ``--no-resume`` is set.
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
import json
import os
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
from concurrent.futures import ThreadPoolExecutor
from datetime import timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from licenses import accepted_media_records
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
MAX_RETRY_AFTER_SECONDS = 120.0
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


def _text_is_transient(text: str) -> bool:
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
    """DNS, timeout, reset, HTTP 429/5xx, and SSL handshake. Not 403 or 404."""
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or 500 <= int(error.code) <= 599
    if isinstance(error, urllib.error.URLError):
        return _reason_is_transient(error.reason)
    return _reason_is_transient(error)


def _has_image_magic(path: Path) -> bool:
    try:
        with path.open("rb") as handle:
            header = handle.read(16)
    except OSError:
        return False
    if header.startswith((b"\xff\xd8", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a")):
        return True
    return len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP"


def _is_complete_image(path: Path) -> bool:
    """True when the file is a non-empty image Pillow can verify.

    A sibling ``*.partial`` file is not this path, so an interrupted write
    cannot be resumed as a finished photo. Truncated bytes fail verify.
    """
    try:
        if not path.is_file() or path.stat().st_size <= 0:
            return False
    except OSError:
        return False
    try:
        from PIL import Image
    except ImportError:
        return _has_image_magic(path)
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


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


def _download_once(url: str, destination: Path, timeout: int) -> int:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    semaphore = _semaphore_for_host(url)
    semaphore.acquire()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if content_type and not content_type.startswith("image/"):
                raise RuntimeError(f"not an image ({content_type})")
            payload = response.read(16_000_000)
    finally:
        semaphore.release()
    if len(payload) < 5_000:
        raise RuntimeError(f"image too small ({len(payload)} bytes)")
    _atomic_write_bytes(destination, payload)
    return len(payload)


def download_image(
    url: str,
    destination: Path,
    timeout: int = 40,
    *,
    resume: bool = True,
    attempts: int = DOWNLOAD_ATTEMPTS,
) -> int:
    """Download one photo. A complete image already at `destination` is skipped.

    Bytes land in a temporary file in the same directory and are renamed into
    place. HTTP 429 honors Retry-After. Other transient errors use a short
    exponential backoff. HTTP 403 and 404 are not retried.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + ".partial")
    if resume and _is_complete_image(destination):
        partial.unlink(missing_ok=True)
        return destination.stat().st_size
    if attempts < 1:
        raise ValueError("attempts must be positive")
    delay = DOWNLOAD_BACKOFF_SECONDS
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return _download_once(url, destination, timeout)
        except Exception as error:
            last_error = error
            retry_after = None
            if isinstance(error, urllib.error.HTTPError):
                if error.code == 429:
                    retry_after = _retry_after_seconds(error)
                _close_http_error(error)
            if attempt + 1 >= attempts or not _is_transient_download_error(error):
                raise
            time.sleep(delay if retry_after is None else retry_after)
            delay *= 2
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


def _checkpoint_name(label: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", label).strip("._") or "item"
    return safe[:80]


def _write_outputs(
    directory: Path,
    rows: list[dict],
    per_class: dict[str, dict],
    probe_report: list[dict],
    taxon_report: list[dict],
    max_per_occurrence: int,
    *,
    unit: str | None = None,
    unit_rows: list[dict] | None = None,
) -> dict:
    """Rewrite the attribution and report files in request order.

    The same bytes are written after each class and again at the end of a
    finished run. Nothing in either file depends on which download finished first.
    """
    report = _report_payload(per_class, probe_report, taxon_report, max_per_occurrence)
    if unit is not None:
        _atomic_write_text(directory / "checkpoints" / f"{unit}.jsonl", _jsonl(unit_rows or []))
    _atomic_write_text(directory / "attributions.jsonl", _jsonl(rows))
    _atomic_write_text(directory / "fetch_report.json", _report_text(report))
    return report


def _cache_file(directory: Path, kind: str, identity: str, key: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", identity).strip("._") or "item"
    return directory / "gbif_cache" / f"{kind}-{safe[:60]}-{key[:20]}.json"


def _query_cache_key(kind: str, identity: str, parameters: dict) -> str:
    payload = {"v": _QUERY_CACHE_VERSION, "kind": kind, "identity": identity, "parameters": parameters}
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
        return loaded
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
            row["bytes"] = download_image(row["image_url"], destination, resume=resume)
            row["downloaded"] = True
        except Exception as error:  # noqa: BLE001 — keep the crawl going
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
        regional = sum(1 for row in media if row.get("region_scope") == "central_europe")
        taxa = sorted({row.get("taxon_name") or row.get("queried_name") or "" for row in media})
        per_class[species["id"]] = {
            "accepted": len(media),
            "regional": regional,
            "global_fill": len(media) - regional,
            "cap": cap,
            "taxa_with_photos": len([name for name in taxa if name]),
            "held_out_photos": sum(1 for row in media if row.get("held_out_taxon")),
            "below_regional_minimum": regional < min_before_global,
        }
        print(
            f"  accepted media: {len(media)} "
            f"(regional {regional}, global {len(media) - regional}, taxa {per_class[species['id']]['taxa_with_photos']})"
        )
        sampling = species.get("sampling") or {}
        planned = list(sampling.get("taxa") or [])
        if planned:
            plan = taxon_fetch_plan(planned, cap, int(sampling["per_taxon_cap"]))
            taxon_report.extend(
                taxon_acceptance_rows(
                    list(plan.items()),
                    media,
                    species["id"],
                    {str(taxon["name"]): taxon.get("gbif_key") for taxon in planned},
                )
            )
        kept = _store_media(
            media,
            folder=species["id"],
            directory=directory,
            dry_run=dry_run,
            resume=resume,
            workers=download_workers,
        )
        rows.extend(kept)
        _write_outputs(
            directory,
            rows,
            per_class,
            probe_report,
            taxon_report,
            max_per_occurrence,
            unit=_checkpoint_name(str(species["id"])),
            unit_rows=kept,
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
            rows.extend(kept)
            probe_row = {"taxon": name, "accepted": len(media), "cap": cap, "gbif_key": taxon.get("gbif_key")}
            if len(media) < cap:
                probe_row["gbif_licensed_count"] = len(media)
            probe_report.append(probe_row)
            taxon_report.append(probe_row)
            print(f"  accepted probe media: {len(media)}")
            _write_outputs(
                directory,
                rows,
                per_class,
                probe_report,
                taxon_report,
                max_per_occurrence,
                unit=_checkpoint_name(f"probe-{name}"),
                unit_rows=kept,
            )

    report = _write_outputs(directory, rows, per_class, probe_report, taxon_report, max_per_occurrence)
    attribution_path = directory / "attributions.jsonl"
    print(f"wrote {len(rows)} rows to {attribution_path}")
    for item in report["thin_classes"]:
        print(f"  thin {item['class_id']}: {item['accepted']} accepted", file=sys.stderr)


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
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.download_workers < 1:
        parser.error("--download-workers must be at least 1")
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
