> **PRZESTARZAŁE (2026-11-10).** Ten dokument opisuje kontrakt prototypu: 54 wyjścia (52 gatunki + `unknown_mushroom` + `not_a_mushroom`) oraz `class_cap` 2500 dla klas zbiorczych. Obowiązująca decyzja mini+: do 67 wyjść gatunkowych (cel 67), bez klas zbiorczych, odrzucanie progiem energii (OOD), gatunki bez danych w `uncoveredSpecies` manifestu. Potoku treningowego nie przepisujemy — prowadzi go osobny bot. Aktualny kontrakt aplikacji: [`schemas/model-manifest.schema.json`](../schemas/model-manifest.schema.json) (szkic v1.0.0-draft). Szczegóły cięcia: [`ml/OUTDATED.md`](OUTDATED.md).

# Machine Learning Data Contract — Grzybobranie AI 🍄📋

This document specifies the authoritative data contract between dataset preparation (`@agent-data-curator`) and model training / evaluation (`@agent-trainer`).

---

## 1. Security & Storage Boundaries

1. **No Raw Datasets in Git**: CSV manifests (`*_v3.csv`, `*_by_nc.csv`, `*_by_sa.csv`), raw images (`.jpg`, `.png`, `.webp`), and external archives (`DF20`/`DF24`) must **never** be committed to Git.
2. **Remote Storage**: Master training archives reside in the private Hugging Face repository `lonwi/grzybobranie-zdjecia` and the OneDrive archive.
3. **Local Processing Directories**:
   - `ml/data/`: Intermediate JSONL manifests, split maps, and deduplication caches (gitignored).
   - `ml/artifacts/`: Trained models, metrics, and export artifacts (gitignored).

---

## 2. External CSV Ingestion Schema (`ml/import_external.py`)

When importing external per-species CSV manifests from tabular providers (iNaturalist, GBIF, Wikimedia Commons, Danish Fungi 2020), each row must provide:

### Required Fields

| Column Name | Type | Description | Validation Rules |
|---|---|---|---|
| `species` | String | Botanical binomial name | Must resolve to accepted name in `assets/models/labels.json` or manifest aliases (`_SPECIES_ALIASES`). |
| `image_url` | String | Source photo URL | Must use `https://`. Insecure `http://` URLs are dropped. |
| `author` | String | Creator / rights holder | Non-empty. Must not match placeholder strings (`unknown`, `anonymous`, `inaturalist`, `wikimedia`, `none`, `-`, `?`). |
| `license` | String | Textual license label | Must normalize to an approved versioned key (e.g. `CC BY 4.0`, `CC0 1.0`, `CC BY-NC 4.0`, `CC BY-SA 4.0`). |
| `license_url` | String | License deed URL | **Mandatory** for all CC licenses. Must be an `https://creativecommons.org/...` URL matching the exact license and version declared in `license`. |

### Disambiguation & Grouping Fields

Used to prevent data leakage across train/val/test splits and detect duplicate photos across providers:

| Column Name | Type | Purpose |
|---|---|---|
| `source_url` | String | Observation or occurrence web page. Rewritten to `https://`. |
| `inat_observer` / `recorded_by` | String | Observer username or collector name. Groups observations by photographer. |
| `inat_observation_id` | String / Int | iNaturalist observation ID. |
| `inat_photo_id` | String / Int | iNaturalist photo ID. |
| `mo_observation_id` | String / Int | Mushroom Observer observation ID. |
| `occurrence_key` | String | GBIF occurrence ID. |
| `commons_file` | String | Wikimedia Commons file title. |
| `identificationVerificationStatus` | String | Identification status. Kept only if empty, `Approved \| Expert \| Evidence`, or `Confident`. |
| `id_confidence` | String | Provider confidence label (`commons_category`, `gbif_no_status`, `gbif_not_validated`). |

---

## 3. Licensing Policy & Usage Routing

Codified in `ml/license_policy.py`. Licenses are matched **in full** by exact ID (never by prefix).

