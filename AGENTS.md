# Agent Instructions for Grzybobranie AI 🍄📱

Welcome to the **Grzybobranie AI** repository. This document is the primary guidance and rulebook for AI coding agents (Cursor, Claude, Copilot, Antigravity, etc.) and for anyone taking over a task.

Read also: [`docs/QUALITY.md`](docs/QUALITY.md) (CI gates, baselines, what must not be loosened, PR process), [`docs/RELEASE.md`](docs/RELEASE.md) (release builds), [`training/README.md`](training/README.md) (model training) and [`README.md`](README.md).

---

## 🧭 Project Overview & Mission

**Grzybobranie AI** is a mobile (Android/iOS) and web application for mushroom hunters in Poland and Central Europe.
- **100% Offline-First**: Must work deep in the forest without GSM, cellular data, or internet.
- **On-Device AI / Computer Vision**: Local inference on device (TFLite via `react-native-fast-tflite`) without cloud dependencies.
- **Safety First**: Edibility and look-alike alerts are safety-critical. Never remove or bypass safety disclaimers, Sanepid notices, or toxicology emergency numbers. Emergency numbers live only in `src/data/safetyRules.ts`; every screen that shows them reads from there.

---

## 🛠️ Technology Stack & Standards

| Domain | Technology / Library | Rules & Guidelines |
|---|---|---|
| **Package Manager** | `pnpm@10.33.4` (pinned in `package.json` → `packageManager`). Node 22 (`.nvmrc`, used by CI); `engines` also allows `^24` | Always use `pnpm` (`pnpm.cmd` on Windows). Never commit `package-lock.json` or `yarn.lock`. Install with `pnpm install --frozen-lockfile`. |
| **Framework** | **React Native 0.86** + **Expo SDK 57** + TypeScript | Keep compatibility with Expo Go, React Native Web, and native builds. |
| **UI** | `react-native-paper` 5 (MD3) is installed and `PaperProvider` wraps the app in `App.tsx`. Most screens still use the project's own components styled with `src/theme/tokens.ts`. | New UI: take colors, spacing and typography from `src/theme/tokens.ts` (the Paper theme in `src/theme/paperTheme.ts` is built from the same tokens). Never hardcode colors. Prefer Paper components for new widgets; a gradual migration to Paper is planned. Do **not** add MUI (`@mui/*`) – it is a web library and is not used here. |
| **Safe Areas** | `react-native-safe-area-context` | **NEVER** import `SafeAreaView` from `'react-native'`. Always import from `'react-native-safe-area-context'`. |
| **Component Testing** | Jest + `@testing-library/react-native` 14 | `pnpm test`. Use `await render(...)` (RNTL v14 / React 19) and `waitFor(...)` for state transitions. |
| **E2E Testing** | Playwright (`@playwright/test`) against static Storybook | `pnpm build-storybook && pnpm test:e2e`. Specs in `e2e/`. |
| **Component Catalog** | Storybook 8 for Web (`@storybook/react-vite`) | `pnpm storybook` / `pnpm build-storybook`. Stories in `src/stories/`. |
| **Internationalization** | Custom `LanguageContext` (`pl` / `en`) | Default language is Polish. Strings in `src/i18n/pl.ts` and `src/i18n/en.ts`; always add both. `src/i18n` must not import `src/data` (dependency-cruiser rule `i18n-not-to-data`). |
| **Training** | Python (`.python-version`), TensorFlow → TFLite, in `training/` | `python -m unittest discover -s training/tests -v`. TensorFlow is the training stack only, never the app runtime. |

---

## 📁 Repository Structure

```
mushroom-recognition-app/
├── .agents/rules/           # Extra agent guidelines
├── .github/workflows/       # ci.yml (check, Code quality, python, End-to-end), release.yml
├── .storybook/              # Storybook 8 config & web mocks
├── assets/                  # Icons, splash, assets/models/ (labels.json, attributions.jsonl, model when shipped)
├── docs/                    # QUALITY.md, RELEASE.md
├── e2e/                     # Playwright tests
├── locales/                 # Expo native locale strings (pl.json, en.json)
├── plugins/                 # Expo config plugins (withAndroidGeoQueries.js)
├── quality/                 # knip-baseline.json (grandfathered knip findings)
├── scripts/                 # Quality-gate scripts (knip-baseline, depcruise-gate, adapter-allowlist,
│                            #   quality-gates.test), release checks, brand-asset rendering
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (LanguageContext, …)
│   ├── data/                # Static offline datasets (mushrooms.ts, preparationRules.ts, safetyRules.ts, FILTRY.md)
│   ├── hooks/               # React hooks
│   ├── i18n/                # pl.ts, en.ts
│   ├── navigation/          # App navigation
│   ├── presentation/        # Presentation helpers for screens
│   ├── screens/             # App tabs and views (Scanner, Atlas, SpeciesDetail, Journal, SafetyGuide, …)
│   ├── services/            # Recognition (classifierService, recognitionDecision, tfliteRuntime,
│   │   │                    #   imagePreprocess, modelPackage, modelManifest), journal, attribution
│   │   └── storage/         # Storage adapters: keyValueStore, settingsStore, journalRepository,
│   │                        #   journalSchema, journalBackupStore, keys
│   ├── stories/             # Storybook stories
│   ├── theme/               # tokens.ts (design tokens), paperTheme.ts (MD3 theme built from tokens)
│   ├── types/               # TypeScript models
│   ├── utils/               # Small shared utilities
│   └── __tests__/           # Jest & RNTL tests
├── training/                # Python pipeline: fetch_gbif, licenses, dedup, split, train, evaluate,
│                            #   export_tflite, ship_gates, manifest; tests in training/tests/
├── App.tsx                  # Root (PaperProvider, LanguageProvider)
├── .dependency-cruiser.cjs  # Architecture rules (+ .dependency-cruiser-known-violations.json)
├── .jscpd.json              # Copy-paste detection (+ .jscpd-baseline.json)
├── eslint.config.mjs        # ESLint flat config (+ eslint-suppressions.json)
├── knip.json                # Unused files/exports/deps config
└── package.json             # Scripts & dependencies
```

