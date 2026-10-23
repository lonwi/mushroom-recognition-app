"""Which photo licences may train a released model, and which may be shown.

Owner decision (Wojtek, 2026-10-23, variant C): a released model's training
set may include CC0, CC BY, CC BY-NC, CC BY-SA, and Danish Fungi 2020.
Photos shown in the app (atlas gallery, ``site/``, comparison photos) stay
CC0 or CC BY.

The ids below are whole keys. ``cc-by-nc-4.0`` is not ``cc-by-4.0``, and
``cc-by-nc-sa-4.0`` is not ``cc-by-nc-4.0``. ND, NC-ND, and NC-SA are absent
on purpose. Do not prefix-match.
"""

from __future__ import annotations

from collections import Counter

PUBLISHABLE = "publishable"
TRAINING_ONLY = "training_only"

# ``training_only`` means the photo may train the released model and must not
# be shown. It is not a reason to refuse ``shippable``.
EXACT_LICENSE_USAGE: dict[str, str] = {
    "cc0-1.0": PUBLISHABLE,
    "cc-by-1.0": PUBLISHABLE,
    "cc-by-2.0": PUBLISHABLE,
    "cc-by-2.5": PUBLISHABLE,
    "cc-by-3.0": PUBLISHABLE,
    "cc-by-4.0": PUBLISHABLE,
    "cc-by-nc-1.0": TRAINING_ONLY,
    "cc-by-nc-2.0": TRAINING_ONLY,
    "cc-by-nc-2.5": TRAINING_ONLY,
    "cc-by-nc-3.0": TRAINING_ONLY,
    "cc-by-nc-4.0": TRAINING_ONLY,
    "cc-by-sa-1.0": TRAINING_ONLY,
    "cc-by-sa-2.0": TRAINING_ONLY,
    "cc-by-sa-2.5": TRAINING_ONLY,
    "cc-by-sa-3.0": TRAINING_ONLY,
    "cc-by-sa-4.0": TRAINING_ONLY,
    "df20": TRAINING_ONLY,
}

_FAMILY_ORDER = (
    ("cc-by-nc-", "cc-by-nc"),
    ("cc-by-sa-", "cc-by-sa"),
    ("cc-by-", "cc-by"),
    ("cc0-", "cc0"),
)


def exact_license_usage(license_id: object) -> str | None:
    """``publishable`` or ``training_only`` for an exact id, otherwise None."""
    if not isinstance(license_id, str):
        return None
    return EXACT_LICENSE_USAGE.get(license_id)


def license_family(license_id: object) -> str | None:
    """``cc0``, ``cc-by``, ``cc-by-nc``, ``cc-by-sa``, or ``df20``.

    An id that is not in the policy table has no family, including ND,
    NC-ND, and NC-SA.
    """
    if exact_license_usage(license_id) is None:
        return None
    if license_id == "df20":
        return "df20"
    text = str(license_id)
    for prefix, family in _FAMILY_ORDER:
        if text.startswith(prefix):
            return family
    return None


def allowed_for_training(license_id: object) -> bool:
    """True when this exact id may be in the training set of a released model."""
    return license_family(license_id) is not None


def allowed_for_display(license_id: object) -> bool:
    """True only for versioned CC0 and CC BY. NC, SA, and DF20 are not shown."""
    return exact_license_usage(license_id) == PUBLISHABLE


def training_license_rank(license_id: object) -> int:
    """Higher is stricter: NC, DF20, and SA outrank CC BY, which outranks CC0.

    NC adds a non-commercial term, DF20 adds the dataset terms, and SA adds
    share-alike. The kept copy of one photo has to record that extra duty.
    CC BY outranks CC0 so a public-domain duplicate does not drop attribution.
    Equal ranks are not ordered here; the caller keeps the earliest row.
    """
    family = license_family(license_id)
    if family in {"cc-by-nc", "cc-by-sa", "df20"}:
        return 3
    if family == "cc-by":
        return 2
    if family == "cc0":
        return 1
    return 0


def license_breakdown(rows: list[dict]) -> dict:
    """Counts of one photo list by normalised licence and by source."""
    by_license: Counter[str] = Counter()
    by_source: Counter[str] = Counter()
    pairs: Counter[tuple[str, str]] = Counter()
    counted = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        counted += 1
        license_id = str(row.get("license_normalized") or "missing")
        source = row.get("source") or row.get("dataset") or "unspecified"
        source_name = str(source) if source else "unspecified"
        by_license[license_id] += 1
        by_source[source_name] += 1
        pairs[(license_id, source_name)] += 1
    return {
        "rows": counted,
        "by_license": dict(sorted(by_license.items())),
        "by_source": dict(sorted(by_source.items())),
        "by_license_and_source": [
            {"license": license_id, "source": source_name, "count": count}
            for (license_id, source_name), count in sorted(pairs.items())
        ],
    }


def license_breakdown_report(splits: dict[str, list[dict]]) -> dict:
    """Per-split counts plus the combined train, val, and test record."""
    report = {name: license_breakdown(rows) for name, rows in splits.items()}
    combined: list[dict] = []
    for rows in splits.values():
        combined.extend(rows)
    report["train_val_test"] = license_breakdown(combined)
    return report
