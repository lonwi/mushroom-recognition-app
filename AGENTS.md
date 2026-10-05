# Agent Instructions for Grzybobranie AI 🍄📱

Welcome to the **Grzybobranie AI** repository. This document serves as the primary guidance and operational rulebook for AI coding agents (such as Antigravity, Claude, Copilot, Cursor, etc.) working on this codebase.

---

## 🧭 Project Overview & Mission

**Grzybobranie AI** is a mobile (Android/iOS) and web application for mushroom hunters in Poland and Central Europe.
- **100% Offline-First**: Must function deep in the forest without GSM, cellular data, or internet connectivity.
- **On-Device AI / Computer Vision**: Local neural network inference powered by **TensorFlow.js** (`@tensorflow/tfjs`) on CPU/GPU/NPU without cloud dependencies.
- **Safety First**: Mushroom edibility and look-alike danger alerts are safety-critical. Never remove or bypass safety disclaimers, Sanepid notices, or toxicology emergency numbers.

---

## 🛠️ Technology Stack & Standards

| Domain | Technology / Library | Rules & Guidelines |
|---|---|---|
| **Package Manager** | `pnpm` (v12.x / v9.x) | Always use `pnpm` (`pnpm.cmd` on Windows). Never commit `package-lock.json` or `yarn.lock`. |
| **Framework** | **React Native** + **Expo SDK 57** | Keep compatibility with Expo Go, React Native Web, and native builds. |
| **UI Design System** | **React Native Paper** (Material Design 3) | Use Paper components (`Card`, `Chip`, `Text`, `Badge`, `Appbar`, `Dialog`, `Surface`). Follow the forest color palette in `src/theme/paperTheme.ts`. |
| **Safe Areas** | `react-native-safe-area-context` | **NEVER** import `SafeAreaView` from `'react-native'` (deprecated in RN 0.86+). Always import from `'react-native-safe-area-context'`. |
| **Component Testing (RTL)** | **React Testing Library** (`@testing-library/react-native`) + Jest | Run with `pnpm test`. Use `await render(...)` (RNTL v14+ / React 19) and `waitFor(...)` for state transitions. |
| **E2E Testing** | **Playwright** (`@playwright/test`) | Run with `pnpm test:e2e`. Specs reside in `e2e/`. |
| **Component Catalog** | **Storybook 8 for Web** (`@storybook/react-vite`) | Run with `pnpm storybook` or `pnpm build-storybook`. Stories reside in `src/stories/`. |
| **Internationalization** | Custom `LanguageContext` (`pl` / `en`) | Default language is Polish (`pl`). Strings reside in `src/i18n/pl.ts` and `src/i18n/en.ts`. Always provide translations for both. |

---

## 📁 Repository Structure

```
mushroom-app/
├── .storybook/              # Storybook 8 configuration & web mocks (vector icons, safe area)
├── e2e/                     # Playwright multi-browser end-to-end tests
├── src/
│   ├── components/          # Reusable UI components (EdibilityBadge, LookAlikeAlert, ResultModal, etc.)
│   ├── contexts/            # React contexts (LanguageContext, etc.)
│   ├── data/                # Static offline datasets:
│   │   ├── mushrooms.ts         # Taxonomic database (species, anatomy, edibility, look-alikes)
│   │   ├── preparationRules.ts  # Cleaning, cooking, storing guides
│   │   └── safetyRules.ts       # Golden rules, poisoning syndromes, 24/7 toxicology centers
│   ├── i18n/                # Localization files (pl.ts, en.ts)
│   ├── screens/             # Primary app tabs and views:
│   │   ├── ScannerScreen.tsx        # Camera view, macro reticle, flashlight, classification trigger
│   │   ├── AtlasScreen.tsx          # Offline mushroom directory with filters & search
│   │   ├── SpeciesDetailScreen.tsx  # Detailed morphological breakdown & seasonal calendar
│   │   ├── JournalScreen.tsx        # Offline harvest history with GPS coordinates
│   │   ├── SafetyGuideScreen.tsx    # Toxicology hotlines & first aid protocols
│   │   ├── PreparationGuideScreen.tsx # Cleaning, cooking, storing guide tabs
│   │   └── SettingsScreen.tsx       # Language selection & offline mode indicator
│   ├── services/
│   │   ├── classifierService.ts     # Refuses a species until a real pixel model exists
│   │   └── storageService.ts        # AsyncStorage offline persistence (sightings, disclaimer)
│   ├── stories/             # Component stories for Storybook catalog
│   ├── theme/               # Theme tokens (paperTheme.ts - MD3 forest palette)
│   ├── types/               # TypeScript models (mushroom.ts, etc.)
│   └── __tests__/           # Jest & React Testing Library test suites
├── App.tsx                  # Root application entry with PaperProvider & LanguageProvider
├── playwright.config.ts     # Playwright configuration
├── jest.config.js           # Jest configuration with jest-expo preset
├── jest.setup.js            # Native module and storage mocks for unit tests
└── package.json             # Scripts & dependencies
```

