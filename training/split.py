"""Train/val/test split grouped by GBIF occurrence.

Photos from the same observation never land in two splits.
"""

from __future__ import annotations

import random
from collections import defaultdict


def split_by_observation(
    records: list[dict],
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> dict[str, list[dict]]:
    if val_ratio < 0 or test_ratio < 0 or val_ratio + test_ratio >= 1:
        raise ValueError("val and test ratios must leave a non-empty train share")

    grouped: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for record in records:
        class_id = record["class_id"]
        occurrence = str(record["occurrence_key"])
        grouped[class_id][occurrence].append(record)

    splits: dict[str, list[dict]] = {"train": [], "val": [], "test": []}
    for class_id in sorted(grouped):
        observations = list(grouped[class_id].values())
        rng = random.Random(f"{seed}:{class_id}")
        rng.shuffle(observations)
        total_images = sum(len(group) for group in observations)
        test_target = round(total_images * test_ratio)
        val_target = round(total_images * val_ratio)
        test_count = 0
        val_count = 0
        # Fewer than three observations: keep everything in train and let the
        # ship gate fail for lack of a real held-out set.
        if len(observations) < 3:
            for group in observations:
                splits["train"].extend(group)
            continue
        for index, group in enumerate(observations):
            remaining = observations[index:]
            remaining_images = sum(len(item) for item in remaining)
            if test_count < test_target and (total_images - test_count - len(group)) > 0:
                splits["test"].extend(group)
                test_count += len(group)
            elif val_count < val_target and remaining_images > len(group):
                splits["val"].extend(group)
                val_count += len(group)
            else:
                splits["train"].extend(group)
    _assert_occurrence_integrity(splits)
    return splits


def _assert_occurrence_integrity(splits: dict[str, list[dict]]) -> None:
    seen: dict[tuple[str, str], str] = {}
    for name, records in splits.items():
        for record in records:
            key = (record["class_id"], str(record["occurrence_key"]))
            previous = seen.get(key)
            if previous is not None and previous != name:
                raise RuntimeError(f"occurrence {key} leaked into both {previous} and {name}")
            seen[key] = name
