"""What may be published. CC BY-NC and Danish Fungi 2020 stay training-only.

``licenses.py`` is unchanged on purpose: its bytes are part of the GBIF cache
key. License text is parsed by ``import_external.parse_textual_license``:
the version comes from the cell or from ``license_url``, the id is compared
in full, and a versionless or unknown license is rejected. ``public domain``
without CC0 is not CC0. CC0 with no version is ``cc0-1.0``.
"""

from __future__ import annotations

from import_external import exact_license_usage, parse_textual_license

_DF20_DATASETS = frozenset({"df20", "danish fungi 2020", "danish_fungi_2020"})


def publishable_normalized_id(license_id: str) -> bool:
    """True when the id is an exact publishable key, such as ``cc-by-4.0``."""
    return exact_license_usage(license_id) == "publishable"


def classify_license_column(raw: str | None, license_url: str | None = None) -> str:
    """Read the license column with the external-CSV parser.

    Returns ``cc0``, ``cc-by``, ``cc-by-nc``, ``df20``, ``rejected``, or ``missing``.
    Versionless ``CC BY`` is ``rejected`` unless ``license_url`` carries the version.
    """
    if raw is None:
        return "missing"
    text = str(raw).strip()
    if not text:
        return "missing"
    folded = text.casefold()
    if "df20" in folded and "training-only" in folded:
        return "df20"
    decision = parse_textual_license(text, license_url)
    if decision is None:
        return "rejected"
    usage = exact_license_usage(decision["license_normalized"])
    if usage == "training_only":
        return "cc-by-nc"
    if usage == "publishable" and str(decision["license_normalized"]).startswith("cc0-"):
        return "cc0"
    if usage == "publishable":
        return "cc-by"
    return "rejected"


def license_column(row: dict) -> str:
    """The row's own license string. It is not folded into author or source."""
    value = row.get("license")
    return value if isinstance(value, str) else ""


def _df20_marker(row: dict) -> bool:
    if row.get("df20_image_path") or row.get("ImageUniqueID") or row.get("df20_image_id"):
        return True
    for field in ("licence_note", "license_note"):
        value = row.get(field)
        if isinstance(value, str) and "df20" in value.casefold():
            return True
    for field in ("dataset", "source", "collection"):
        value = row.get(field)
        if isinstance(value, str) and value.strip().casefold() in _DF20_DATASETS:
            return True
    return False


def excluded_from_publication(row: dict) -> bool:
    """One condition: CC BY-NC and Danish Fungi 2020 are training-only.

    Callers drop both with ``if excluded_from_publication(row)``.
    A versionless or unknown license is also unpublished. The license value
    stays on the row.
    """
    usage = row.get("usage")
    if isinstance(usage, str) and usage.strip().casefold() == "training_only":
        return True
    if _df20_marker(row):
        return True
    normalized = row.get("license_normalized")
    exact = exact_license_usage(normalized)
    if exact == "training_only":
        return True
    if exact == "publishable":
        return False
    url = row.get("license_url")
    kind = classify_license_column(license_column(row) or None, url if isinstance(url, str) else None)
    return kind not in {"cc0", "cc-by"}


def publishable_license(row: dict) -> bool:
    """True only for versioned CC0 and CC BY. NC, SA, ND, DF20, and a missing license are not."""
    return not excluded_from_publication(row)
