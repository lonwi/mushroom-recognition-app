# Agent Guidelines for Grzybobranie AI 🍄📱

This document is the compact operational rulebook for IDE agents (Cursor, Copilot, Claude, Antigravity, local Hermes). All rules are mandatory.
Full specification: [`AGENTS.md`](../../AGENTS.md) · Decisions: [`docs/decyzje-f0.md`](../../docs/decyzje-f0.md).

---

## 1. Branching, PR Lifecycle & Quality Gates
- **Base Branch**: `rewrite/greenfield`. **NEVER commit directly to `rewrite/greenfield` or `main`**.
- **Feature Branches**: Every task/feature requires a dedicated branch (e.g. `feat/...`, `fix/...`) created from `rewrite/greenfield`.
- **Commit Messages**: Conventional Commits in English (`feat:`, `fix:`, `chore:`, etc.). Enforced by `commitlint` and `lefthook`.
- **Pre-Push Validation**: Always run `pnpm format && pnpm quality` and `pnpm export:android`.
- **Pull Request**: Push branch (`git push -u origin <branch>`) and open PR targeting `rewrite/greenfield` via `gh pr create --base rewrite/greenfield`.
- **Task Progression**: Do not start subsequent tasks until the current PR is merged into `rewrite/greenfield` or explicitly approved by the user.
- **Zero Suppression Policy**: Never disable, loosen, or baseline Knip, ESLint, jscpd, Prettier, tsc, or dependency-cruiser to pass CI.
- **Knip Export Hygiene**: Do NOT export module-internal helper components, functions, or types (e.g. internal SVG icons). Unused exports strictly fail Knip CI.

## 2. Architecture & Layer Boundaries
- **Strict Layers**:
  - `src/app/`: Expo Router routes only. Assembles screens from other layers.
  - `src/screens/`: Screen orchestration. Calls `ui`, `core`, `infra`. Never calls `app`.
  - `src/ui/`: Design tokens and pure visual components with zero IO. Never calls `app`, `screens`, `infra`.
  - `src/core/`: Domain logic, i18n, SQLite manifests, log buffers, Zustand stores. Pure TypeScript without React Native, Expo, `ui`, `app`, or `infra`.
  - `src/infra/`: Platform adapters (kv-store, logger, share sheet). Never calls `app`, `screens`, `ui`.
- **Platform Isolation**: `Platform.OS` and `Platform.select` are strictly quarantined inside `src/infra/platform/`.
- **Safe Area**: ALWAYS import `useSafeAreaInsets` / `SafeAreaView` from `'react-native-safe-area-context'`. NEVER from `'react-native'`.
- **No Platform Re-exports**: Adapters must wrap platform methods, never re-export raw platform objects.
- **No TensorFlow.js**: Never import or bundle `@tensorflow/tfjs*`.

## 3. UI Design System (Nordic Field Guide v3.1 / Stitch)
- **Tokens Single Source of Truth**: Colors, spacing, radii, typography come strictly from `src/ui/tokens.ts`. Never hardcode hex colors or arbitrary spacing.
- **Typography & Polish i18n**: User-facing copy strictly in Polish via `src/core/i18n/pl.ts` with symmetrical English keys in `src/core/i18n/en.ts`. Identifiers in English.
- **Touch Target**: Strict minimum 48×48 dp for all touchable/interactive elements.
- **CONDITIONALLY_EDIBLE Guard**: Status `CONDITIONALLY_EDIBLE` NEVER receives green color and NEVER receives cooking/preparation instructions.
- **Navigation & Bottom Bar**:
  - 5 tabs in exact order: **Atlas (`index`) · Dziennik (`journal`) · Skaner (`scanner`) · Pomoc (`help`) · Profil (`profile`)**.
  - Skaner tab features elevated center CTA pill (52×38 dp, deep forest green `#1b382b`, white icon).
  - Fixed-height active indicator bar (2.5 dp) beneath active tab labels to eliminate layout jumping.
  - Respect Android safe-area bottom insets (`Math.max(insets?.bottom ?? 0, 4)`).
- **Camera Viewfinder**:
  - Manual torch toggle only ("Tylko doświetl").
  - Do NOT attempt real-time continuous focus heuristics without photo capture; validation occurs post-capture or as static framing guide.

## 4. Life-Safety & Offline Boundaries
- **Emergency Contacts**: Emergency phone numbers exist **only** in `src/core/safety/emergency-contacts.ts` (Q19). Never hardcode numbers anywhere else.
- **Edibility Verdict Boundary**: The ML model NEVER decides edibility. Edibility status is resolved strictly from `species.db` by species ID.
- **Recognition Honesty**: Never return an inferred species, confidence, or latency unless a real on-device model processed pixels. An uncalibrated or missing model must return "recognition unavailable". Never output an edibility verdict from model weights.
- **Offline First**: Zero telemetry, zero external network requests during recognition, zero OTA updates (`updates.enabled: false`).
- **Graceful Fallbacks**: When building or displaying species cards without external HF assets, use in-memory donor card seed fallbacks without crashing.
- **Image Licensing**: Mobile UI displays only `CC0` and `CC BY` licensed images with proper attribution.

## 5. Testing & Verification Standards
- **Test Placement**: Tests live collocated with implementation (`*.test.ts`, `*.test.tsx`).
- **Compound Component Queries**: In React Native Testing Library (React 19), use `getByTestId` for compound interactive elements (e.g. tabs, complex buttons) to avoid fragile accessible name mismatches caused by nested icons and indicator lines.
- **Validation Commands**:
  ```bash
  pnpm format            # Prettier code formatting
  pnpm quality           # tsc, ESLint 9 (0 warnings), Prettier, Knip, jscpd (<1.5%), depcruise, Jest
  pnpm export:android    # Hermes Android JS bundle build check
  ```

## 6. Dedicated Project Skills
- `grzybobranie-quality-gate` (`.agents/skills/grzybobranie-quality-gate/SKILL.md`)
- `grzybobranie-safety-and-domain` (`.agents/skills/grzybobranie-safety-and-domain/SKILL.md`)
- `grzybobranie-layer-guardrails` (`.agents/skills/grzybobranie-layer-guardrails/SKILL.md`)
- `grzybobranie-pr-review` (`.agents/skills/grzybobranie-pr-review/SKILL.md`)
