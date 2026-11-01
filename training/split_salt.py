"""Salt for the train/val/test identity key. The salt is not stored in the repo."""

from __future__ import annotations

import hashlib
import os
from collections.abc import Mapping
from pathlib import Path

from manifest import ROOT

SALT_ENV = "GRZYBOBRANIE_SPLIT_SALT"
SALT_FILE_ENV = "GRZYBOBRANIE_SPLIT_SALT_FILE"


class SplitSaltError(RuntimeError):
    """The split salt is missing, empty, or points at a file inside the repository."""


def _inside_repo(path: Path) -> bool:
    try:
        path.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return False
    return True


def default_salt_path(home: Path | None = None) -> Path:
    """Local file outside the repo. Nothing in the repository is read as the salt."""
    base = Path.home() if home is None else home
    return base / ".config" / "grzybobranie" / "split_salt"


def salt_fingerprint(salt: str) -> str:
    """First 8 hex digits of sha256(salt). The salt itself is not returned."""
    if not isinstance(salt, str) or not salt.strip():
        raise SplitSaltError("Split salt is missing, so it cannot be fingerprinted.")
    return hashlib.sha256(salt.strip().encode("utf-8")).hexdigest()[:8]


def load_split_salt(environ: Mapping[str, str] | None = None, home: Path | None = None) -> str:
    """Read the salt from the environment or from a file outside the repository.

    ``GRZYBOBRANIE_SPLIT_SALT`` wins. Otherwise the file named by
    ``GRZYBOBRANIE_SPLIT_SALT_FILE`` is read, or ``~/.config/grzybobranie/split_salt``
    when that variable is unset. A path inside this repository is refused.
    """
    env = os.environ if environ is None else environ
    raw = env.get(SALT_ENV)
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    file_setting = env.get(SALT_FILE_ENV)
    if isinstance(file_setting, str) and file_setting.strip():
        path = Path(file_setting.strip()).expanduser()
    else:
        path = default_salt_path(home)
    if _inside_repo(path):
        raise SplitSaltError(
            f"Split salt file {path} is inside the repository. "
            f"Set {SALT_ENV}, or set {SALT_FILE_ENV} to a file outside the repo. "
            "The salt must not be committed."
        )
    if not path.is_file():
        raise SplitSaltError(
            "Split salt is missing. Set the "
            f"{SALT_ENV} environment variable, write the salt to {path}, "
            f"or set {SALT_FILE_ENV} to a file outside the repository. "
            "The salt is not stored in the repo."
        )
    salt = path.read_text(encoding="utf-8").strip()
    if not salt:
        raise SplitSaltError(f"Split salt file {path} is empty.")
    return salt