---

## 🍄 Domain & Safety Rules

1. **Edibility Categorization** – every species uses exactly one `EdibilityStatus`:
   - `EDIBLE`: 🟢 Jadalny
   - `INEDIBLE`: 🟡 Niejadalny (nietoksyczny)
   - `POISONOUS`: 🔴 Trujący
   - `DEADLY_POISONOUS`: ☠️ Śmiertelnie trujący (amatoksyny, orellanina, gyromitryna)

   "Poisonous" in filters and warnings is derived from the species status only, never guessed from other fields.

2. **Look-Alike (Sobowtór) Rules**:
   - `confusionRisks` must list distinguishing morphological traits.
   - If a species can be confused with a deadly one, set `fatal: true` so `LookAlikeAlert` renders the red alert.

3. **Memory Management**: the input `Float32Array` for TFLite stays local to the classification call; no long-lived copies.

4. **No TensorFlow.js in the app runtime**: do not add `@tensorflow/tfjs*` or load it at startup.

5. **Recognition honesty**:
   - `classifierService` must not return a species, confidence, or inference time unless a real on-device model consumed that photo's pixels.
   - Do not floor confidence, invent latency, hash a URI into a class, or pass a forced species id through the scanner.
   - `assets/models/labels.json` is a class contract, not a model. Recognition stays unavailable while `src/services/modelPackage.ts` exports `null` and `mushrooms_model.tflite` is absent.
   - A packaged model still must not show an edibility verdict. Amanita, Cortinarius, Galerina, or Gyromitra in the top 3, or low confidence, requires the expert / Sanepid warning. `not_a_mushroom` and the energy gate may reject a photo; `unknown_mushroom` shows the honest "the app does not know this mushroom" message, never a species or verdict.
   - Do not install weights that failed `training/ship_gates.py`.

6. **Training data licensing** (Decyzja Wojtka 2026-10-23 12:02, wariant C):
   - A released model may be trained on versioned CC0, CC BY, CC BY-NC, and CC BY-SA (`training/license_policy.py`). ND, NC-ND, and NC-SA stay rejected.
   - Danish Fungi 2020 is not pulled by `--with-external`. `--include-df20` opts in and defaults to off; excluded rows are counted as `excluded_df20`. `DF20_CONSENT_CONFIRMED` defaults to false (non-commercial research only, Svampeatlas photographer consent still pending). While it is false, a training set that contains DF20 is not shippable.
   - Allowed training ids are an explicit list. Do not prefix-match. Unversioned `cc-by`, `cc-by-nc`, `cc-by-sa`, and `cc-by-nc-sa` are rejected. An empty or unknown licence blocks release. CC BY-SA is accepted only as `cc-by-sa-1.0`, `cc-by-sa-2.0`, `cc-by-sa-2.5`, `cc-by-sa-3.0`, or `cc-by-sa-4.0`, with `usage=training_only`. ND and NC-SA stay rejected.
   - Photos shown in the app stay CC0 or CC BY. `is_publishable`, the atlas gallery, `site/`, and comparison photos reject CC BY-NC, CC BY-SA, and DF20.
   - The GBIF fetch (`training/licenses.py`) still keeps only CC0 and CC-BY URLs. CC BY-NC, CC BY-SA, and DF20 enter through external CSVs (`--with-external`), not through that fetch. Do not fetch ND, NC-SA, NC-ND, or unlicensed photos.
   - Every CC row, including CC BY-NC and CC BY-SA, needs an https `license_url` that carries the version from that photo. DF20 keeps the dataset note already used on main and has no per-photo `license_url`. Do not add `licence_url_source=dataset` until the DF20 terms are checked.
   - The ship gate does not block CC BY-NC, CC BY-SA, or DF20. `attributions.jsonl` still lists every train, val, and test photo with its licence and author. Whether CC BY-SA share-alike reaches the TFLite file is an open question; this note does not decide it.

7. **Content rules**:
   - Stamets (and other copyrighted books): paraphrase only, always with page numbers; no quotes.
   - Psychoactive species: never give doses.
   - Every URL in code, data, and docs uses `https://`. Exception: test fixtures that check `http://` handling on purpose (e.g. `training/tests/test_fetch_gbif.py`, `training/tests/test_licenses.py`).
   - Emergency phone numbers exist only in `src/data/safetyRules.ts`. The test `src/__tests__/phoneNumbersSingleSource.test.ts` (added with the emergency-numbers PR) enforces it; cards and screens link to the emergency screen instead.

---

## ⚡ Agent Workflow & Commands

Before declaring a task complete, run what CI runs (see `docs/QUALITY.md`):

```bash
pnpm install --frozen-lockfile
pnpm typecheck          # tsc --noEmit
pnpm test               # Jest + RNTL
pnpm quality            # ESLint, jscpd, knip, dependency-cruiser gates
pnpm build-storybook && pnpm test:e2e   # Playwright
python -m unittest discover -s training/tests -v   # when touching training/
```

Then open a PR. CI must be green and the PR gets a review. Who merges is described in `docs/QUALITY.md` → "PR process"; safety content always needs the owner's word. Never loosen a quality gate to make CI pass – see "What must not be loosened" in `docs/QUALITY.md`.
