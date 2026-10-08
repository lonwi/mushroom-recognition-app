# Per-image attribution

`training/fetch_gbif.py` writes one JSON object per accepted photo to `training/data/attributions.jsonl` (gitignored; created on the training machine).

`training/export_tflite.py` writes the rows that actually entered train, val, and test to `training/artifacts/attributions.jsonl`. Installing a model that passed the ship gates copies that file to `assets/models/attributions.jsonl`. That is the file the app can show later. Each line has the creator, the license, the normalized license id, the image URL, and a source page.

Required fields:

| Field | Meaning |
| --- | --- |
| `creator` | Photographer or rights holder. CC-BY needs this. |
| `license` | License string from the GBIF media object. |
| `license_normalized` | `cc0-…` or `cc-by-…`. Anything else is not written. |
| `image_url` | Direct photo URL that was downloaded. |
| `source_url` | Publisher page, usually an iNaturalist observation. |
| `gbif_occurrence` | `https://www.gbif.org/occurrence/{key}` |
| `class_id` | Class in `assets/models/labels.json`. |
| `occurrence_key` | Split key. All photos from one occurrence stay in one split. |
| `country` | ISO country when GBIF has one. |
| `region_scope` | `central_europe` or `global_fill`. |

The ship gate refuses to copy a model into the app if any training image is missing a creator, a CC0/CC-BY license, an image URL, or a source page. Ship the jsonl next to any released model. The settings screen names this file.