---

## 🍄 Domain & Safety Rules

1. **Edibility Categorization**:
   Every mushroom species must strictly use one of the 4 defined `EdibilityStatus` values:
   - `EDIBLE`: 🟢 Jadalny (smaczny / dopuszczony do obrotu)
   - `INEDIBLE`: 🟡 Niejadalny (gorzki, twardy, niesmaczny, ale nietoksyczny)
   - `POISONOUS`: 🔴 Trujący (zaburzenia żołądkowo-jelitowe itp.)
   - `DEADLY_POISONOUS`: ☠️ Śmiertelnie trujący (amatoksyny, orellanina, gyromitryna)

2. **Look-Alike (Sobowtór) Rules**:
   - For all species, `confusionRisks` must detail distinguishing morphological traits (e.g. movable vs fixed ring, presence of volva at the base, stem zigzag pattern).
   - If a species can be confused with a deadly mushroom (e.g. *Macrolepiota procera* vs *Amanita phalloides*), `fatal: true` must be flagged so `LookAlikeAlert` renders prominent red alerts.

3. **Memory Management**:
   - The scanner uses TFLite, not TensorFlow.js tensors. Do not allocate a long-lived copy of the input buffer. If a future change does use `@tensorflow/tfjs` tensors inside `classifierService.ts`, wrap them in `tf.tidy()`.

4. **Hermes Engine Compatibility**:
   - In React Native (Hermes engine), TensorFlow.js cannot auto-detect a platform because neither DOM nor Node `process.versions.node` exist. Always ensure `PlatformReactNative` from `src/utils/tfjsPlatform.ts` is registered via `ensureTensorFlowPlatform()` to prevent `isTypedArray of undefined` errors. The TFLite path does not import TensorFlow.js.

5. **Recognition honesty**:
   - `classifierService` must not return a species, a confidence percentage, or an inference time unless a real on-device model consumed that photo's pixels.
   - Do not floor confidence, invent latency, hash a URI into a class, or pass a forced species id through the scanner and present it as a scan.
   - `assets/models/labels.json` is a class contract, not a model. Recognition stays unavailable while `src/services/modelPackage.ts` exports `null` and `mushrooms_model.tflite` is absent.
   - A packaged model still must not show an edibility verdict. Amanita, Cortinarius, Galerina, or Gyromitra in the top 3, or low confidence, requires the expert / Sanepid warning. The energy gate and the `not_a_mushroom` class can reject a photo with no species at all.
   - Training data may be CC0 or CC-BY only. Do not fetch NC, SA, or unlicensed photos, and do not install weights that failed `training/ship_gates.py`.

---

## ⚡ Agent Workflow & Commands

Before declaring any coding task complete, agents MUST run and verify the test suites:

```bash
# 1. Run unit & component tests (RTL + Jest)
pnpm test

# 2. Build Storybook static assets
pnpm build-storybook

# 3. Run Playwright E2E browser tests
pnpm test:e2e
```
