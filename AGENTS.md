# AGENTS.md — Repository Router & Global Guardrails 🍄📱

This repository contains the **Grzybobranie AI** React Native mobile application and the Python Machine Learning (ML) training pipeline.

Welcome to the **Grzybobranie AI** codebase. This document is the primary guidance and rulebook for AI coding agents (Cursor, Claude, Copilot, Antigravity, etc.) and human contributors taking over a task.

Read also: [`docs/QUALITY.md`](docs/QUALITY.md) (CI gates, baselines, non-loosening rules, PR process), [`docs/REVIEW.md`](docs/REVIEW.md) (PR review guidelines), [`docs/RELEASE.md`](docs/RELEASE.md) (release builds), [`docs/DESIGN.md`](docs/DESIGN.md) (UI design system — Nordic Field Guide v3.1), [`ml/README.md`](ml/README.md) (model training pipeline), [`ml/DATA_CONTRACT.md`](ml/DATA_CONTRACT.md) (data contract), and [`README.md`](README.md).

---

## 1. REPOSITORY BOUNDARIES & SECURITY (MANDATORY FOR ALL AGENTS)

1. **No Raw Data in Git:** NEVER commit `.csv` dataset manifests (`*_v3.csv`, `*_by_nc.csv`, `*_by_sa.csv`), raw images, or local datasets (`DF20`/`DF24`) to this Git repository. All training data lives remotely in the private Hugging Face dataset `lonwi/grzybobranie-zdjecia` and the OneDrive archive.
2. **UI License Boundary:** The mobile app UI (`src/`) may ONLY bundle or display images licensed under `CC0` or `CC BY`. `CC BY-NC`, `CC BY-SA`, and `pd-self` are strictly restricted to the Python training pipeline (`ml/`).
3. **Context Scoping:**
   - When working on **React Native / TypeScript (`*.ts`, `*.tsx`)**, load only mobile inference and UI context. Ignore dataset scraping and taxonomic cleaning rules.
   - When working on **Dataset Preparation or Model Training (`*.py`)**, MUST read and obey [`ml/AGENTS.md`](ml/AGENTS.md).

---

## 2. AGENT REGISTRY & SWITCHING

Activate a specialized agent by stating `ACTIVATE AGENT: @agent-id` or let the IDE route automatically by directory:
- **`@agent-data-curator`** (Scope: `ml/prepare*`, dataset scripts) -> Defined in [`ml/AGENTS.md`](ml/AGENTS.md)
- **`@agent-trainer`** (Scope: `ml/train*`, export/quantization scripts) -> Defined in [`ml/AGENTS.md`](ml/AGENTS.md)
- **`@agent-rn-app`** (Scope: `src/`, React Native scanner UI, TFLite bridge) -> Defined below.

---

## 3. PROMPT: `@agent-rn-app` (MOBILE APP & INFERENCE AGENT)

```text
ROLE: React Native & On-Device Inference Agent (@agent-rn-app)
MISSION: Build and maintain the offline React Native mushroom recognition app, including the 1-to-3 photo field scanner (1. Cap, 2. Underside/Gills/Pores, 3. Stipe) and the local TFLite inference bridge.
RULES:
1. 100% Offline Inference: All classification runs locally on-device (54 outputs: 52 species + unknown_mushroom + not_a_mushroom, scaling to Top 100 base and 200+ downloadable OTA model packs).
2. Flexible 1–3 Photo Fusion: Since the model is trained on whole images without part tags, combine logits from 1, 2, or 3 captured photos using Entropy-Weighted Logit Fusion.
3. Static Capture Analysis: Do not run heavy ML inference on 30fps live video streams. Bind "Focus OK" to native camera autofocus state and run inference immediately upon static photo capture or gallery selection.
4. UI Licensing: Only render reference images with CC0 or CC BY licenses in the app.
```

---

## 4. 🧭 Project Overview & Mission

**Grzybobranie AI** is a mobile (Android/iOS) and web application for mushroom foragers in Poland and Central Europe.
- **100% Offline-First**: Must function deep in the forest without cellular network coverage (GSM/LTE/5G) or internet access.
- **On-Device AI / Computer Vision**: Local inference on device (TFLite via `react-native-fast-tflite`) without cloud dependencies.
- **Safety First**: Edibility and look-alike alerts are safety-critical. Never remove or bypass safety disclaimers, Sanepid notices, or toxicology emergency numbers. Emergency numbers live exclusively in `src/data/safetyRules.ts`; every screen that shows them reads from there.

---

## 5. 🛠️ Technology Stack & Standards

