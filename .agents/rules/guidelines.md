# Agent Guidelines for Grzybobranie AI 🍄📱

This document is the compact operational rulebook for IDE agents (Antigravity, Cursor, Claude Code, local Hermes). All rules are mandatory.
Full specification: [`AGENTS.md`](../../AGENTS.md) · Decisions: [`docs/decyzje-f0.md`](../../docs/decyzje-f0.md) · Architecture: [`docs/adr/0001-styling.md`](../../docs/adr/0001-styling.md).

---

## 1. Core Engineering & Platform Guardrails
- **Branch Target**: Work always branches from `rewrite/greenfield` and PRs target `rewrite/greenfield`. **NEVER target or commit to `main`** (frozen prototype).
- **Commit Messages**: Conventional Commits in English (`feat:`, `fix:`, `chore:`, etc.). Enforced by `commitlint` and `lefthook`.
- **Package Manager**: Use `pnpm` exclusively (`pnpm.cmd` on Windows). Never commit `package-lock.json` or `yarn.lock`.
- **Safe Area**: ALWAYS import `SafeAreaView` from `'react-native-safe-area-context'`. NEVER import it from `'react-native'`.
- **5-Layer Architecture**:
  - `src/app/` -> routes only.
  - `src/screens/` -> screen layouts. Cannot import `src/app`.
  - `src/ui/` -> Pileus design tokens and dumb presentational views. Cannot import `src/app`, `src/screens`, `src/infra`.
  - `src/core/` -> domain logic, i18n, schemas. **Pure TypeScript!** No React, no React Native, no Expo, no `ui`, no `screens`, no `infra`.
  - `src/infra/` -> I/O adapters (SQLite, files, kv-store, platform). Cannot import `src/app`, `src/screens`, `src/ui`.
- **Platform Isolation (Q13)**: `Platform.OS` and `Platform.select` are allowed ONLY in `src/infra/platform/`. Android/iOS-only APIs (`BackHandler`, `ToastAndroid`, etc.) are forbidden.
- **No TensorFlow.js**: Never import or bundle `@tensorflow/tfjs*` in the app runtime.

## 2. UI Design System (Nordic Field Guide & Pileus Tokens)
- **Token Source of Truth**: Colors, spacing, radius, and typography come strictly from `src/ui/tokens.ts`. Never hardcode hex values.
- **Typography**: Exclusively **Plus Jakarta Sans** (`font-sans`).
- **CONDITIONALLY_EDIBLE Guard**: Status `CONDITIONALLY_EDIBLE` NEVER receives green color and NEVER receives cooking/preparation instructions.

## 3. Life-Safety & Domain Rules
- **Recognition Honesty**: The ML model NEVER predicts edibility. Edibility is resolved strictly by species slug from `species.db`.
- **Emergency Contacts**: Emergency contact information lives **only** in `src/core/safety/emergency-contacts.ts`. Never hardcode emergency numbers elsewhere.
- **Look-Alikes**: Confusions with deadly poisonous species must be marked with `fatal: true`.
- **Licensing**: Only **`CC0`** and **`CC BY`** images (with full attribution) may be displayed in the mobile app UI (`src/`).

## 4. Local Validation Suite & Zero Suppression
Run all checks before completing any task:
```bash
pnpm quality    # tsc, eslint --max-warnings 0, prettier --check, jscpd (1.5%), knip, depcruise, jest --ci
```
**Zero-Suppression Policy**: Never add `eslint-disable`, knip ignores, jscpd baseline, or depcruise overrides to make CI pass. Fix the underlying code.

## 5. Dedicated Project Skills
- `grzybobranie-quality-gate` (`.agents/skills/grzybobranie-quality-gate/SKILL.md`)
- `grzybobranie-safety-and-domain` (`.agents/skills/grzybobranie-safety-and-domain/SKILL.md`)
- `grzybobranie-layer-guardrails` (`.agents/skills/grzybobranie-layer-guardrails/SKILL.md`)
- `grzybobranie-pr-review` (`.agents/skills/grzybobranie-pr-review/SKILL.md`)
