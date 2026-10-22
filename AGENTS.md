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
| **Package Manager** | `pnpm@10.33.4` (pinned in `package.json` → `packageManager`), Node `^22 \|\| ^24` (`.nvmrc`) | Always use `pnpm` (`pnpm.cmd` on Windows). Never commit `package-lock.json` or `yarn.lock`. Install with `pnpm install --frozen-lockfile`. |
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
│   ├── data/                # Static offline datasets (mushrooms.ts, preparationRules.ts, safetyRules.ts)
│   ├── i18n/                # pl.ts, en.ts
│   ├── screens/             # App tabs and views (Scanner, Atlas, SpeciesDetail, Journal, SafetyGuide, …)
│   ├── services/            # Recognition (classifierService, recognitionDecision, tfliteRuntime,
│   │   │                    #   imagePreprocess, modelPackage, modelManifest), journal, attribution
│   │   └── storage/         # Storage adapters: keyValueStore, settingsStore, journalRepository,
│   │                        #   journalSchema, journalBackupStore, keys
│   ├── stories/             # Storybook stories
│   ├── theme/               # tokens.ts (design tokens), paperTheme.ts (MD3 theme built from tokens)
│   ├── types/               # TypeScript models
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

6. **Training data licensing** (owner decision, 2026-10-16):
   - **CC0 and CC-BY**: allowed for training and, with attribution, for display.
   - **CC BY-NC** (plain BY-NC only, **not** NC-ND or NC-SA) and **DF20**: allowed **for training only**. Never published, displayed in the app, or bundled in a release. Attribution is kept.
   - The license is stored in its own column of the manifest, with a filter that can exclude BY-NC / DF20 from a training run.
   - **DF20** additionally needs photographer consent: no release built on DF20 data until the repo owner confirms it.
   - Anything else (ND, SA, unlicensed, unknown) is never fetched.
   - Split keys combine all available keys (observation id, GBIF key, collector + grid + day); an empty key is never a key. Collector ids are hashed with a salt kept outside the repo.

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

Then open a PR. CI must be green, the PR gets a review, and **merging needs the repo owner's explicit OK**. Never loosen a quality gate to make CI pass – see "What must not be loosened" in `docs/QUALITY.md`.
