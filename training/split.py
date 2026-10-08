"""Train/val/test split grouped so near-duplicate field photos stay together.

The group is the recorder, a 0.01-degree grid (about 1.1 km north-south),
and the calendar day, when those fields exist. Otherwise the group is the
GBIF occurrence. Photos from one group never land in two splits.
"""

from __future__ import annotations

import math
import random
from collections import defaultdict


def collector_group_key(record: dict) -> str:
    """Recorder + ~1 km grid + day, or the occurrence when that is missing."""
    recorded = " ".join(str(record.get("recorded_by") or "").casefold().split())
    day = str(record.get("event_date") or "")[:10]
    lat = record.get("decimal_latitude")
    lon = record.get("decimal_longitude")
    class_id = record.get("class_id") or ""
    if recorded and len(day) == 10 and day[4] == "-" and day[7] == "-" and lat is not None and lon is not None:
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            lat_f = float("nan")
            lon_f = float("nan")
        if math.isfinite(lat_f) and math.isfinite(lon_f):
            lat_bin = round(lat_f / 0.01) * 0.01
            lon_bin = round(lon_f / 0.01) * 0.01
            taxon = str(record.get("taxon_name") or record.get("queried_name") or "")
            return f"collector:{class_id}:{taxon}:{recorded}:{lat_bin:.2f}:{lon_bin:.2f}:{day}"
    return f"occurrence:{class_id}:{record.get('occurrence_key')}"


def split_key_summary(records: list[dict]) -> dict[str, int]:
    collector = sum(1 for record in records if collector_group_key(record).startswith("collector:"))
    return {
        "collector_grid_day": collector,
        "occurrence_fallback": len(records) - collector,
    }


def split_by_observation(
    records: list[dict],
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> dict[str, list[dict]]:
    if val_ratio < 0 or test_ratio < 0 or val_ratio + test_ratio >= 1:
        raise ValueError("val and test ratios must leave a non-empty train share")

    held_out = [record for record in records if record.get("held_out_taxon")]
    records = [record for record in records if not record.get("held_out_taxon")]
    grouped = defaultdict(lambda: defaultdict(list))
    for record in records:
        grouped[record["class_id"]][collector_group_key(record)].append(record)

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
    # Taxa marked held_out_taxon never enter train or val. Their test score is
    # generalization to fungi (or non-fungi) the model was not trained on.
    for record in held_out:
        splits["test"].append(record)
    _assert_occurrence_integrity(splits)
    return splits


def _assert_occurrence_integrity(splits: dict[str, list[dict]]) -> None:
    seen: dict[str, str] = {}
    for name, records in splits.items():
        for record in records:
            key = collector_group_key(record)
            previous = seen.get(key)
            if previous is not None and previous != name:
                raise RuntimeError(f"photo group {key} leaked into both {previous} and {name}")
            seen[key] = name
