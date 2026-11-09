# Agent Guidelines for Grzybobranie AI 🍄📱

This document is the compact operational rulebook for IDE agents (Cursor, Copilot, Claude, Antigravity). All rules are mandatory.
Full specification: [`AGENTS.md`](../../AGENTS.md) · Design: [`docs/DESIGN.md`](../../docs/DESIGN.md) · Quality: [`docs/QUALITY.md`](../../docs/QUALITY.md) · Reviews: [`docs/REVIEW.md`](../../docs/REVIEW.md).

---

## 1. Core Engineering & Platform Guardrails
- **Package Manager**: Use `pnpm` exclusively (`pnpm.cmd` on Windows). Never use or commit `package-lock.json` or `yarn.lock`.
- **Safe Area**: ALWAYS import `SafeAreaView` from `'react-native-safe-area-context'`. NEVER import it from `'react-native'`.
- **Platform Adapters**: Platform packages (`@react-native-async-storage/async-storage`, `expo-camera`, `expo-location`, `expo-file-system`, `react-native-fast-tflite`) are strictly restricted to the adapter modules defined in `scripts/adapter-allowlist.cjs`. Never import them directly into screens or UI components.
- **No Platform Re-exports**: Adapters must wrap platform methods, never re-export raw platform objects (enforced by ESLint rule `grzybobranie/no-platform-reexport`).
- **No TensorFlow.js**: Never import or bundle `@tensorflow/tfjs*` in the app runtime.
- **Component-Level Tests**: React Testing Library tests are written at the component level and live in the module under test's own `__tests__/` folder, e.g. `src/components/__tests__/DevInferenceOverlay.test.tsx`. Never place component tests in a flat root-level test folder such as `src/__tests__/components/`.

## 2. UI Design System (Nordic Field Guide v3.1)
- **Token Source of Truth**: Read colors, spacing, radius, and typography exclusively from `src/theme/tokens.ts`. Never hardcode hex values.
- **Typography**: Exclusively **Plus Jakarta Sans** (`font-sans`). Monospace and serif fonts are prohibited in app UI.
- **Prohibitions**: No neon greens, laser scan lines, dark cyberpunk HUDs, fake mobile status bars, blur shadows > 4 px, or horizontal comparison sliders on mobile.
- **Locked Components**:
  - `BottomNavigationBar`: Tabs in order **Atlas · Dziennik · Skaner · Pomoc · Profil**. Skaner uses the `primaryGreen` pill CTA.
  - `Deadly Poisonous Badge`: `#2A080C` background, `#FF4560` text, `1.5px solid #FF1744` border with skull (☠️).

## 3. Life-Safety & Domain Rules
- **Emergency Numbers Single Source**: Emergency contact numbers exist **only** in `src/data/safetyRules.ts`. Never hardcode phone numbers elsewhere.
- **Edibility Categories**: Every species uses strictly one `EdibilityStatus` (`EDIBLE`, `INEDIBLE`, `POISONOUS`, `DEADLY_POISONOUS`).
- **Look-Alike (Sobowtór) Rules**: Distinguishing morphological traits must be listed in `confusionRisks`. If confused with a deadly species, set `fatal: true`.
- **Recognition Honesty**: Never return an inferred species, confidence, or latency unless a real on-device model processed pixels. Uncalibrated/missing model returns "recognition unavailable". Never output an edibility verdict from model weights.

## 4. Licensing & Data Boundaries
- **UI Images**: Only images licensed under **`CC0`** or **`CC BY`** may be bundled or displayed in the mobile app UI (`src/`).
- **Training Data**: `CC BY-NC`, `CC BY-SA`, and `pd-self` are restricted to the ML training pipeline (`ml/`).
- **No Data in Git**: Never commit `.csv` manifests, raw images, or external dataset archives to Git.

## 5. Local Validation Suite
Run all checks before completing any task:
```bash
pnpm typecheck                                     # tsc --noEmit
pnpm test                                          # Jest + RNTL unit & component tests
pnpm quality                                       # ESLint, jscpd, knip, depcruise, site check
pnpm build-storybook && pnpm test:e2e              # Storybook & Playwright E2E
```
Never loosen a quality gate or expand baselines to make CI pass.
