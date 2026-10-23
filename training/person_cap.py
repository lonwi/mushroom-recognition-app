"""Cap how many rows one person can contribute to one class.

Prepare calls this after every source has been merged and after both dedup
passes, and before the split. The three numbers are pending Wojtek's
confirmation. Do not change them here until that decision is recorded.

The person is ``split.person_identity_keys``. This module calls that
function. It does not parse author strings itself, and it does not write a
person key back onto the row, so co-collector links in the split stay as
they are.

Which rows survive is a seeded round-robin over observations: one photo
from each observation, in stable-hash order, before a second photo from
any observation. ``PERSON_CAP_SEED`` is not the split salt. Changing the
salt does not change this selection.

This step does not change how many photos one observation may contribute
when the person is inside the cap. The GBIF fetch still stops at
``sampling.MAX_PER_OCCURRENCE`` (2). Distinct photos of one observation
still survive identity dedup. Round-robin only chooses among a person's
rows when that person is over the cap.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict

from split import observation_identity_keys, person_identity_keys, photo_identity_keys

# Pending owner confirmation. A higher ceiling or fraction lets one person
# contribute more rows. Do not change these until Wojtek confirms the limit.
CAP_MAX = 60
CAP_MIN = 10
CAP_FRACTION = 0.10
# Not the split salt. The same seed keeps the same rows.
PERSON_CAP_SEED = 42
# Report key only. It is not written onto the row and it does not link components.
MISSING_PERSON_KEY = "none"
FORMULA = "min(CAP_MAX, max(CAP_MIN, round(CAP_FRACTION * N)))"
N_DEFINITION = (
    "N is the number of rows of one class still eligible for training after "
    "every source has been merged and after both dedup passes (identity, then "
    "perceptual hash), and before this cap. Rows skipped before dedup (not "
    "downloaded, unverified, DF20 left out, training_only under "
    "--publishable-only, missing file, corrupt) are not in N. The 224px PNG "
    "cache runs after the cap and can still drop a kept row; that drop does "
    "not change N or the cap. A person's rows in other classes are not added "
    "to N."
)
MISSING_PERSON_RULE = (
    "person_identity_keys is the split's photographer key. An empty list "
    "does not skip the cap: those rows share the sentinel person key "
    '"none" for this cap only. The sentinel is not written onto the row and '
    "is not an identity key, so placeholder authors stay unlinked in the "
    "split. A row whose key cannot be computed (the call fails, or the "
    "result is not a list of non-empty strings) is removed and reported as "
    "person_key_error. It still counts toward N. It does not take a slot in "
    "the sentinel."
)


def person_row_cap(n: int) -> int:
    """How many rows one person may keep in a class of ``n`` eligible rows.

    ``round`` is the built-in round (half to even), the same function the
    split uses when it turns a ratio into a count.
    """
    if isinstance(n, bool) or not isinstance(n, int) or n < 0:
        raise ValueError("N must be a non-negative int")
    return min(CAP_MAX, max(CAP_MIN, round(CAP_FRACTION * n)))


def _rank(seed: int, *parts: str) -> str:
    payload = "\n".join((str(seed), *parts)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _row_stable_id(row: dict) -> str:
    photos = photo_identity_keys(row)
    if photos:
        return "\x1e".join(photos)
    for field in ("file", "image_url", "identifier", "sha256"):
        value = row.get(field)
        if isinstance(value, str) and value.strip():
            return f"{field}:{value.strip()}"
    payload = json.dumps(row, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _person_keys(record: dict) -> tuple[list[str] | None, bool]:
    """Split person keys, and whether the key could not be computed.

    ``None`` with failed False is a computed empty key (no photographer).
    ``None`` with failed True is removed rather than passed through.
    """
    try:
        keys = person_identity_keys(record)
    except Exception:
        return None, True
    if not isinstance(keys, list) or any(not isinstance(key, str) or not key for key in keys):
        return None, True
    unique = list(dict.fromkeys(keys))
    if not unique:
        return None, False
    return unique, False


def _group_observations(indexed: list[tuple[int, dict]]) -> list[tuple[str, list[tuple[int, dict]]]]:
    """Group one person's rows by the split's observation keys.

    The group id is the sorted keys, not the input position, so a shuffle
    does not change which observation is visited first. A row with no
    observation key is its own group. A failure while reading observation
    keys leaves that row as its own group; the row is still capped.
    """
    count = len(indexed)
    parent = list(range(count))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        ra, rb = find(left), find(right)
        if ra != rb:
            parent[rb] = ra

    owner: dict[str, int] = {}
    per_row: list[list[str]] = []
    for local, (_index, row) in enumerate(indexed):
        try:
            found = observation_identity_keys(row)
        except Exception:
            found = []
        if not isinstance(found, list):
            found = []
        keys = list(dict.fromkeys(key for key in found if isinstance(key, str) and key))
        per_row.append(keys)
        for key in keys:
            previous = owner.get(key)
            if previous is None:
                owner[key] = local
            else:
                union(local, previous)

    members: dict[int, list[int]] = defaultdict(list)
    keysets: dict[int, set[str]] = defaultdict(set)
    for local in range(count):
        root = find(local)
        members[root].append(local)
        keysets[root].update(per_row[local])

    groups: list[tuple[str, list[tuple[int, dict]]]] = []
    for root, locals_ in members.items():
        rows = [indexed[local] for local in locals_]
        if keysets[root]:
            obs_id = "\x1e".join(sorted(keysets[root]))
        else:
            obs_id = "solo:" + _row_stable_id(rows[0][1])
        groups.append((obs_id, rows))
    return groups


def _select_indexes(
    indexed: list[tuple[int, dict]],
    cap: int,
    seed: int,
    class_id: str,
    person_key: str,
) -> set[int]:
    """Round-robin over observations ordered by a stable hash of the seed."""
    if len(indexed) <= cap:
        return {index for index, _row in indexed}
    groups = _group_observations(indexed)
    groups.sort(key=lambda item: (_rank(seed, class_id, person_key, "obs", item[0]), item[0]))
    ordered: list[list[tuple[int, dict]]] = []
    for obs_id, rows in groups:
        rows_sorted = sorted(
            rows,
            key=lambda item: (
                _rank(seed, class_id, person_key, "row", obs_id, _row_stable_id(item[1])),
                item[0],
            ),
        )
        ordered.append(rows_sorted)
    chosen: list[int] = []
    depth = 0
    while len(chosen) < cap:
        progressed = False
        for rows_sorted in ordered:
            if depth >= len(rows_sorted):
                continue
            chosen.append(rows_sorted[depth][0])
            progressed = True
            if len(chosen) >= cap:
                break
        if not progressed:
            break
        depth += 1
    return set(chosen)


def _class_id(record: object) -> str:
    if isinstance(record, dict):
        return str(record.get("class_id") or "")
    return ""


def apply_person_class_cap(
    records: list[dict],
    *,
    seed: int = PERSON_CAP_SEED,
) -> tuple[list[dict], list[dict], dict]:
    """Drop rows that put one person over the cap in a class.

    Returns kept rows in input order (the same objects), removed copies,
    and the report. The input list and the kept dicts are not modified.
    Removed copies are not written back to the source files.
    """
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise ValueError("person cap seed must be an int")

    by_class: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for index, record in enumerate(records):
        by_class[_class_id(record)].append((index, record if isinstance(record, dict) else {}))

    kept_indexes: set[int] = set()
    removed_by_index: dict[int, dict] = {}
    removed_counts: Counter[tuple[str, str, str]] = Counter()
    class_info: list[dict] = []
    key_errors = 0

    for class_id in sorted(by_class):
        items = by_class[class_id]
        n = len(items)
        cap = person_row_cap(n)
        keys_of: dict[int, list[str]] = {}
        failed: set[int] = set()
        persons: dict[str, list[tuple[int, dict]]] = defaultdict(list)
        for index, record in items:
            if not isinstance(records[index], dict):
                failed.add(index)
                key_errors += 1
                continue
            keys, broken = _person_keys(record)
            if broken:
                failed.add(index)
                key_errors += 1
                continue
            row_keys = keys if keys else [MISSING_PERSON_KEY]
            keys_of[index] = row_keys
            for key in row_keys:
                persons[key].append((index, record))

        selected = {
            key: _select_indexes(group, cap, seed, class_id, key) for key, group in persons.items()
        }
        kept_here = 0
        for index, record in items:
            if index in failed:
                removed_by_index[index] = _removed_copy(record, "person_key_error")
                removed_counts[(class_id, MISSING_PERSON_KEY, "person_key_error")] += 1
                continue
            row_keys = keys_of[index]
            if all(index in selected[key] for key in row_keys):
                kept_indexes.add(index)
                kept_here += 1
                continue
            reasons = []
            for key in row_keys:
                if index in selected[key]:
                    reason = "co_collector"
                elif key == MISSING_PERSON_KEY:
                    reason = "no_person_key"
                else:
                    reason = "person_cap"
                reasons.append(reason)
                removed_counts[(class_id, key, reason)] += 1
            removed_by_index[index] = _removed_copy(record, _primary_reason(reasons))
        class_info.append(
            {
                "class_id": class_id,
                "n": n,
                "cap": cap,
                "kept": kept_here,
                "removed": n - kept_here,
            }
        )

    kept = [record for index, record in enumerate(records) if index in kept_indexes]
    removed = [removed_by_index[index] for index in range(len(records)) if index in removed_by_index]
    report = {
        "applied": True,
        "n_definition": N_DEFINITION,
        "missing_person_rule": MISSING_PERSON_RULE,
        "formula": FORMULA,
        "rounding": "python round, half to even",
        "cap_max": CAP_MAX,
        "cap_min": CAP_MIN,
        "cap_fraction": CAP_FRACTION,
        "seed": seed,
        "missing_person_key": MISSING_PERSON_KEY,
        "removed_rows": len(removed),
        "person_key_errors": key_errors,
        "removed_count_note": (
            "count is how many of that person's rows were not kept. A row with "
            "two person keys is listed under both, so the counts can add up to "
            "more than removed_rows. person_cap: this person was over the cap "
            "and this row was not selected. co_collector: this person kept the "
            "row in their own selection, and another person key on the row did "
            "not. no_person_key: the empty-key sentinel was over the cap. "
            "person_key_error: the person key could not be computed."
        ),
        "classes": class_info,
        "removed": [
            {"class_id": class_id, "person_key": person_key, "count": count, "reason": reason}
            for (class_id, person_key, reason), count in sorted(removed_counts.items())
        ],
    }
    return kept, removed, report


def _primary_reason(reasons: list[str]) -> str:
    for reason in ("person_key_error", "person_cap", "no_person_key", "co_collector"):
        if reason in reasons:
            return reason
    return "person_cap"


def _removed_copy(record: dict, reason: str) -> dict:
    if not isinstance(record, dict):
        return {"drop_reason": reason}
    return {**record, "drop_reason": reason}
