"""Cap how many rows one person can contribute to one class.

Prepare calls this after every source has been merged and after both dedup
passes, and before the split. Wojtek confirmed the numbers on 2026-10-23
at 16:55, decision A: ``min(60, max(10, round(0.10 * N)))`` per person
per class. The cap is retroactive. Every eligible row already in the
merged sources is counted, including rows collected before that decision.
Nothing is grandfathered.

A row may carry several person keys. The cap counts one of them: the photo
author in ``creator``, and when that is missing, ``rights_holder``. The
string is normalized by ``split.person_identity_keys``, the same function
the split uses, called on that field alone. ``inat_observer``, ``author``,
``recordedBy``, ``collector_key``, and any other co-collector stay on the
row and still link split components. They do not take a cap slot. A row
with two people occupies a slot only for the author. This module does not
parse author strings itself and does not write a person key back onto the
row.

Which rows survive is a seeded round-robin over observations: one photo
from each observation, in stable-hash order, before a second photo from
any observation. The hash is SHA-256 of ``PERSON_CAP_SEED`` and the photo
id. Input position is not a key, so a shuffled source file keeps the same
rows and the same order. ``PERSON_CAP_SEED`` is not the split salt.
Changing the salt does not change this selection.

Decision A leaves the existing per-observation photo limit unchanged.
The GBIF fetch still stops at ``sampling.MAX_PER_OCCURRENCE`` (2). This
step does not add another per-observation cap. Distinct photos of one
observation still survive identity dedup. An observation that fits under
the person cap is left whole, including when it already has three photos.
Round-robin only chooses among a person's rows when that person is over
the cap.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict

from split import is_placeholder_person, observation_identity_keys, person_identity_keys, photo_identity_keys

# Wojtek 2026-10-23 16:55, decision A. Do not raise the ceiling or the fraction.
CAP_MAX = 60
CAP_MIN = 10
CAP_FRACTION = 0.10
# Not the split salt. The same seed keeps the same rows.
PERSON_CAP_SEED = 42
# Report key only. It is not written onto the row and it does not link components.
MISSING_PERSON_KEY = "none"
FORMULA = "min(CAP_MAX, max(CAP_MIN, round(CAP_FRACTION * N)))"
# Variant B is frozen until the owner chooses. Variant A (half up) is
# `(N + 5) // 10` in place of `round(CAP_FRACTION * N)` inside cap_for_n.
ROUNDING = "round half to even (Python round)"
N_DEFINITION = (
    "N is the number of rows of one class still eligible for training after "
    "every source has been merged, after the unverified filter, after both "
    "dedup passes (identity, then perceptual hash), and after the model-PNG "
    "readability check, and before this author cap. Order: merge, unverified "
    "filter (and the other pre-dedup skips), identity dedup, perceptual "
    "dedup, readability, count N, author cap, split. Prepare does not apply "
    "a per-observation cap of 3. The only per-occurrence cap is "
    "sampling.MAX_PER_OCCURRENCE (2), and it runs in the GBIF fetch, before "
    "prepare, so it is not a step between dedup and this cap. Three distinct "
    "photos of one observation that remain after dedup all count in N. Rows "
    "skipped before dedup (not downloaded, unverified, DF20 left out, "
    "training_only under --publishable-only, missing file, corrupt) are not "
    "in N. Identity duplicates, perceptual near-duplicates, and rows that "
    "cannot be read or written as the model PNG are not in N and do not take "
    "a person's slot. A person's rows in other classes are not added to N. "
    "The cap is retroactive: rows collected before 2026-10-23 are capped "
    "with the same N. There is no grandfathering."
)
MISSING_PERSON_RULE = (
    "The cap counts one key: creator, otherwise rights_holder, when that "
    "field names a person. person_identity_keys normalizes that field, the "
    "same function the split uses, and it is called on that field alone. "
    "A blank or a placeholder (split.is_placeholder_person, including "
    "Unknown, anonymous, '-', and Unknown subject) is not an author. The "
    "cap then uses that row's observation identity, so anonymous photos "
    "from different observations do not share a bucket. inat_observer, "
    "author, recordedBy, collector_key, and any other co-collector do not "
    "take a cap slot. A row with two people occupies a slot only for the "
    "author. Those other keys still link split components. A row with no "
    "author and no observation key shares the sentinel \"none\" for this "
    "cap only. The sentinel is not written onto the row. A row whose key "
    "cannot be computed is removed and reported as person_key_error. It "
    "still counts toward N and does not take a sentinel slot."
)


def cap_for_n(n: int) -> int:
    """How many rows one author may keep in a class of ``n`` eligible rows.

    Variant B, frozen until the owner decides between A (half up) and B
    (half to even). ``round`` is Python's round, half to even. Variant A
    replaces the next line with ``(n + 5) // 10``.
    """
    if isinstance(n, bool) or not isinstance(n, int) or n < 0:
        raise ValueError("N must be a non-negative int")
    rounded = round(CAP_FRACTION * n)  # variant B; variant A: (n + 5) // 10
    return min(CAP_MAX, max(CAP_MIN, rounded))


def person_row_cap(n: int) -> int:
    """Same number as ``cap_for_n``. The rounding lives in that function."""
    return cap_for_n(n)


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
    return _content_token(row)


def _content_token(row: dict) -> str:
    payload = json.dumps(row, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def report_row_id(row: dict) -> str:
    """Photo id written into ``author_cap_report``. Not the input position."""
    if not isinstance(row, dict):
        return "invalid"
    for field in ("inat_photo_id", "file", "image_url", "identifier", "sha256"):
        value = row.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return _row_stable_id(row)


def _emission_key(seed: int, row: dict) -> tuple[str, str, str]:
    """Order kept and cut rows. The input index is not part of the key."""
    if not isinstance(row, dict):
        token = "invalid"
        return (_rank(seed, "emit", token), token, token)
    stable = _row_stable_id(row)
    content = _content_token(row)
    return (_rank(seed, "emit", stable, content), stable, content)


def _one_identity_key(found: object) -> tuple[str | None, bool]:
    """One stable key from an identity-key list. Empty is not a failure."""
    if not isinstance(found, list) or any(not isinstance(key, str) or not key for key in found):
        return None, True
    unique = list(dict.fromkeys(found))
    if not unique:
        return None, False
    if len(unique) == 1:
        return unique[0], False
    return "\x1e".join(sorted(unique)), False


def cap_author_key(record: dict) -> tuple[str | None, bool]:
    """The one key that counts toward the cap.

    ``creator``, otherwise ``rights_holder``, when that field is a person.
    Placeholders come from ``split.is_placeholder_person`` (one list, case
    insensitive), including ``Unknown Subject``. A placeholder or a blank
    is not an author. The cap then uses the row's observation identity, so
    each observation is its own key. ``None`` with failed False means there
    is neither an author nor an observation key. ``None`` with failed True
    means the key could not be computed.
    """
    if not isinstance(record, dict):
        return None, True
    try:
        for field in ("creator", "rights_holder"):
            if is_placeholder_person(record.get(field)):
                continue
            key, failed = _one_identity_key(person_identity_keys({field: record.get(field)}))
            if failed or key:
                return key, failed
        return _one_identity_key(observation_identity_keys(record))
    except Exception:
        return None, True


def _person_keys(record: dict) -> tuple[list[str] | None, bool]:
    """The cap author, as a one-item list, and whether the key failed.

    ``None`` with failed False is a computed empty author. ``None`` with
    failed True is removed rather than passed through. Co-collectors are
    not included.
    """
    key, failed = cap_author_key(record)
    if failed:
        return None, True
    if key is None:
        return None, False
    return [key], False


def _group_observations(indexed: list[tuple[int, dict]]) -> list[tuple[str, list[tuple[int, dict]]]]:
    """Group one person's rows by the split's observation keys.

    The group id is the sorted keys. A shuffle does not change which
    observation is visited first, and the input index is not a sort key.
    A row with no
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
        rows_sorted = sorted(rows, key=lambda item: _emission_key(seed, item[1]))
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
    limit: int | None = None,
) -> tuple[list[dict], list[dict], dict]:
    """Drop rows that put one author over the cap in a class.

    Returns the same row objects, ordered by the seeded photo-id hash,
    plus removed copies and the report. Input order is not kept. The input
    list and the kept dicts are not modified. Removed copies are not written
    back to the source files. ``author_cap_report`` is one entry per class:
    ``n`` (N), ``cap`` (the computed ceiling), and ``persons`` with each
    person's ``kept`` and ``cut`` counts. Cut rows still carry ``reason``
    and photo ``ids``.

    ``limit`` None uses ``person_row_cap``. A positive int is the same
    selector with that ceiling on every class. The importer passes one
    only when ``--max-per-collector`` is set.
    """
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise ValueError("person cap seed must be an int")
    if limit is not None and (isinstance(limit, bool) or not isinstance(limit, int) or limit < 1):
        raise ValueError("person cap limit override must be a positive int")

    by_class: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for index, record in enumerate(records):
        by_class[_class_id(record)].append((index, record if isinstance(record, dict) else {}))

    kept_indexes: set[int] = set()
    removed_by_index: dict[int, dict] = {}
    removed_counts: Counter[tuple[str, str, str]] = Counter()
    removed_ids: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    class_n_cap: dict[str, tuple[int, int]] = {}
    class_info: list[dict] = []
    author_classes: list[dict] = []
    key_errors = 0

    for class_id in sorted(by_class):
        items = by_class[class_id]
        n = len(items)
        cap = person_row_cap(n) if limit is None else limit
        class_n_cap[class_id] = (n, cap)
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
                bucket = (class_id, MISSING_PERSON_KEY, "person_key_error")
                removed_counts[bucket] += 1
                removed_ids[bucket].append(report_row_id(record))
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
                bucket = (class_id, key, reason)
                removed_counts[bucket] += 1
                removed_ids[bucket].append(report_row_id(record))
            removed_by_index[index] = _removed_copy(record, _primary_reason(reasons))
        persons_report: list[dict] = []
        for key in sorted(persons):
            group = persons[key]
            kept_n = sum(1 for index, _record in group if index in kept_indexes)
            cut_records = [record for index, record in group if index not in kept_indexes]
            reason = None
            if cut_records:
                reasons = sorted(
                    {
                        bucket_reason
                        for bucket_class, bucket_key, bucket_reason in removed_counts
                        if bucket_class == class_id and bucket_key == key
                    }
                )
                reason = reasons[0] if len(reasons) == 1 else _primary_reason(reasons)
            persons_report.append(
                {
                    "person_key": key,
                    "kept": kept_n,
                    "cut": len(cut_records),
                    "reason": reason,
                    "ids": sorted(report_row_id(record) for record in cut_records),
                }
            )
        error_records = [record for index, record in items if index in failed]
        if error_records:
            persons_report.append(
                {
                    "person_key": MISSING_PERSON_KEY,
                    "kept": 0,
                    "cut": len(error_records),
                    "reason": "person_key_error",
                    "ids": sorted(report_row_id(record) for record in error_records),
                }
            )
        persons_report.sort(key=lambda item: (item["person_key"], item["reason"] or ""))
        if sum(item["kept"] + item["cut"] for item in persons_report) != n:
            raise RuntimeError(f"author cap report for {class_id} does not add up to N")
        author_classes.append(
            {
                "class_id": class_id,
                "n": n,
                "cap": cap,
                "persons": persons_report,
            }
        )
        class_info.append(
            {
                "class_id": class_id,
                "n": n,
                "cap": cap,
                "limit": cap,
                "kept": kept_here,
                "removed": n - kept_here,
            }
        )

    kept = [record for index, record in enumerate(records) if index in kept_indexes]
    kept.sort(key=lambda row: _emission_key(seed, row))
    removed = sorted(
        (removed_by_index[index] for index in removed_by_index),
        key=lambda row: _emission_key(seed, row),
    )
    removed_report = [
        {
            "class_id": class_id,
            "person_key": person_key,
            "n": class_n_cap[class_id][0],
            "limit": class_n_cap[class_id][1],
            "count": count,
            "reason": reason,
            "ids": sorted(removed_ids[(class_id, person_key, reason)]),
        }
        for (class_id, person_key, reason), count in sorted(removed_counts.items())
    ]
    author_cap_report = author_classes
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
        "limit_override": limit,
        "missing_person_key": MISSING_PERSON_KEY,
        "removed_rows": len(removed),
        "person_key_errors": key_errors,
        "removed_count_note": (
            "count is how many of that person's rows were not kept. A row with "
            "two person keys is listed under both, so the counts can add up to "
            "more than removed_rows. person_cap: this person was over the cap "
            "and this row was not selected. The cap key is only creator, or "
            "rights_holder when creator is empty. A co-collector is not "
            "listed here and does not take a slot. no_person_key: the "
            "empty-key sentinel was over the cap. "
            "person_key_error: the person key could not be computed."
        ),
        "classes": class_info,
        "removed": removed_report,
        "author_cap_report": author_cap_report,
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