| Domain | Technology / Library | Rules & Guidelines |
|---|---|---|
| **Package Manager** | `pnpm@10.33.4` (pinned in `package.json` → `packageManager`). Node 22 (`.nvmrc`, used by CI); `engines` also allows `^24` | Always use `pnpm` (`pnpm.cmd` on Windows). Never commit `package-lock.json` or `yarn.lock`. Install with `pnpm install --frozen-lockfile`. |
| **Framework** | **React Native 0.86** + **Expo SDK 57** + TypeScript | Keep compatibility with Expo Go, React Native Web, and native builds. |
| **UI** | `react-native-paper` 5 (MD3) is installed and `PaperProvider` wraps the app in `App.tsx`. Most screens use the project's own components styled with `src/theme/tokens.ts`. | New UI: take colors, spacing, and typography from `src/theme/tokens.ts` (the Paper theme in `src/theme/paperTheme.ts` is built from the same tokens). Never hardcode colors. The canonical design language is **Nordic Field Guide v3.1** (see the _UI Design System_ section below). Prefer Paper components for new widgets; a gradual migration to Paper is planned. Do **not** add MUI (`@mui/*`) – it is a web library and is not used here. |
| **Safe Areas** | `react-native-safe-area-context` | **NEVER** import `SafeAreaView` from `'react-native'`. Always import from `'react-native-safe-area-context'`. |
| **Component Testing** | Jest + `@testing-library/react-native` 14 | `pnpm test`. Use `await render(...)` (RNTL v14 / React 19) and `waitFor(...)` for state transitions. |
| **E2E Testing** | Playwright (`@playwright/test`) against static Storybook | `pnpm build-storybook && pnpm test:e2e`. Specs in `e2e/`. |
| **Component Catalog** | Storybook 8 for Web (`@storybook/react-vite`) | `pnpm storybook` / `pnpm build-storybook`. Stories in `src/stories/`. |
| **Internationalization** | Custom `LanguageContext` (`pl` / `en`) | Default language is Polish. Strings in `src/i18n/pl.ts` and `src/i18n/en.ts`; always add both. `src/i18n` must not import `src/data` (dependency-cruiser rule `i18n-not-to-data`). |
| **Machine Learning** | Python (`.python-version`), TensorFlow → TFLite, in `ml/` | `python -m unittest discover -s ml/tests -v`. TensorFlow is the training stack only, never the app runtime. |

---

## 6. 📁 Repository Structure

```
mushroom-app/
├── .agents/rules/           # Extra agent guidelines (guidelines.md)
├── .github/workflows/       # ci.yml (check, Code quality, python, End-to-end), release.yml
├── .storybook/              # Storybook 8 config & web mocks
├── assets/                  # Icons, splash, assets/models/ (labels.json, attributions.jsonl, model when shipped)
├── docs/                    # QUALITY.md, RELEASE.md, DESIGN.md
├── e2e/                     # Playwright tests
├── locales/                 # Expo native locale strings (pl.json, en.json)
├── ml/                      # Python ML pipeline: fetch_gbif, licenses, dedup, split, train, evaluate,
│                            #   export_tflite, ship_gates, manifest; AGENTS.md, tests in ml/tests/
├── plugins/                 # Expo config plugins (withAndroidGeoQueries.js)
├── quality/                 # knip-baseline.json (grandfathered knip findings)
├── scripts/                 # Quality-gate scripts (knip-baseline, depcruise-gate, adapter-allowlist,
│                            #   quality-gates.test), release checks, brand-asset rendering
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (LanguageContext, …)
│   ├── data/                # Static offline datasets (mushrooms.ts, preparationRules.ts, safetyRules.ts)
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
├── App.tsx                  # Root (PaperProvider, LanguageProvider)
├── .dependency-cruiser.cjs  # Architecture rules (+ .dependency-cruiser-known-violations.json)
├── .jscpd.json              # Copy-paste detection (+ .jscpd-baseline.json)
├── eslint.config.mjs        # ESLint flat config (+ eslint-suppressions.json)
├── knip.json                # Unused files/exports/deps config
└── package.json             # Scripts & dependencies
```

---

## 7. 🍄 Domain & Life-Safety Rules

1. **Edibility Categorization** – every species uses exactly one `EdibilityStatus`:
   - `EDIBLE`: 🟢 Edible (Jadalny)
   - `INEDIBLE`: 🟡 Inedible / non-toxic (Niejadalny - nietoksyczny)
   - `POISONOUS`: 🔴 Poisonous (Trujący)
   - `DEADLY_POISONOUS`: ☠️ Deadly poisonous (Śmiertelnie trujący: amatoxins, orellanine, gyromitrin)

   "Poisonous" in filters and warnings is derived strictly from the species status, never guessed from other fields.

