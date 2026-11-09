# PR Review Guidelines

This document provides advisory guidelines for human contributors and automated agents reviewing Pull Requests in the **Grzybobranie AI** repository.

Reference: [`docs/QUALITY.md`](QUALITY.md) (CI gates, baseline non-loosening rules, merge authority).

---

## 1. Safety-First Domain Rules (Highest Priority)

Any change affecting mushroom edibility, toxicity, look-alikes, or emergency contact info requires meticulous verification. The repository owner has the final merge authority on safety-critical changes.

- [ ] **Emergency numbers**: Emergency numbers exist **only** in `src/data/safetyRules.ts`. Verified by `src/__tests__/siteEmergencyNumbers.test.ts`. Screens and components must never hardcode phone numbers; they link or import from `safetyRules.ts`.
- [ ] **Edibility status integrity**: Every species uses strictly one `EdibilityStatus` (`EDIBLE`, `INEDIBLE`, `POISONOUS`, `DEADLY_POISONOUS`). Never derive or guess toxicity from other fields.
- [ ] **Look-alike alerts (Sobowtór)**: Morphological differences must be explicitly described in `confusionRisks`. If a species can be confused with a deadly toxic mushroom, `fatal: true` must be set so `LookAlikeAlert` renders the red banner.
- [ ] **Honest recognition**: The model and UI must never invent confidence scores, fabricate latency, or return an edibility verdict from weights. `unknown_mushroom` displays the honest "unknown" message; `not_a_mushroom` rejects non-fungal captures.
- [ ] **No dosages**: For psychoactive or medicinal species, reference literature citations must never state dosages.

---

## 2. Quality Gates & Architecture Boundaries

- [ ] **Baselines never expand**: Quality baselines (`eslint-suppressions.json`, `.dependency-cruiser-known-violations.json`, `quality/knip-baseline.json`, `.jscpd-baseline.json`) may only shrink or stay unchanged. Never loosen a gate to make CI pass.
- [ ] **Adapter pattern**: Direct imports of platform packages (`@react-native-async-storage/async-storage`, `expo-camera`, `expo-location`, `expo-file-system`, `react-native-fast-tflite`) are strictly confined to the adapter files in `scripts/adapter-allowlist.cjs`.
- [ ] **No platform re-exports**: Adapters must not re-export raw platform objects (enforced by custom ESLint rule `grzybobranie/no-platform-reexport`).
- [ ] **i18n layer separation**: `src/i18n` must never import `src/data` (enforced by dependency-cruiser rule `i18n-not-to-data`).
- [ ] **Full validation pass**:
  ```bash
  pnpm typecheck
  pnpm test
  pnpm quality
  pnpm build-storybook && pnpm test:e2e
  ```

---

## 3. UI & Design System (Nordic Field Guide v3.1)

- [ ] **Design tokens**: All colors, radiuses, and typography must come from `src/theme/tokens.ts`. Hardcoded hex values or arbitrary Tailwind/style colors are prohibited.
- [ ] **Safe Areas**: `SafeAreaView` must **always** be imported from `react-native-safe-area-context`, never from `react-native`.
- [ ] **Locked components**:
  - `BottomNavigationBar`: Tabs in order **Atlas · Dziennik · Skaner · Pomoc · Profil**. Skaner uses the `primaryGreen` pill CTA.
  - `Deadly Poisonous Badge`: `#2A080C` background, `#FF4560` text, `1.5px solid #FF1744` border with skull (☠️).
- [ ] **Touch targets**: Interactive elements must meet the 48 × 48 px minimum touch target.
- [ ] **Aesthetic guardrails**: No neon colors, no laser scanner animations, no monospace fonts in UI, no fake status bars.

---

## 4. Internationalization & Documentation

- [ ] **Bilingual translations**: Any new user-facing string must be added to both `src/i18n/pl.ts` and `src/i18n/en.ts`.
- [ ] **Documentation parity**: If `README.md` or user-facing setup guides change, verify the corresponding English file (`README.en.md`, `docs/RELEASE.en.md`) is kept in sync.
- [ ] **Agent instructions**: Agent instructions, prompts, and rules must be written in English.
- [ ] **Conventional commits**: Git commit messages must follow Conventional Commits in English (e.g., `feat(scanner): ...`, `fix(journal): ...`).

---

## 5. Licensing & Data Privacy

- [ ] **UI asset licensing**: Images displayed in the app UI (`src/`) must be licensed under **`CC0`** or **`CC BY`** with full attribution. `CC BY-NC`, `CC BY-SA`, and `pd-self` are restricted to the ML training pipeline.
- [ ] **No training data in Git**: Dataset manifests (`*.csv`), raw images, or external archives (`DF20`/`DF24`) must never be committed to Git.
- [ ] **HTTPS everywhere**: All external URLs in code and data must use `https://`.

---

## 6. Deferred Work & Follow-ups

- [ ] Every deferred item ("in a separate PR", "after merge") has an issue created or a reference added to an existing issue.
- [ ] The PR description includes a `Follow-ups` section with `#N` links if applicable.
