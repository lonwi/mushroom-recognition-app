"""Which http URLs are proven to be the same resource over https.

The proof is ``fixtures/https_host_equivalence.json``, written once by
``capture_https_equivalence.py``. Unit tests read the file. They do not
download it.

A host is allowlisted only when every captured sample returned 2xx on both
schemes and both bodies share a SHA-256. That allowlist is not a licence to
rewrite every URL on the host. ``upgrade_verified_url`` calls
``force_https_url`` only for a URL whose host, path, and query are one of
those samples.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlsplit

from url_safety import force_https_url

FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "https_host_equivalence.json"
_CACHE: dict | None = None


def load_equivalence_fixture(path: Path | None = None) -> dict:
    """Load the capture. The default path is cached for the process."""
    global _CACHE
    if path is None and _CACHE is not None:
        return _CACHE
    file = FIXTURE_PATH if path is None else path
    payload = json.loads(file.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("https equivalence fixture must be an object")
    if path is None:
        _CACHE = payload
    return payload


def clear_fixture_cache() -> None:
    global _CACHE
    _CACHE = None


def sample_matches(sample: dict) -> bool:
    """True when both responses are 2xx and the body hashes are equal."""
    if not isinstance(sample, dict):
        return False
    http_status = sample.get("http_status")
    https_status = sample.get("https_status")
    http_sha = sample.get("http_sha256")
    https_sha = sample.get("https_sha256")
    if isinstance(http_status, bool) or isinstance(https_status, bool):
        return False
    if not isinstance(http_status, int) or not isinstance(https_status, int):
        return False
    if not (200 <= http_status < 300 and 200 <= https_status < 300):
        return False
    return isinstance(http_sha, str) and len(http_sha) == 64 and http_sha == https_sha


def allowlisted_hosts(fixture: dict | None = None) -> frozenset[str]:
    """Hosts whose every sample matched. A mismatched sample excludes the host."""
    payload = load_equivalence_fixture() if fixture is None else fixture
    hosts = payload.get("hosts") if isinstance(payload, dict) else None
    if not isinstance(hosts, dict):
        return frozenset()
    good: set[str] = set()
    for host, block in hosts.items():
        if not isinstance(host, str) or not isinstance(block, dict):
            continue
        samples = block.get("samples")
        if not isinstance(samples, list) or not samples:
            continue
        if all(sample_matches(sample) for sample in samples):
            good.add(host.lower())
    return frozenset(good)


def resource_key(url: str) -> tuple[str, str, str] | None:
    """Host, path, and query. The scheme is not part of the identity."""
    if not isinstance(url, str) or not url.strip():
        return None
    parts = urlsplit(url.strip())
    host = (parts.hostname or "").lower()
    if parts.scheme.lower() not in ("http", "https") or not host:
        return None
    return (host, parts.path, parts.query)


def verified_resources(fixture: dict | None = None) -> dict[tuple[str, str, str], dict]:
    """Samples that matched, keyed by host, path, and query."""
    payload = load_equivalence_fixture() if fixture is None else fixture
    allowed = allowlisted_hosts(payload)
    hosts = payload.get("hosts") if isinstance(payload, dict) else None
    if not isinstance(hosts, dict):
        return {}
    index: dict[tuple[str, str, str], dict] = {}
    for host, block in hosts.items():
        if not isinstance(host, str) or host.lower() not in allowed or not isinstance(block, dict):
            continue
        for sample in block.get("samples") or []:
            if not sample_matches(sample):
                continue
            key = resource_key(str(sample.get("url") or ""))
            if key is not None and key[0] == host.lower():
                index[key] = sample
    return index


def upgrade_verified_url(url: str, fixture: dict | None = None) -> tuple[str, str | None]:
    """Return ``(url, reason)``.

    An empty value and an https URL are unchanged. ``force_https_url`` runs
    only when this exact resource is a matching sample. Any other http URL is
    left unchanged and comes back with a reason, including a different path on
    an allowlisted host.
    """
    if not isinstance(url, str):
        return url, None
    text = url.strip()
    if not text:
        return url, None
    parts = urlsplit(text)
    scheme = parts.scheme.lower()
    if scheme == "https":
        return url, None
    host = (parts.hostname or "").lower()
    if scheme != "http" or not host:
        return url, "url_not_https"
    payload = load_equivalence_fixture() if fixture is None else fixture
    if host not in allowlisted_hosts(payload):
        return url, "http_host_not_allowlisted"
    if resource_key(text) not in verified_resources(payload):
        return url, "https_not_verified_for_url"
    return force_https_url(text), None
