"""Salt used only by unit tests.

Production reads ``GRZYBOBRANIE_SPLIT_SALT`` or a file outside the repository.
This value is not a secret and is not the default in ``split.py``.
"""

FIXTURE_SALT = "unit-test-split-salt-not-used-in-production"
