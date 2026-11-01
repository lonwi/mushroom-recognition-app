# Per-image attribution

`training/fetch_gbif.py` writes one JSON object per accepted photo to `training/data/attributions.jsonl` (gitignored; created on the training machine).

`training/export_tflite.py` writes the rows that actually entered train, val, and test to `training/artifacts/attributions.jsonl`. Installing a model that passed the ship gates copies that file to `assets/models/attributions.jsonl`. That is the file the app can show later. Each line has the creator, the license, the normalized license id, the image URL, and a source page.

Required fields:

| Field | Meaning |
| --- | --- |
| `creator` | Photographer or rights holder. CC-BY needs this. |
| `license` | License string from the GBIF media object. |
| `license_normalized` | `cc0-…` or `cc-by-…` for a photo shown in the app. `cc-by-nc…`, ND, SA, and `df20` are not publishable. |
| `license_url` | Copied from that row's own `license_url`. It is not rebuilt from the licence id. Empty when the row has none, including DF20. |
| `image_url` | Direct photo URL that was downloaded. |
| `source_url` | Publisher page, usually an iNaturalist observation. |
| `gbif_occurrence` | `https://www.gbif.org/occurrence/{key}` |
| `class_id` | Class in `assets/models/labels.json`. |
| `occurrence_key` | Split key. All photos from one occurrence stay in one split. |
| `country` | ISO country when GBIF has one. |
| `region_scope` | `central_europe` or `global_fill`. |

`attribution_row` writes a slimmer line. It always includes `license_normalized` and `license_url` (the row's own URL, empty when the row has none, including DF20). It also copies every field `is_df20_row` reads, from the single tuple `DF20_DETECTION_FIELDS` in `training/publication.py`: `source`, `license_normalized`, `df20_image_path`, `ImageUniqueID`, `df20_image_id`, `licence_note`, `license_note`, `dataset`, and `collection`. A field in that tuple is written when the training row sets it. The release gate reads this exported file, so a row that is Danish Fungi 2020 only because of one of those markers still sets `shippable` false. A missing or unreadable `attributions.jsonl` blocks as well. CC BY-SA does not block `shippable`.

The ship gate refuses to copy a model into the app if any training image is missing a creator, an allowed licence, an image URL, or a source page. Training data for a released model may include CC BY-NC and versioned CC BY-SA photos as well as CC0 and CC BY; photos shown in the app stay CC0 or CC BY. Ship the jsonl next to any released model.

Installing a model that passed the ship gates rewrites `src/services/attributionPackage.ts` from that jsonl. Settings has a photo-credits control (`btn-photo-credits`) that lists creator, license, taxon, and source page. Until a model is installed the module stays `null` and the screen says there is no credit list. Polish is the default; English uses the same keys.