2. **Look-Alike (Sobowtór) Rules**:
   - `confusionRisks` must list distinguishing morphological traits.
   - If a species can be confused with a deadly one, set `fatal: true` so `LookAlikeAlert` renders the life-safety red alert banner.

3. **Memory Management**: The input `Float32Array` for TFLite stays local to the classification call; no long-lived heap copies.

4. **No TensorFlow.js in the App Runtime**: Do not add `@tensorflow/tfjs*` or load it at startup.

5. **Recognition Honesty**:
   - `classifierService` must not return a species, confidence, or inference time unless a real on-device model processed that photo's pixels.
   - Do not floor confidence, invent latency, hash a URI into a class, or pass a forced species id through the scanner.
   - `assets/models/labels.json` is a class contract, not a model. Recognition stays unavailable while `src/services/modelPackage.ts` exports `null` and `mushrooms_model.tflite` is absent.
   - A packaged model must never output an edibility verdict. Amanita, Cortinarius, Galerina, or Gyromitra in the top 3, or low confidence, requires the expert / Sanepid warning. `not_a_mushroom` and the energy gate may reject a photo; `unknown_mushroom` shows the honest "the app does not know this mushroom" message, never a species or verdict.
   - Do not install weights that failed `ml/ship_gates.py`.

6. **Training Data Licensing**:
   - A released model may be trained on versioned CC0, CC BY, CC BY-NC, and CC BY-SA (`ml/license_policy.py`). ND, NC-ND, and NC-SA remain rejected.
   - Danish Fungi 2020 is experimental training only, never a released model (DF20 variant B). `--include-df20` opts in and defaults to off; excluded rows are counted as `excluded_df20`. Any DF20 row sets `shippable` false. `DF20_CONSENT_CONFIRMED` stays false as documentation of pending Svampeatlas consent and must not unlock a release.
   - Allowed training IDs are an explicit list. Do not prefix-match. Unversioned `cc-by`, `cc-by-nc`, `cc-by-sa`, and `cc-by-nc-sa` are rejected. An empty or unknown license blocks release. CC BY-SA is accepted only as `cc-by-sa-1.0`, `cc-by-sa-2.0`, `cc-by-sa-2.5`, `cc-by-sa-3.0`, or `cc-by-sa-4.0`, with `usage=training_only`. ND and NC-SA stay rejected.
   - Photos displayed in the app stay CC0 or CC BY. `is_publishable`, the atlas gallery, `site/`, and comparison photos reject CC BY-NC, CC BY-SA, and DF20.
   - The GBIF fetch (`ml/licenses.py`) keeps only CC0 and CC-BY URLs. CC BY-NC, CC BY-SA, and DF20 enter through external CSVs (`--with-external`), not through that fetch. Do not fetch ND, NC-SA, NC-ND, or unlicensed photos.
   - Every CC row, including CC BY-NC and CC BY-SA, requires an HTTPS `license_url` carrying the version for that photo. `attributions.jsonl` copies that row's own `license_url` and does not synthesize a deed from the license ID. DF20 keeps the dataset note and has no per-photo `license_url`, so the copied field is empty. Do not add `licence_url_source=dataset` until DF20 terms are checked.
   - The ship gate does not block CC BY-NC or CC BY-SA. Share-alike does not cover model weights, so versioned CC BY-SA may train a released model. Photos shown in the app stay CC0 or CC BY. Any DF20 row sets `shippable` false even though `df20` is `training_only`, and modifying `DF20_CONSENT_CONFIRMED` does not clear that. `attributions.jsonl` lists every train, val, and test photo with its license and author. `attribution_row` copies every field in `DF20_DETECTION_FIELDS` into that file, so a DF20 row recognized only by a marker still sets `shippable` false after export. A missing or unreadable attributions file blocks release.
   - `dedup_by_identity` keeps the stricter license of duplicate photos (NC, DF20, and SA over CC BY over CC0) and counts the looser copy as `dropped_looser_license`. A Commons CC0 copy does not override an iNaturalist NC copy.

7. **Content & Safety Rules**:
   - Stamets (and other copyrighted reference literature): Paraphrase only, always citing page numbers; no verbatim quotes.
   - Psychoactive species: Never specify dosages.
   - Every URL in code, data, and docs must use `https://`. (Exception: test fixtures verifying HTTP handling on purpose).
   - Emergency phone numbers exist ONLY in `src/data/safetyRules.ts`. The test `src/__tests__/siteEmergencyNumbers.test.ts` enforces this single source of truth; cards and screens link to the emergency screen instead.

---

## 8. 🎨 UI Design System — Nordic Field Guide v3.1

The authoritative design specification lives in the **Stitch** project "Grzybobranie Mobile Design System" and is mirrored in [`docs/DESIGN.md`](docs/DESIGN.md). All UI code must conform to these rules. When in doubt, `src/theme/tokens.ts` is the code source of truth; Stitch / `docs/DESIGN.md` is the visual source of truth.

