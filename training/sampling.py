"""How many photos each class, taxon, and GBIF observation may contribute.

Species classes share one cap across synonyms. Aggregate classes
(`unknown_mushroom`, `not_a_mushroom`) cap each GBIF name on its own and
keep a fixed set of names out of train and val.

Regional occurrences are taken first. Global occurrences then fill until
the class cap. They are not stopped at a small regional minimum.
"""

from __future__ import annotations

SPECIES_CLASS_CAP = 500
MAX_PER_OCCURRENCE = 2
AGGREGATE_CLASS_IDS = ("unknown_mushroom", "not_a_mushroom")
THIN_CLASS_IDS = ("cortinarius_orellanus", "cortinarius_rubellus", "amanita_virosa")
# Photos to request for each poisonous held-out taxon. This is headroom above
# the 50-image floor: near-duplicate removal often drops a 50-photo fetch
# under the floor. The ship gate does not read this number.
TOXIC_HELDOUT_FETCH = 80


def spread_per_taxon(class_cap: int, taxon_count: int, configured_cap: int) -> int:
    """Images to request from every taxon before a top-up pass.

    The cap is shared so a long taxon list cannot be filled by the first few
    names. A tiny class cap (a smoke run) yields one image per taxon until
    the cap is spent.
    """
    if class_cap < 1 or taxon_count < 1 or configured_cap < 1:
        raise ValueError("caps must be positive")
    if class_cap < taxon_count:
        return 1
    return max(1, min(configured_cap, class_cap // taxon_count))


def collect_licensed_media(
    occurrences,
    *,
    max_items: int,
    max_per_occurrence: int,
    seen: set,
    accept_media,
) -> list[dict]:
    """Take up to `max_per_occurrence` licensed photos from each new occurrence."""
    if max_items < 1 or max_per_occurrence < 1:
        return []
    accepted: list[dict] = []
    for occurrence in occurrences:
        if len(accepted) >= max_items:
            break
        occurrence_key = occurrence.get("key")
        if occurrence_key in seen:
            continue
        media_rows = list(accept_media(occurrence))
        if not media_rows:
            continue
        seen.add(occurrence_key)
        room = max_items - len(accepted)
        accepted.extend(media_rows[: min(max_per_occurrence, room)])
    return accepted


def fill_regional_then_global(
    regional_batches: list,
    global_batch,
    *,
    max_items: int,
    max_per_occurrence: int,
    accept_media,
) -> list[dict]:
    """Regional photos first, then global photos until `max_items`.

    A regional count above the old minimum (and still below the cap) does
    not stop the global pass.
    """
    seen: set = set()
    accepted: list[dict] = []
    for batch in regional_batches:
        if len(accepted) >= max_items:
            break
        accepted.extend(
            collect_licensed_media(
                batch,
                max_items=max_items - len(accepted),
                max_per_occurrence=max_per_occurrence,
                seen=seen,
                accept_media=accept_media,
            )
        )
    if len(accepted) < max_items:
        accepted.extend(
            collect_licensed_media(
                global_batch,
                max_items=max_items - len(accepted),
                max_per_occurrence=max_per_occurrence,
                seen=seen,
                accept_media=accept_media,
            )
        )
    return accepted


def taxon_fetch_plan(taxa: list[dict], class_cap: int, per_taxon_cap: int) -> dict[str, int]:
    """How many photos to request from each aggregate taxon.

    Poisonous held-out taxa are filled toward `TOXIC_HELDOUT_FETCH` before
    the other names share what remains of the class cap. A smoke override
    with a tiny class cap still stops at that cap. The 50-image floor is a
    ship gate, not this request size.
    """
    if class_cap < 1 or per_taxon_cap < 1:
        raise ValueError("caps must be positive")
    remaining = class_cap
    plan: dict[str, int] = {str(taxon["name"]): 0 for taxon in taxa}
    priority = [taxon for taxon in taxa if taxon.get("toxic") and taxon.get("held_out")]
    rest = [taxon for taxon in taxa if not (taxon.get("toxic") and taxon.get("held_out"))]
    for taxon in priority:
        if remaining < 1:
            break
        ask = min(per_taxon_cap, TOXIC_HELDOUT_FETCH, remaining)
        plan[str(taxon["name"])] = ask
        remaining -= ask
    if rest and remaining > 0:
        each = spread_per_taxon(remaining, len(rest), per_taxon_cap)
        for taxon in rest:
            if remaining < 1:
                break
            ask = min(each, per_taxon_cap, remaining)
            plan[str(taxon["name"])] = ask
            remaining -= ask
        for taxon in rest:
            if remaining < 1:
                break
            name = str(taxon["name"])
            room = min(per_taxon_cap, plan[name] + remaining) - plan[name]
            if room < 1:
                continue
            plan[name] += room
            remaining -= room
    return plan


def class_fetch_cap(species: dict, override: int | None) -> int:
    """Explicit `--max-per-class` wins, including on aggregate classes."""
    if override is not None:
        if override < 1:
            raise ValueError("max-per-class must be positive")
        return override
    sampling = species.get("sampling")
    if sampling:
        return int(sampling["class_cap"])
    return SPECIES_CLASS_CAP


def thin_class_report(counts: dict[str, dict]) -> list[dict]:
    """Cortinarius orellanus, C. rubellus, and Amanita virosa are often short.

    Classes that this run did not fetch are omitted. A zero is a real count
    from a fetch, not a stand-in for "we did not look".
    """
    notes = []
    for class_id in THIN_CLASS_IDS:
        if class_id not in counts:
            continue
        accepted = int((counts.get(class_id) or {}).get("accepted") or 0)
        notes.append(
            {
                "class_id": class_id,
                "accepted": accepted,
                "below_species_train_floor": accepted < 40,
                "note": (
                    "CC0/CC-BY photos of this species are scarce on GBIF. "
                    "The fetch reports the count and does not invent images."
                ),
            }
        )
    return notes
