"""Download GBIF still images whose own media license is CC0 or CC-BY.

Usage (from the repo root):

    python training/fetch_gbif.py --dry-run --only amanita_phalloides --max-per-class 5

Images and attributions land in training/data/, which is gitignored.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from licenses import accepted_media_records
from manifest import CENTRAL_EUROPE, LABELS_PATH, ROOT, load_manifest

USER_AGENT = "GrzybobranieAI-training/1.0 (open-license photos only; CC0 and CC-BY)"
DATA_DIR = ROOT / "training" / "data"
GBIF_SEARCH = "https://api.gbif.org/v1/occurrence/search"
GBIF_MATCH = "https://api.gbif.org/v1/species/match"


def _get_json(url: str, timeout: int = 60, attempts: int = 4) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    delay = 1.0
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code not in (429, 500, 502, 503, 504):
                raise
        except urllib.error.URLError as error:
            last_error = error
        time.sleep(delay)
        delay *= 2
    raise RuntimeError(f"GBIF request failed: {url}") from last_error


def resolve_accepted_keys(names: list[str]) -> dict[int, str]:
    """Map accepted GBIF usage keys to the scientific name we asked for."""
    keys: dict[int, str] = {}
    for name in names:
        query = urllib.parse.urlencode({"name": name, "strict": "true"})
        payload = _get_json(f"{GBIF_MATCH}?{query}")
        match_type = payload.get("matchType")
        if match_type != "EXACT":
            print(f"skip non-exact GBIF match for {name}: {match_type}", file=sys.stderr)
            continue
        usage = payload.get("acceptedUsageKey") or payload.get("usageKey")
        if not usage:
            print(f"no GBIF usage key for {name}", file=sys.stderr)
            continue
        keys[int(usage)] = name
        time.sleep(0.2)
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
        time.sleep(0.25)


def collect_class_media(
    class_id: str,
    names: list[str],
    max_per_class: int,
    min_before_global: int,
    max_pages: int,
) -> list[dict]:
    keys = resolve_accepted_keys(names)
    if not keys:
        print(f"no accepted GBIF keys for {class_id}", file=sys.stderr)
        return []
    seen_occurrences: set[int] = set()
    accepted: list[dict] = []

    def take(country: str | None, scope: str) -> None:
        if len(accepted) >= max_per_class:
            return
        for taxon_key in keys:
            if len(accepted) >= max_per_class:
                return
            for occurrence in iter_occurrences(taxon_key, country, max_pages):
                occurrence_key = occurrence.get("key")
                if occurrence_key in seen_occurrences:
                    continue
                media_rows = accepted_media_records(occurrence)
                if not media_rows:
                    continue
                seen_occurrences.add(occurrence_key)
                for row in media_rows:
                    if len(accepted) >= max_per_class:
                        return
                    row["class_id"] = class_id
                    row["region_scope"] = scope
                    row["queried_name"] = keys[taxon_key]
                    accepted.append(row)

    for country in CENTRAL_EUROPE:
        take(country, "central_europe")
        if len(accepted) >= max_per_class:
            break
    if len(accepted) < min_before_global:
        take(None, "global_fill")
    return accepted


def download_image(url: str, destination: Path, timeout: int = 40) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        if content_type and not content_type.startswith("image/"):
            raise RuntimeError(f"not an image ({content_type})")
        payload = response.read(16_000_000)
    if len(payload) < 5_000:
        raise RuntimeError(f"image too small ({len(payload)} bytes)")
    destination.write_bytes(payload)
    return len(payload)


def suffix_for(url: str) -> str:
    path = urllib.parse.urlparse(url).path.lower()
    for suffix in (".jpg", ".jpeg", ".png", ".webp"):
        if path.endswith(suffix):
            return ".jpg" if suffix == ".jpeg" else suffix
    return ".jpg"


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch CC0/CC-BY mushroom photos from GBIF")
    parser.add_argument("--max-per-class", type=int, default=150)
    parser.add_argument("--min-before-global", type=int, default=40)
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--only", default="", help="Comma-separated class ids")
    parser.add_argument("--dry-run", action="store_true", help="Write attributions but do not download bytes")
    args = parser.parse_args()

    manifest = load_manifest(LABELS_PATH)
    wanted = {item.strip() for item in args.only.split(",") if item.strip()}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    attribution_path = DATA_DIR / "attributions.jsonl"
    rows: list[dict] = []

    for species in manifest["classes"]:
        if wanted and species["id"] not in wanted:
            continue
        print(f"fetch {species['id']}")
        media = collect_class_media(
            species["id"],
            species["gbif_names"],
            args.max_per_class,
            args.min_before_global,
            args.max_pages,
        )
        print(f"  accepted media: {len(media)}")
        for row in media:
            filename = f"{row['occurrence_key']}_{row['media_index']}{suffix_for(row['image_url'])}"
            relative = Path("images") / species["id"] / filename
            row["file"] = str(relative).replace("\\", "/")
            row["source"] = "gbif"
            row["downloaded"] = False
            if not args.dry_run:
                destination = DATA_DIR / relative
                try:
                    row["bytes"] = download_image(row["image_url"], destination)
                    row["downloaded"] = True
                except Exception as error:  # noqa: BLE001 — keep the crawl going
                    row["download_error"] = str(error)
                    print(f"  skip {row['image_url']}: {error}", file=sys.stderr)
                    continue
            rows.append(row)

    with attribution_path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"wrote {len(rows)} rows to {attribution_path}")


if __name__ == "__main__":
    main()
