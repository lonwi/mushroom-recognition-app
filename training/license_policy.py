"""Which photo licences may train a released model, and which may be shown.

Decyzja Wojtka 2026-10-23 12:02, wariant C: a released model's training set
may include CC0, CC BY, CC BY-NC, CC BY-SA, and Danish Fungi 2020. Photos
shown in the app (atlas gallery, ``site/``, comparison photos) stay CC0 or
CC BY. CC BY-SA is accepted only as an exact versioned id such as
``cc-by-sa-4.0``, and that id is ``usage=training_only``.

The ids below are a closed list of whole keys. Nothing is accepted by
prefix. ``cc-by`` is not ``cc-by-4.0``, ``cc-by-nc`` is not ``cc-by-nc-4.0``,
``cc-by-sa`` is not ``cc-by-sa-4.0``, and ``cc-by-nc-sa`` is not
``cc-by-nc-4.0``. ND, NC-ND, and NC-SA are absent on purpose.

Danish Fungi 2020 is on the list for experimental training only. It is not
pulled by ``--with-external``. Inclusion is ``--include-df20``, default off.
A released model never includes it: any DF20 row sets ``shippable`` false.
``DF20_CONSENT_CONFIRMED`` stays false and does not unlock that gate.
"""

from __future__ import annotations

from collections import Counter

PUBLISHABLE = "publishable"
TRAINING_ONLY = "training_only"

# ``training_only`` means the photo may train and must not be shown. For CC
# BY-NC and CC BY-SA that usage does not refuse ``shippable``. Owner decision
# 2026-10-23 12:17, CC BY-SA variant B (register 0004 in #74): share-alike does
# not cover model weights, so versioned CC BY-SA may train a released model.
# ``df20`` is listed so an opted-in experimental run can train on it. Any DF20
# attribution row still sets ``shippable`` false, and ``DF20_CONSENT_CONFIRMED``
# cannot clear that. Each row is one exact id, its usage, and its family.
# There is no prefix scan.
_LICENSE_TABLE: tuple[tuple[str, str, str], ...] = (
    ("cc0-1.0", PUBLISHABLE, "cc0"),
    ("cc-by-1.0", PUBLISHABLE, "cc-by"),
    ("cc-by-2.0", PUBLISHABLE, "cc-by"),
    ("cc-by-2.5", PUBLISHABLE, "cc-by"),
    ("cc-by-3.0", PUBLISHABLE, "cc-by"),
    ("cc-by-4.0", PUBLISHABLE, "cc-by"),
    ("cc-by-nc-1.0", TRAINING_ONLY, "cc-by-nc"),
    ("cc-by-nc-2.0", TRAINING_ONLY, "cc-by-nc"),
    ("cc-by-nc-2.5", TRAINING_ONLY, "cc-by-nc"),
    ("cc-by-nc-3.0", TRAINING_ONLY, "cc-by-nc"),
    ("cc-by-nc-4.0", TRAINING_ONLY, "cc-by-nc"),
    ("cc-by-sa-1.0", TRAINING_ONLY, "cc-by-sa"),
    ("cc-by-sa-2.0", TRAINING_ONLY, "cc-by-sa"),
    ("cc-by-sa-2.5", TRAINING_ONLY, "cc-by-sa"),
    ("cc-by-sa-3.0", TRAINING_ONLY, "cc-by-sa"),
    ("cc-by-sa-4.0", TRAINING_ONLY, "cc-by-sa"),
    ("df20", TRAINING_ONLY, "df20"),
)

EXACT_LICENSE_USAGE: dict[str, str] = {
    license_id: usage for license_id, usage, _family in _LICENSE_TABLE
}
LICENSE_FAMILY: dict[str, str] = {
    license_id: family for license_id, _usage, family in _LICENSE_TABLE
}

# Documentation only. Danish Fungi 2020 is licensed for non-commercial research
# only, and Svampeatlas photographer consent is still pending. Leave this
# False. It does not unlock a release: any DF20 row keeps ``shippable`` false
# even if this constant is changed. ``--include-df20`` may add the rows to an
# experimental training run only.
DF20_CONSENT_CONFIRMED = False


def exclude_df20_unless_requested(rows: list[dict], *, include_df20: bool) -> tuple[list[dict], int]:
    """Drop DF20 rows unless this run passed ``--include-df20``.

    The default is off, so ``--with-external`` does not pull DF20. The count
    is the number of excluded rows. Detection is ``component_share.is_df20_row``.
    """
    from component_share import is_df20_row

    if include_df20:
        return rows, 0
    kept: list[dict] = []
    excluded = 0
    for row in rows:
        if is_df20_row(row):
            excluded += 1
            continue
        kept.append(row)
    return kept, excluded


def exact_license_usage(license_id: object) -> str | None:
    """``publishable`` or ``training_only`` for an exact id, otherwise None."""
    if not isinstance(license_id, str):
        return None
    return EXACT_LICENSE_USAGE.get(license_id)


def license_family(license_id: object) -> str | None:
    """``cc0``, ``cc-by``, ``cc-by-nc``, ``cc-by-sa``, or ``df20``.

    Only an id in ``LICENSE_FAMILY`` has a family. Unversioned ``cc-by-sa``,
    ``cc-by-nc``, and ``cc-by-nc-sa`` have none, and so do ND, NC-ND, and NC-SA.
    """
    if not isinstance(license_id, str):
        return None
    return LICENSE_FAMILY.get(license_id)


def allowed_for_training(license_id: object) -> bool:
    """True when this exact id may be in the training set of a released model."""
    return exact_license_usage(license_id) is not None


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
