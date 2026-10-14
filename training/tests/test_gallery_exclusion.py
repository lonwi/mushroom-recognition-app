"""Atlas gallery photos stay out of the prepare step's test split."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gallery_exclusion import (
    canonical_url,
    load_gallery_exclusion,
    record_matches_gallery,
)
from gallery_exclusion import GalleryExclusion
from prepare_data import assign_splits
from split import split_by_observation

DEATH_CAP = "https://inaturalist-open-data.s3.amazonaws.com/photos/318776310/original.jpg"
COMMONS = "https://upload.wikimedia.org/wikipedia/commons/f/ff/Cortinarius_orellanus.jpg"


def _exclusion() -> GalleryExclusion:
    return GalleryExclusion(
        image_urls=frozenset({canonical_url(DEATH_CAP), canonical_url(COMMONS)}),
        photo_ids=frozenset({"318776310"}),
        inat_ids=frozenset({"182790926"}),
        mo_ids=frozenset({"555"}),
    )


def _filler(index: int) -> dict:
    return {
        "class_id": "amanita_phalloides",
        "occurrence_key": index,
        "image_url": f"https://images.example.test/{index}.jpg",
        "recorded_by": f"person {index}",
        "event_date": "2024-09-01",
        "decimal_latitude": 50.0 + index,
        "decimal_longitude": 19.0,
    }


class GalleryExclusionTest(unittest.TestCase):
    def test_checked_in_list_names_urls_and_inaturalist_observations(self):
        exclusion = load_gallery_exclusion()
        self.assertIn(canonical_url(DEATH_CAP), exclusion.image_urls)
        self.assertIn("318776310", exclusion.photo_ids)
        self.assertIn("182790926", exclusion.inat_ids)
        self.assertIn(canonical_url(COMMONS), exclusion.image_urls)
        self.assertEqual(exclusion.mo_ids, frozenset())
        self.assertGreater(len(exclusion.image_urls), 100)

    def test_image_url_mo_observation_id_and_inaturalist_observation_id(self):
        exclusion = _exclusion()
        self.assertTrue(record_matches_gallery({"image_url": DEATH_CAP}, exclusion))
        self.assertTrue(
            record_matches_gallery(
                {"image_url": "https://static.inaturalist.org/photos/318776310/large.jpg"},
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {"image_url": COMMONS + "?download"},
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {"mo_observation_id": "555", "image_url": "https://images.example.test/mo.jpg"},
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {
                    "mo_observation_id": 182790926,
                    "image_url": "https://images.example.test/same-digits.jpg",
                },
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {
                    "image_url": "https://gbif.example/mirror.jpg",
                    "source_url": "https://www.inaturalist.org/observations/182790926",
                },
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {
                    "image_url": "https://images.example.test/catalog.jpg",
                    "catalogNumber": "182790926",
                    "dataset": "iNaturalist research-grade observations",
                },
                exclusion,
            )
        )
        self.assertFalse(
            record_matches_gallery(
                {"image_url": "https://images.example.test/catalog.jpg", "catalogNumber": "182790926"},
                exclusion,
            )
        )
        self.assertTrue(
            record_matches_gallery(
                {
                    "image_url": "https://images.example.test/mo-page.jpg",
                    "source_url": "https://mushroomobserver.org/observations/555",
                },
                exclusion,
            )
        )
        self.assertFalse(
            record_matches_gallery({"image_url": "https://images.example.test/nope.jpg", "mo_observation_id": "999"}, exclusion)
        )

    def test_blocked_group_stays_together_and_out_of_test(self):
        exclusion = _exclusion()
        records = [_filler(index) for index in range(12)]
        records.append(
            {
                **_filler(4),
                "image_url": "https://static.inaturalist.org/photos/318776310/original.jpg",
            }
        )
        splits = split_by_observation(
            records,
            test_blocked=lambda row: record_matches_gallery(row, exclusion),
        )
        test_keys = {row["occurrence_key"] for row in splits["test"]}
        self.assertNotIn(4, test_keys)
        homes = [name for name, rows in splits.items() if any(row["occurrence_key"] == 4 for row in rows)]
        self.assertEqual(len(homes), 1)
        self.assertNotEqual(homes[0], "test")
        self.assertEqual(sum(1 for row in splits[homes[0]] if row["occurrence_key"] == 4), 2)
        self.assertGreater(len(splits["test"]), 0)

    def test_held_out_gallery_match_is_not_forced_into_test(self):
        exclusion = _exclusion()
        gallery = {
            "class_id": "unknown_mushroom",
            "held_out_taxon": True,
            "occurrence_key": 1,
            "image_url": "https://static.inaturalist.org/photos/318776310/original.jpg",
        }
        other = {
            "class_id": "unknown_mushroom",
            "held_out_taxon": True,
            "occurrence_key": 2,
            "image_url": "https://images.example.test/other.jpg",
        }
        splits = split_by_observation(
            [gallery, other],
            test_blocked=lambda row: record_matches_gallery(row, exclusion),
        )
        self.assertIn(other, splits["test"])
        self.assertNotIn(gallery, splits["test"])
        self.assertIn(gallery, splits["train"])

    def test_prepare_keeps_the_checked_in_photos_out_of_test(self):
        exclusion = load_gallery_exclusion()
        sample_url = next(iter(exclusion.image_urls))
        sample_id = next(iter(exclusion.inat_ids))
        records = [_filler(index) for index in range(16)]
        listed = {**_filler(100), "image_url": sample_url, "recorded_by": "person 100"}
        mirrored = {
            **_filler(101),
            "image_url": "https://gbif.example/mirror.jpg",
            "source_url": f"https://www.inaturalist.org/observations/{sample_id}",
            "recorded_by": "person 101",
        }
        records.extend([listed, mirrored])
        splits = assign_splits(records)
        test_urls = {row["image_url"] for row in splits["test"]}
        self.assertNotIn(sample_url, test_urls)
        self.assertNotIn(mirrored["image_url"], test_urls)
        self.assertGreater(len(splits["test"]), 0)


if __name__ == "__main__":
    unittest.main()
