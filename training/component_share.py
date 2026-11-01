"""Per-class share of the largest identity component.

The gate is one number, ``COMPONENT_SHARE_LIMIT`` (0.20): the largest
component's share of that class's rows. A class over the limit fails prepare
unless it is named in the acknowledgement file. An acknowledgement is written
into the dataset manifest and is a ship blocker, so the model stays
non-shippable. The global largest-component share is recorded and is not a gate.
A config file may set a lower limit. A limit above the constant is an error.

Every class also needs a non-empty val and a non-empty test. An acknowledged
class that fails either check is the same kind of ship blocker. Other classes
stop the run.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

from manifest import ROOT
from publication import DF20_NORMALIZED_LICENSE_FIELD, DF20_SOURCE_FIELD, _df20_marker
from split import _components, normalized_person_text, person_identity_keys

# Pending owner decision (20% vs 50%); do not raise.
COMPONENT_SHARE_LIMIT = 0.20
ACK_PATH = ROOT / "training" / "component_share_acknowledgements.json"
_PERSON_FIELDS = (
    "inat_observer",
    "author",
    "creator",
    "recorded_by",
    "recordedBy",
    "photographer_rightsHolder",
    "rights_holder",
    "rightsHolder",
)


def _person_texts(row: dict) -> list[str]:
    texts = [text for text in (normalized_person_text(row.get(field)) for field in _PERSON_FIELDS) if text]
    collector = row.get("collector_key")
    if isinstance(collector, str) and ":" in collector:
        _prefix, rest = collector.split(":", 1)
        folded = normalized_person_text(rest)
        if folded:
            texts.append(folded)
    return texts


def is_no_rights_reserved(row: dict) -> bool:
    return any(text == "no rights reserved" for text in _person_texts(row))


def is_placeholder_row(row: dict) -> bool:
    """True when every person field is missing or a placeholder."""
    texts = _person_texts(row)
    if not texts:
        return True
    return not person_identity_keys(row)


def is_df20_row(row: dict) -> bool:
    """DF20 when the source, the normalised licence id, or a marker says so.

    The fields are ``publication.DF20_DETECTION_FIELDS``. A marker alone is enough.
    """
    if not isinstance(row, dict):
        return False
    source = row.get(DF20_SOURCE_FIELD)
    if str(source or "").casefold() == "df20":
        return True
    normalized = row.get(DF20_NORMALIZED_LICENSE_FIELD)
    if isinstance(normalized, str) and normalized.strip().casefold() == "df20":
        return True
    return _df20_marker(row)


def require_share_limit(limit: object, source: str) -> float:
    """Refuse any limit wider than ``COMPONENT_SHARE_LIMIT``. A lower limit is allowed.

    Acknowledgements are the only exception, and those keep the model non-shippable.
    """
    if isinstance(limit, bool):
        raise ValueError(f"{source} limit must be a number")
    try:
        value = float(limit)  # type: ignore[arg-type]
    except (TypeError, ValueError) as error:
        raise ValueError(f"{source} limit must be a number") from error
    if value != value or value <= 0:
        raise ValueError(f"{source} limit must be greater than 0 and at most {COMPONENT_SHARE_LIMIT}")
    if value > COMPONENT_SHARE_LIMIT:
        raise ValueError(
            f"{source} limit {value} is above COMPONENT_SHARE_LIMIT ({COMPONENT_SHARE_LIMIT}). "
            "A wider gate is refused. The only exception is an acknowledgement, which keeps the model non-shippable."
        )
    return value


def load_share_config(path: Path | None = None) -> dict:
    """Limit plus the explicit per-class acknowledgement list.

    A missing file uses the default limit and acknowledges nobody.
    A file limit above ``COMPONENT_SHARE_LIMIT`` is an error. A lower limit is kept.
    """
    file = ACK_PATH if path is None else Path(path)
    if not file.is_file():
        return {"limit": COMPONENT_SHARE_LIMIT, "acknowledgements": {}}
    payload = json.loads(file.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{file} must be a JSON object")
    limit = require_share_limit(payload.get("limit", COMPONENT_SHARE_LIMIT), str(file))
    acknowledgements: dict[str, str] = {}
    raw = payload.get("acknowledgements") or []
    if not isinstance(raw, list):
        raise ValueError(f"{file} acknowledgements must be a list")
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError(f"{file} acknowledgement entries must be objects")
        class_id = str(item.get("class_id") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if not class_id or not reason:
            raise ValueError(f"{file} acknowledgement needs class_id and a non-empty reason")
        acknowledgements[class_id] = reason
    return {"limit": limit, "acknowledgements": acknowledgements}


def measure_component_share(
    splits: dict[str, list[dict]],
    *,
    salt: str,
    acknowledgements: dict[str, str] | None = None,
    limit: float = COMPONENT_SHARE_LIMIT,
) -> dict:
    """Per-class component share, placeholder share, and DF20 share.

    ``salt`` pseudonymizes the largest component id. It does not change the sizes.
    ``limit`` above ``COMPONENT_SHARE_LIMIT`` is refused, including a value passed
    in directly rather than through a config file.
    """
    limit = require_share_limit(limit, "component share")
    names = ("train", "val", "test")
    rows: list[dict] = []
    per_split: dict[str, Counter[str]] = {name: Counter() for name in names}
    for name in names:
        for row in splits.get(name) or []:
            rows.append(row)
            per_split[name][str(row.get("class_id") or "")] += 1
    acks = acknowledgements or {}
    components = _components(rows, salt) if rows else []
    class_rows: dict[str, int] = Counter(str(row.get("class_id") or "") for row in rows)
    largest_rows: dict[str, int] = defaultdict(int)
    largest_id: dict[str, str] = {}
    global_largest = 0
    global_id = ""
    for component in components:
        size = len(component["rows"])
        if size > global_largest:
            global_largest = size
            global_id = component["id"]
        by_class: Counter[str] = Counter(str(row.get("class_id") or "") for row in component["rows"])
        for class_id, count in by_class.items():
            if count > largest_rows[class_id]:
                largest_rows[class_id] = count
                largest_id[class_id] = component["id"]
    placeholder_rows: Counter[str] = Counter()
    no_rights_rows: Counter[str] = Counter()
    df20_rows: Counter[str] = Counter()
    for row in rows:
        class_id = str(row.get("class_id") or "")
        if is_placeholder_row(row):
            placeholder_rows[class_id] += 1
        if is_no_rights_reserved(row):
            no_rights_rows[class_id] += 1
        if is_df20_row(row):
            df20_rows[class_id] += 1

    def _share(part: int, whole: int) -> float:
        if whole <= 0:
            return 0.0
        return part / whole

    per_class: dict[str, dict] = {}
    blockers: list[str] = []
    for class_id in sorted(class_rows):
        total = class_rows[class_id]
        largest = largest_rows[class_id]
        share = _share(largest, total)
        val_rows = per_split["val"][class_id]
        test_rows = per_split["test"][class_id]
        over = share > limit
        missing = val_rows < 1 or test_rows < 1
        acknowledged = class_id in acks
        info = {
            "rows": total,
            "largest_component_rows": largest,
            "largest_component_share": share,
            "largest_component_id": largest_id.get(class_id, ""),
            "over_limit": over,
            "acknowledged": acknowledged,
            "acknowledgement_reason": acks.get(class_id, ""),
            "placeholder_rows": placeholder_rows[class_id],
            "placeholder_share": _share(placeholder_rows[class_id], total),
            "no_rights_reserved_rows": no_rights_rows[class_id],
            "no_rights_reserved_share": _share(no_rights_rows[class_id], total),
            "df20_rows": df20_rows[class_id],
            "df20_share": _share(df20_rows[class_id], total),
            "val_rows": val_rows,
            "test_rows": test_rows,
            "missing_val_or_test": missing,
        }
        per_class[class_id] = info
        if not over and not missing:
            continue
        parts = []
        if over:
            parts.append(
                f"largest component is {largest}/{total} ({share:.0%}) of the class, over {limit:.0%}"
            )
        if missing:
            parts.append(f"val has {val_rows} rows and test has {test_rows}")
        detail = f"{class_id}: " + "; ".join(parts)
        if acknowledged:
            blockers.append(
                detail + f". Acknowledged ({acks[class_id]}). The model is not shippable."
            )
        else:
            info["hard_stop"] = True
    hard = [class_id for class_id, info in per_class.items() if info.get("hard_stop")]
    total_rows = len(rows)
    return {
        "limit": limit,
        "global": {
            "rows": total_rows,
            "largest_component_rows": global_largest,
            "largest_component_share": _share(global_largest, total_rows),
            "largest_component_id": global_id,
        },
        "acknowledgements": [
            {"class_id": class_id, "reason": reason} for class_id, reason in sorted(acks.items())
        ],
        "per_class": per_class,
        "hard_stop_classes": hard,
        "ship_blockers": blockers,
    }


def blockers_from_manifest_file(path: Path) -> list[str]:
    """Blockers recorded in ``dataset_manifest.json``. A missing file is itself a blocker."""
    file = Path(path)
    if not file.is_file():
        return ["dataset_manifest.json is missing, so the per-class component share was not recorded"]
    try:
        payload = json.loads(file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return ["dataset_manifest.json is not valid JSON, so component share was not checked"]
    return component_share_blockers(payload)


def component_share_blockers(manifest: dict | None) -> list[str]:
    """Ship-blocker strings recorded on a dataset manifest.

    A manifest with no ``component_share`` block is a blocker, the same as a
    missing file. An unacknowledged hard stop recorded in the block is a blocker
    too, so a leftover manifest cannot ship.
    """
    if not isinstance(manifest, dict):
        return ["dataset manifest is missing, so the per-class component share was not recorded"]
    block = manifest.get("component_share")
    if not isinstance(block, dict):
        return [
            "dataset manifest has no component_share block, so the per-class component share was not recorded"
        ]
    reasons = block.get("ship_blockers")
    if not isinstance(reasons, list):
        return [
            "dataset manifest component_share has no ship_blockers list, so the per-class component share was not recorded"
        ]
    found = [str(item) for item in reasons if str(item).strip()]
    hard = block.get("hard_stop_classes")
    if not isinstance(hard, list):
        found.append(
            "dataset manifest component_share has no hard_stop_classes list, so the per-class component share was not recorded"
        )
        return found
    for class_id in hard:
        text = str(class_id).strip()
        prefix = f"{text}:"
        if text and not any(item.startswith(prefix) for item in found):
            found.append(
                f"{text}: unacknowledged component-share hard stop is still recorded. The model is not shippable."
            )
    return found
