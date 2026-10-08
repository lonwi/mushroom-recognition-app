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
from collections import Counter
import urllib.error
import urllib.parse
import urllib.request
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
            time.sleep(0.2)
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
        time.sleep(0.25)


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


def main() -> None:
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
    args = parser.parse_args()

    manifest = load_manifest(LABELS_PATH)
    wanted = {item.strip() for item in args.only.split(",") if item.strip()}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    attribution_path = DATA_DIR / "attributions.jsonl"
    rows: list[dict] = []
    per_class: dict[str, dict] = {}
    taxon_report: list[dict] = []

    for species in manifest["classes"]:
        if wanted and species["id"] not in wanted:
            continue
        cap = class_fetch_cap(species, args.max_per_class)
        print(f"fetch {species['id']} (cap {cap}, {args.max_per_occurrence} photos/occurrence)")
        media = collect_class_media(species, cap, args.max_per_occurrence, args.max_pages)
        regional = sum(1 for row in media if row.get("region_scope") == "central_europe")
        taxa = sorted({row.get("taxon_name") or row.get("queried_name") or "" for row in media})
        per_class[species["id"]] = {
            "accepted": len(media),
            "regional": regional,
            "global_fill": len(media) - regional,
            "cap": cap,
            "taxa_with_photos": len([name for name in taxa if name]),
            "held_out_photos": sum(1 for row in media if row.get("held_out_taxon")),
            "below_regional_minimum": regional < args.min_before_global,
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

    probes = manifest.get("toxic_probes") or {}
    fetch_probes = not wanted or "unknown_mushroom" in wanted or "toxic_probes" in wanted
    probe_report = []
    if fetch_probes:
        cap = int(probes.get("per_taxon_cap") or 80)
        if args.max_per_class is not None:
            cap = min(cap, args.max_per_class)
        for taxon in probes.get("taxa") or []:
            name = str(taxon["name"])
            print(f"fetch toxic probe {name} (cap {cap}, test only)")
            media = _pull_names([name], cap, args.max_per_occurrence, args.max_pages, set())
            for row in media:
                row["class_id"] = probes.get("class_id") or "unknown_mushroom"
                row["taxon_name"] = name
                row["held_out_taxon"] = True
                row["toxic"] = True
                row["genus_relation"] = taxon.get("relation") or ""
                row["probe"] = True
                filename = f"{row['occurrence_key']}_{row['media_index']}{suffix_for(row['image_url'])}"
                relative = Path("images") / "unknown_mushroom" / filename
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
            probe_row = {"taxon": name, "accepted": len(media), "cap": cap, "gbif_key": taxon.get("gbif_key")}
            if len(media) < cap:
                probe_row["gbif_licensed_count"] = len(media)
            probe_report.append(probe_row)
            taxon_report.append(probe_row)
            print(f"  accepted probe media: {len(media)}")

    with attribution_path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    report = {
        "classes": per_class,
        "thin_classes": thin_class_report(per_class),
        "toxic_probes": probe_report,
        "taxa": taxon_report,
        "max_per_occurrence": args.max_per_occurrence,
        "note": (
            "Global fill runs after the Central European countries until the class cap. "
            "It is not limited to classes below --min-before-global. "
            "Cortinarius orellanus, Cortinarius rubellus, and Amanita virosa stay thin when CC0/CC-BY media is scarce."
        ),
    }
    report_path = DATA_DIR / "fetch_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(rows)} rows to {attribution_path}")
    for item in report["thin_classes"]:
        print(f"  thin {item['class_id']}: {item['accepted']} accepted", file=sys.stderr)


if __name__ == "__main__":
    main()