| License Key | Classification | App UI Display (`is_publishable`) | Model Training (`usage`) | Releases (`shippable`) |
|---|---|---|---|---|
| `cc0-1.0` | Permissive | ✅ Allowed | ✅ Allowed | ✅ Shippable |
| `cc-by-1.0` .. `cc-by-4.0` | Attribution | ✅ Allowed | ✅ Allowed | ✅ Shippable |
| `cc-by-nc-1.0` .. `cc-by-nc-4.0` | Non-Commercial | ❌ Forbidden | ✅ `training_only` | ✅ Shippable (weights only) |
| `cc-by-sa-1.0` .. `cc-by-sa-4.0` | Share-Alike | ❌ Forbidden | ✅ `training_only` | ✅ Shippable (weights only) |
| `df20` (Danish Fungi 2020) | Experimental | ❌ Forbidden | ⚠️ Opt-in (`--include-df20`) | ❌ **Blocks release** (`shippable=false`) |
| ND, NC-ND, NC-SA | Prohibited | ❌ Forbidden | ❌ Rejected | ❌ Rejected |
| Unversioned / Missing / HTTP | Invalid | ❌ Forbidden | ❌ Rejected | ❌ Rejected |

### License Conflict Resolution

When the same photo or observation exists under multiple licenses:
1. **Stricter license wins**: `NC` / `DF20` / `SA` > `CC BY` > `CC0`.
2. Public domain (CC0) copy does not erase attribution duty from a CC BY copy (`dropped_looser_license`).
3. If any copy has a rejected license (e.g. ND), all copies are dropped (`dropped_rejected_license_copy`).

---

## 4. Split Strategy & Data Leakage Prevention (`ml/split.py`)

To prevent optimistic bias and test set leakage:

1. **Connected Component Grouping**:
   - All photos sharing a photographer (`inat_observer`, `recorded_by`, `author`) or an observation ID (`inat_observation_id`, `mo_observation_id`, `occurrence_key`) belong to a single connected component.
   - The entire component is assigned together to one of **Train (70%)**, **Validation (15%)**, or **Test (15%)**.
   - Assignment uses HMAC-SHA256 with `GRZYBOBRANIE_SPLIT_SALT`.
2. **Collector Cap**: Maximum 30 photos per observer/author within a single species class (`--max-per-collector`).
3. **Atlas Gallery Exclusion**:
   - Photos listed in `ml/gallery_exclusion.json` (reference photos shown in the mobile atlas) are strictly excluded from validation and test splits (`assert_gallery_absent_from_test`).
4. **Perceptual Deduplication**:
   - Perceptual hashing (aHash, dHash, pHash) identifies cropped or resized duplicates. Duplicates are kept in the same split or pruned.

---

## 5. Model Architecture & Preprocessing (`ml/preprocess.py`)

The mobile runtime (`src/services/imagePreprocess.ts`) and Python training pipeline (`ml/preprocess.py`) must follow identical preprocessing:

- **Input Dimensions**: 224 × 224 pixels, 3 channels (RGB).
- **EXIF Orientation**: Handled before resizing (canonical upright orientation).
- **Aspect Ratio & Resize**: Area-based resize to 224 × 224.
- **Normalization Formula**:
  $$\text{normalized} = \frac{\text{pixel}}{127.5} - 1.0 \quad \in [-1.0, 1.0]$$
- **Network Backbone**: MobileNetV3-Small.
- **Output Classes**: 54 classes (52 species + `unknown_mushroom` + `not_a_mushroom`).

---

## 6. Edge Model Export & Ship Gates (`ml/ship_gates.py`)

Before an exported model (`mushrooms_model.tflite`) can be installed into `assets/models/`, all gates must pass:

1. **Accuracy Floors**:
   - Macro Top-1 Accuracy: $\ge 0.80$
   - Macro Top-3 Accuracy: $\ge 0.90$
   - High-Stakes Poisonous Species Top-1: $\ge 0.85$ (Amanita phalloides, Amanita virosa, Cortinarius rubellus, Galerina marginata, Gyromitra esculenta).
2. **Class Balance**: Minimum 40 training photos per species after deduplication.
3. **Quantization Agreement**: TFLite vs. FP32 agreement $\ge 0.99$.
4. **Attribution File**: `attributions.jsonl` must be generated alongside the model containing `creator`, `license_url`, `source`, and normalized license.
5. **No Blockers**: Zero DF20 rows and zero unverified rows in the released model.