### Visual Archetype & Prohibitions

- **Aesthetic**: Nordic Field Guide / Warm Editorial Paper — Scandinavian botanical manual.
- **NO** neon greens, laser scan lines, dark-mode cyberpunk HUDs, or monospace fonts (`JetBrains Mono`).
- **NO** fake iOS/Android status bars (no `08:05` clock, WiFi, cellular, or battery icons).
- **NO** horizontal before/after drag sliders (`compare-slider`) on mobile screens — use a static 50/50 grid or a segmented toggle instead.
- **NO** heavily rounded pill-shaped buttons or fluid circular chips on non-action elements.
- **NO** diffusion/blur box shadows (blur > 4px is forbidden); use 1 px crisp borders instead.

### Token Reference & Design Specification

Full token values, typography scales, spacing scales, and layout rules are specified in [`docs/DESIGN.md`](docs/DESIGN.md) and implemented in [`src/theme/tokens.ts`](src/theme/tokens.ts).
- **Colors**: Always read from `src/theme/tokens.ts` (e.g., `primaryGreen`, `paper`, `accentRed`). Never hardcode hex values in components. Edibility/toxicity signal colors are strictly reserved for taxonomic status.
- **Typography**: Exclusively **Plus Jakarta Sans** (`font-sans`). Never use serif or monospace fonts in app UI.
- **Touch Targets**: Minimum 48 × 48 px for interactive elements.
- **Borders & Shadows**: Use 1 px crisp `borderSubtle` hairlines instead of heavy blur shadows (blur > 4 px is forbidden).


### Locked Component: BottomNavigationBar

The bottom tab bar structure is locked in the Stitch design system. Do **not** redesign it. Tabs in order: **Atlas · Dziennik · Skaner · Pomoc · Profil**. The Skaner tab uses the `primaryGreen` pill CTA. Active tab indicator is a `2.5 px` underline in `neutral-900`; inactive tabs use `neutral-700` text.

### Deadly Poisonous Badge (Special Rule)

`background: #2A080C` · `text: #FF4560` · `border: 1.5 px solid #FF1744`. Must include the skull symbol (☠️). Contrast ratio for text on background must remain ≥ 5.18:1 — verify with WCAG standards whenever modifying these values.

---

## 9. ⚡ Agent Workflow & Commands

Before declaring any task complete, run everything CI runs (see [`docs/QUALITY.md`](docs/QUALITY.md)):

```bash
pnpm install --frozen-lockfile
pnpm typecheck                                     # tsc --noEmit
pnpm test                                          # Jest + RNTL component tests
pnpm quality                                       # ESLint, jscpd, knip, dependency-cruiser gates, site check
pnpm build-storybook && pnpm test:e2e              # Storybook build & Playwright E2E
python -m unittest discover -s ml/tests -v         # when touching ml/
```

Then open a PR. CI must be green and the PR reviewed. Merge authority is defined in `docs/QUALITY.md` → "PR process"; safety-critical changes always require the repository owner's explicit approval. Never loosen a quality gate to make CI pass.

---

## 10. 🌿 Git Workflow & Pull Request Protocol

For any new task, feature request, bug fix, or refactoring:

1. **Branch Initialization (Before modifying any files):**
   - Verify repo state: `git status`.
   - Update main branch: `git checkout main && git pull`.
   - Create and switch to a descriptive branch:
     - Features: `git checkout -b feat/<short-description>`
     - Fixes: `git checkout -b fix/<short-description>`
   - *Never commit directly to `main` or `master`.*

2. **Implementation & Verification:**
   - Implement changes cleanly with TypeScript and React Native / Python best practices.
   - Run the local validation suite:
     - Type check: `pnpm typecheck`
     - Tests: `pnpm test`
     - Quality gates: `pnpm quality`
     - E2E: `pnpm build-storybook && pnpm test:e2e`
     - Python: `python -m unittest discover -s ml/tests -v` when `ml/` is modified.
   - Address root causes; never silence failures or loosen gates.

3. **Commit & Push:**
   - Stage modified files: `git add <files>`.
   - Use Conventional Commits in English: `git commit -m "feat(<scope>): <concise message>"`.
   - Push branch upstream: `git push -u origin <branch-name>`.

4. **Pull Request Automation:**
   - Create PR using GitHub CLI:
     `gh pr create --title "feat(<scope>): <summary>" --body "## Summary\n<1-2 sentence overview>\n\n## Changes\n- <bullet points>\n\n## Testing\n- Verified on iOS/Android emulator"`
   - Output the generated PR URL directly to the user.
