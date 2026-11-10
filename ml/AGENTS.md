> **PRZESTARZAŁE (2026-11-10).** Ten dokument opisuje kontrakt prototypu: 54 wyjścia (52 gatunki + `unknown_mushroom` + `not_a_mushroom`) oraz `class_cap` 2500 dla klas zbiorczych. Obowiązująca decyzja mini+: do 67 wyjść gatunkowych (cel 67), bez klas zbiorczych, odrzucanie progiem energii (OOD), gatunki bez danych w `uncoveredSpecies` manifestu. Potoku treningowego nie przepisujemy — prowadzi go osobny bot. Aktualny kontrakt aplikacji: [`schemas/model-manifest.schema.json`](../schemas/model-manifest.schema.json) (szkic v1.0.0-draft). Szczegóły cięcia: [`ml/OUTDATED.md`](OUTDATED.md).

# Machine Learning (ML) Agent Instructions — Grzybobranie AI 🍄🤖

This document defines specialized AI agent instructions for the Python Machine Learning pipeline in `ml/`.

---

## 1. Security & Data Boundaries (Mandatory)

1. **No Raw Data in Git:** NEVER commit `.csv` manifests (`*_v3.csv`, `*_by_nc.csv`, `*_by_sa.csv`), raw images (`.jpg`, `.png`, `.webp`), or local datasets (`DF20`/`DF24`) to Git. All training datasets reside remotely in the private Hugging Face repository `lonwi/grzybobranie-zdjecia` and the OneDrive archive. Local processing happens in `ml/data/` and `ml/artifacts/` (both gitignored).
2. **License Constraints:**
   - Only `CC0` and versioned `CC BY` photos may be bundled or displayed in the mobile app UI (`src/`).
   - `CC BY-NC`, `CC BY-SA` (versioned `1.0`, `2.0`, `2.5`, `3.0`, `4.0`), and `pd-self` are restricted strictly to model training (`usage=training_only`).
   - `DF20` (Danish Fungi 2020) is experimental only (`--include-df20`) and always sets `shippable=false`.
   - Never ingest or permit ND (No-Derivatives), NC-SA, NC-ND, or unlicensed media.
3. **Data Contract**: Follow the authoritative schema, split matrix, and normalization formula defined in [`ml/DATA_CONTRACT.md`](DATA_CONTRACT.md).
4. **Environment & Testing:**
   - Python 3.12+ / 3.14 (`.python-version`).
   - Dependencies: `ml/requirements.txt` and `ml/requirements-dev.txt`.
   - Run tests: `python -m unittest discover -s ml/tests -v`.

---

## 2. Specialized Agents

### `@agent-data-curator` (Dataset Preparation & Taxonomic Curation)
```text
ROLE: ML Dataset Curator (@agent-data-curator)
SCOPE: ml/fetch_gbif.py, ml/import_external.py, ml/import_local_images.py, ml/prepare_data.py, ml/licenses.py, ml/license_policy.py, ml/gallery_exclusion.py, ml/dedup.py
MISSION: Acquire, validate, dedup, and split mushroom imagery under strict licensing and taxonomic integrity rules.
RULES:
1. No Raw Files in Repository: Never stage or commit downloaded photos, CSVs, or uncompressed datasets to Git.
2. Licensing Guardrails: Accept only versioned CC0, CC BY, CC BY-NC, CC BY-SA (versioned 1.0–4.0). Reject unversioned IDs, ND, NC-SA, and unlicensed content.
3. Verification Filter: Discard unverified GBIF occurrences. Keep only empty status, 'Approved | Expert | Evidence', and 'Confident'.
4. Data Leakage Prevention: Exclude all gallery photos defined in ml/gallery_exclusion.json from validation and test splits.
5. Deduplication: Group occurrences by observer/observation identity and perceptual hash (aHash, dHash, pHash). Never allow the same specimen across train and test splits.
```

### `@agent-trainer` (Model Training, OOD Calibration & TFLite Export)
```text
ROLE: Model Training & Edge Deployment Specialist (@agent-trainer)
SCOPE: ml/train.py, ml/evaluate.py, ml/export_tflite.py, ml/ship_gates.py, ml/preprocess.py, ml/recognition_math.py
MISSION: Train MobileNetV3 models, calibrate out-of-distribution energy gates, evaluate against high-stakes safety floors, and export optimized TFLite artifacts.
RULES:
1. Architecture & Preprocessing: MobileNetV3-Small backbone with 224x224 RGB input normalized by ((pixel / 127.5) - 1). 54 output classes (52 species + unknown_mushroom + not_a_mushroom).
2. OOD Energy Calibration: Energy score E(x) = -T * logsumexp(logits / T). Calibrated order-statistic threshold on validation split (minimum 90% open-set rejection).
3. Ship Gates Verification: ml/ship_gates.py enforces non-negotiable gates:
   - Macro top-1 >= 0.80, macro top-3 >= 0.90
   - At least 40 training images per species after deduplication
   - High-stakes poisonous species top-1 >= 0.85
   - TFLite vs FP32 agreement >= 0.99
   - Any DF20 image or missing attribution blocks release immediately.
4. Export Integrity: Write attributions.jsonl alongside exported mushrooms_model.tflite. Never install failing or uncalibrated models into assets/models/.
```
