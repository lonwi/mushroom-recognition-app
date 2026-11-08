# Grzybobranie AI 🍄📱
### Offline Mobile Mushroom Recognition App for Android & iOS (On-Device AI)

> 🇵🇱 [Polska wersja](README.md)

An application designed for foraging enthusiasts in Poland and Central Europe. Operates **100% offline** (deep in the forest without cellular network coverage or internet access).

---

## 🌟 Key Features

1. **Scanner (Camera & Gallery)**:
   - Photos from the camera or gallery are not yet classified by default. `assets/models/labels.json` serves as the class contract, not the network weights. Without `mushrooms_model.tflite` bundled and rejection gates calibrated, the scanner honestly displays "recognition unavailable".
   - Training pipeline (MobileNetV3-Small under Apache-2.0, TFLite export) is located in `ml/`. Details in `ml/README.md`.
   - Once a calibrated model is bundled, the scanner presents the top 3 candidate species with confidence percentages, without issuing an edibility verdict. Detections of Amanita, Cortinarius, Galerina, or Gyromitra or low confidence levels display a mandatory warning advising consultation with a certified mycologist or Sanepid station. Out-of-distribution inputs (e.g., a pet photo or non-fungus) are rejected without a species label.
   - Reticle with macro framing guidance (cap, underside, stipe) and flashlight toggle are integrated into the scanner viewfinder.

2. **Safety Engine & Look-Alike Alerts**:
   - Distinct edibility classifications: 🟢 **Edible**, 🟡 **Inedible**, 🔴 **Poisonous**, ☠️ **Deadly Poisonous**.
   - **Look-Alike Risk Card**: Instant warnings for easily confused species pairs (e.g., *Parasol Mushroom vs. Death Cap / Destroying Angel*, *Porcini vs. Bitter Bolete*, *Chanterelle vs. False Chanterelle*).
   - Side-by-side morphological differences (movable ring, volva at base, gill/pore coloration, bruising reactions).

3. **Offline Mushroom Atlas**:
   - Curated species profiles from `src/data/mushrooms.ts` focusing on common European species. Does not replace certified mycological inspection.
   - Search by Polish, Latin, and vernacular names.
   - Multi-facet filtering by edibility tier and hymenophore structure (pores, gills, spines, ridges).
   - Seasonality calendar and forest habitat characteristics.
   - Culinary preparation advice displayed exclusively for verified edible species.

4. **Forager's Journal (Offline GPS)**:
   - Log mushroom finds with photos, timestamps, and notes.
   - Store offline GPS coordinates to navigate back to productive foraging spots.

5. **Safety Guide & Toxicology Centers**:
   - "Golden Rules of Foraging".
   - Descriptions of major poisoning syndromes (amatoxin, muscarine, gastrointestinal).
   - Direct emergency helpline numbers (112 and 24/7 toxicology centers across major Polish cities).

6. **Bilingual Support (i18n)**:
   - Switch between Polish (default) and English.
   - User language preference persisted locally via `AsyncStorage`.

7. **Mushroom Preparation Guide**:
   - Guidance on culinary preparation, thorough thermal processing, cleaning techniques, and proper storage.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (version 22+ / 24+).
- **pnpm** package manager (version 9+ / 12+).
- **Expo Go** app on a physical device (Android or iOS) or a configured development emulator.

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Start Development Server
```bash
pnpm start
```
Scan the displayed QR code using the **Expo Go** app (Android) or the native **Camera** app (iOS).

### Step 3: Run Unit & Component Tests (Jest + RNTL)
```bash
pnpm test
```

### Step 4: Component Catalog (Storybook)
```bash
pnpm storybook
```
To produce a static Storybook build:
```bash
pnpm build-storybook
```

### Step 5: End-to-End Tests (Playwright)
```bash
pnpm test:e2e
```

### Releases (EAS)

Production app store builds and version tagging (`vX.Y.Z` matching `expo.version`) are detailed in [docs/RELEASE.md](docs/RELEASE.md) (and [docs/RELEASE.en.md](docs/RELEASE.en.md)): `eas init`, `EXPO_TOKEN` secrets in `release-build` and `production` environments, and branch rulesets.

---

## On-Device ML Model

Recognition is disabled until a calibrated `assets/models/mushrooms_model.tflite` is supplied. `labels.json` alone is a schema, not a model. `react-native-fast-tflite` is installed for inference; without the binary weights, the scanner will not load weights or invent confidence percentages.

Training workflow is described in `ml/README.md`. Pretrained ImageNet weights (MobileNetV3-Small) serve as initialization. Model export requires passing the validation thresholds defined in `ml/ship_gates.py`.

On a machine with a CUDA-compatible GPU:
```bash
pip install -r ml/requirements.txt
python ml/run_pipeline.py all
```

Bundling the model into the application (`export --install-into-app`) only succeeds when thresholds in `ml/ship_gates.py` pass on measured test metrics. Quantized models (`--also-export int8`) must pass identical thresholds before inclusion.

---

## ⚠️ Legal & Medical Disclaimer
This application is designed for educational and informational purposes only. Never consume wild mushrooms solely based on algorithmic or computer vision classifications. When in doubt, consult a certified mycological expert or local sanitary-epidemiological station (Sanepid).
