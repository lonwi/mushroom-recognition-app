"""Interval estimates for ship gates.

Wilson score intervals are used for rates. A seeded binomial bootstrap is
used for per-taxon recall, where the sample inside one taxon is small.
"""

from __future__ import annotations

import math

# 97.5 percentile of the standard normal. The interval is 95%.
_WILSON_Z = 1.959963984540054


def wilson_interval(successes: int, total: int, z: float = _WILSON_Z) -> tuple[float, float]:
    """Two-sided 95% Wilson interval for a binomial rate. Bounds stay in [0, 1]."""
    if total < 1:
        raise ValueError("Wilson interval needs at least one trial")
    if successes < 0 or successes > total:
        raise ValueError("successes must lie between 0 and total")
    proportion = successes / total
    z2 = z * z
    denominator = 1.0 + z2 / total
    center = (proportion + z2 / (2.0 * total)) / denominator
    margin = z * math.sqrt((proportion * (1.0 - proportion) + z2 / (4.0 * total)) / total) / denominator
    return (max(0.0, center - margin), min(1.0, center + margin))


def _bootstrap_rates(successes: int, total: int, *, seed: int, draws: int):
    if total < 1:
        raise ValueError("bootstrap needs at least one trial")
    if successes < 0 or successes > total:
        raise ValueError("successes must lie between 0 and total")
    if draws < 20:
        raise ValueError("bootstrap needs at least 20 draws")
    import numpy as np

    proportion = successes / total
    return np.random.default_rng(seed).binomial(total, proportion, size=draws) / total


def bootstrap_rate_lower(successes: int, total: int, *, seed: int = 0, draws: int = 1000) -> float:
    """5th percentile of a binomial bootstrap of successes/total. The 95% lower bound."""
    return float(np_quantile(_bootstrap_rates(successes, total, seed=seed, draws=draws), 0.05))


def bootstrap_rate_upper(successes: int, total: int, *, seed: int = 0, draws: int = 1000) -> float:
    """95th percentile of a binomial bootstrap of successes/total. The 95% upper bound.

    A sample with zero successes collapses to 0. The Wilson upper bound is the
    interval to quote for a zero count; this percentile is still reported.
    """
    return float(np_quantile(_bootstrap_rates(successes, total, seed=seed, draws=draws), 0.95))


def np_quantile(samples, quantile: float) -> float:
    import numpy as np

    return float(np.quantile(samples, quantile))
