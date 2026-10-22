# Quality gates and PR process

This file says what CI checks, which limits are fixed, and how a change gets merged. Read it before changing anything in `eslint.config.mjs`, `.jscpd.json`, `knip.json`, `.dependency-cruiser.cjs`, `scripts/`, `quality/`, `training/ship_gates.py` or `.github/workflows/`.

## CI (`.github/workflows/ci.yml`)

Runs on every pull request and on pushes to `main`. All four jobs must be green before merge.

| Job | What it runs |
|---|---|
| `check` | `pnpm install --frozen-lockfile`, `pnpm audit --audit-level high`, `pnpm typecheck`, a credit-module typecheck from `training/tests/test_contract.py`, `pnpm test --ci --coverage` (coverage uploaded as an artifact) |
| `Code quality` | `pnpm lint`, `pnpm duplication`, `pnpm knip`, `pnpm depcruise` (same as `pnpm quality`) |
| `python` | `python -m unittest discover -s training/tests -v` |
| `End-to-end` | `pnpm build-storybook`, then `pnpm test:e2e` (Playwright, Chromium) |

`release.yml` builds releases; see `docs/RELEASE.md`.

Workflow rules: top-level `permissions: contents: read` (a job may add only what it needs, e.g. `actions: write` for the coverage upload), every action pinned to a full commit SHA with the version in a comment, runners pinned to `ubuntu-24.04`. Audit exceptions go only into `pnpm.auditConfig.ignoreCves` in `package.json` with a comment in `ci.yml` saying why.

## The gates

Baselines record findings that existed when a gate was introduced. CI fails only on **new** findings.

| Gate | Command | Config / baseline | Rule |
|---|---|---|---|
| ESLint | `pnpm lint` | `eslint.config.mjs`, `eslint-suppressions.json` | `--max-warnings 0`. Suppressions only shrink: after fixing, run `pnpm lint:prune`. |
| Copy-paste (jscpd) | `pnpm duplication` | `.jscpd.json` (`threshold: 2` %, `minTokens: 50`, `minLines: 5`), `.jscpd-baseline.json` | `pnpm duplication:strict` fails on any new clone. `pnpm duplication:update` only after removing clones. |
| Unused code (knip) | `pnpm knip` | `knip.json`, `quality/knip-baseline.json`, `scripts/knip-baseline.mjs` | New unused files/deps fail. `EXPORT_SLACK = 0`: no new unused export is tolerated. After cleaning up, `pnpm knip:update`. |
| Architecture (dependency-cruiser) | `pnpm depcruise` | `.dependency-cruiser.cjs`, `.dependency-cruiser-known-violations.json`, `scripts/depcruise-gate.mjs`, `scripts/adapter-allowlist.cjs`, tests in `scripts/quality-gates.test.mjs` | Only the adapters in `adapter-allowlist.cjs` may import storage/platform packages, and each adapter only from the importers listed next to it (exact, never baselined). `src/i18n` must not import `src/data` (`i18n-not-to-data`). After fixing, `pnpm depcruise:tighten` (shrinks the baseline). |
| Model ship gates | `training/ship_gates.py` | constants at the top of the file | Weights that fail are never installed into `assets/models/`. E.g. each high-stakes class needs top-1 ≥ 0.85 on its held-out support, open-set safety ≥ 0.90. Gates **fail**, they never skip when data is missing. |

## What must not be loosened

Changing any of these needs an explicit decision by the repo owner, written in the PR. "CI is red" is not a reason.

- Any threshold: ESLint rules or `--max-warnings 0`, jscpd `threshold`, `EXPORT_SLACK = 0`, ship-gate floors and minimum test supports.
- Baselines (`eslint-suppressions.json`, `.jscpd-baseline.json`, `quality/knip-baseline.json`, `.dependency-cruiser-known-violations.json`) may only **shrink**. `pnpm depcruise:baseline` / `lint:baseline` that add entries are not used to hide new problems.
- Dependency-cruiser allowlists in `scripts/adapter-allowlist.cjs` – adding an importer is a design change, explain it in the PR.
- `allowBackup: false` in `app.json`.
- Workflow `permissions: contents: read` and SHA-pinned actions.
- Branch ruleset: required checks stay required; the `check` source is "GitHub Actions", never "any source".
- Training data license rules in `AGENTS.md` (BY-NC and DF20 for training only).

## Working loop: code → check → learn → improve → push

1. **Code** – one small topic per branch.
2. **Check** – run everything CI runs (`pnpm typecheck`, `pnpm test`, `pnpm quality`, e2e, Python tests when `training/` changed). Read the failures; do not silence them.
3. **Learn** – when a check, review or bug teaches something new (a missed case, a wrong assumption), write it down where the next person will see it: a test that pins it, a gate rule, or a line in this file or `AGENTS.md`.
4. **Improve** – fix the cause, not the symptom. If you fixed old findings, shrink the baseline (`lint:prune`, `knip:update`, `depcruise:tighten`).
5. **Push** – open a (draft) PR and follow the process below.

## PR process

1. Work on a branch, one topic per PR. Run the commands from `AGENTS.md` → "Agent Workflow & Commands" locally.
2. Open a PR with a short description: what changed, why, how it was tested, and any gate or baseline change (baselines may only go down).
3. All four CI jobs green.
4. Review (the PR Review agent and/or a human). Requested changes are fixed in the same PR.
5. **Merge only after the repo owner's explicit OK**, as a squash merge.

## Weekly reviews

Two automated reviews run every Monday morning (Europe/Warsaw) on `main`: a SOLID/DRY code review and a security review (npm and Python dependencies, CI/CD, app permissions and data, training pipeline, new code). Each produces a report with a comparison to the previous week. Fixes from these reviews start only after the owner's OK.
