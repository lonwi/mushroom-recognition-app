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

For ESLint, knip and dependency-cruiser, baselines record findings that existed when the gate was introduced, and CI fails only on **new** findings. jscpd in CI is different: it uses a total duplication threshold, without a baseline.

| Gate | Command | Config / baseline | Rule |
|---|---|---|---|
| ESLint | `pnpm lint` | `eslint.config.mjs`, `eslint-suppressions.json` | `--max-warnings 0`. Suppressions only shrink: after fixing, run `pnpm lint:prune`. |
| Copy-paste (jscpd) | `pnpm duplication` | `.jscpd.json` (`threshold: 2` %, `minTokens: 50`, `minLines: 5`) | CI fails when total duplication exceeds 2 %. Locally, `pnpm duplication:strict` also fails on any clone not in `.jscpd-baseline.json`; it is not run in CI. `pnpm duplication:update` only after removing clones. |
| Unused code (knip) | `pnpm knip` | `knip.json`, `quality/knip-baseline.json`, `scripts/knip-baseline.mjs` | New unused files/deps fail. `EXPORT_SLACK = 0`: no new unused export is tolerated. After cleaning up, `pnpm knip:update`. |
| Architecture (dependency-cruiser) | `pnpm depcruise` | `.dependency-cruiser.cjs`, `.dependency-cruiser-known-violations.json`, `scripts/depcruise-gate.mjs`, `scripts/adapter-allowlist.cjs`, tests in `scripts/quality-gates.test.mjs` | Only the adapters in `adapter-allowlist.cjs` may import storage/platform packages, and each adapter only from the importers listed next to it (exact, never baselined). `src/i18n` must not import `src/data` (`i18n-not-to-data`). After fixing, `pnpm depcruise:tighten` (shrinks the baseline). |
| Model ship gates | `training/ship_gates.py` | constants at the top of the file **and** literals inside the checks | Weights that fail are never installed into `assets/models/`. Current floors include: macro top-1 ≥ 0.80 and top-3 ≥ 0.90; ≥ 40 training images per species after dedup; each high-stakes class top-1 ≥ 0.85 on a held-out support of ≥ 8; `HIGH_STAKES_STEAL_SUPPORT_MIN = 30`; ≥ 30 confident out-of-distribution examples; open-set safe-result rate ≥ 0.90 with Wilson lower bound ≥ 0.85; held-out non-mushroom reject rates ≥ 0.90; TFLite vs float32 agreement ≥ 0.99. A minimum of 30 **test** photos per high-stakes class for top-1 is planned, not in code yet. Gates **fail**, they never skip when data is missing. |

## What must not be loosened

Changing any of these needs an explicit decision by the repo owner, written in the PR. "CI is red" is not a reason.

- Any threshold: ESLint rules or `--max-warnings 0`, jscpd `threshold`, `EXPORT_SLACK = 0`, ship-gate floors and minimum test supports.
- Baselines (`eslint-suppressions.json`, `.jscpd-baseline.json`, `quality/knip-baseline.json`, `.dependency-cruiser-known-violations.json`) may only **shrink**. `pnpm knip:update`, `pnpm depcruise:baseline`, `pnpm lint:baseline` and `pnpm duplication:update` rewrite a baseline from scratch, so they can also add entries: run them only when the gate reports **no new findings**, and check the diff shrinks. `pnpm lint:prune` and `pnpm depcruise:tighten` only remove entries.
- Dependency-cruiser allowlists in `scripts/adapter-allowlist.cjs` – adding an importer is a design change, explain it in the PR.
- `allowBackup: false` in `app.json`.
- Workflow `permissions: contents: read` and SHA-pinned actions.
- Branch ruleset: required checks stay required; the `check` source is "GitHub Actions", never "any source".
- Training data license rules in `AGENTS.md` (BY-NC and DF20 for training only).

## Working loop: code → check → learn → improve → push

1. **Code** – one small topic per branch.
2. **Check** – run everything CI runs (`pnpm typecheck`, `pnpm test`, `pnpm quality`, e2e, Python tests when `training/` changed). Read the failures; do not silence them.
3. **Learn** – when a check, review or bug teaches something new (a missed case, a wrong assumption), write it down where the next person will see it: a test that pins it, a gate rule, or a line in this file or `AGENTS.md`.
4. **Improve** – fix the cause, not the symptom. If you fixed old findings, shrink the baseline (`lint:prune`, `depcruise:tighten`, or `knip:update` when knip reports nothing new).
5. **Push** – open a (draft) PR and follow the process below.

## PR process

1. Work on a branch, one topic per PR. Run the commands from `AGENTS.md` → "Agent Workflow & Commands" locally.
2. Open a PR with a short description: what changed, why, how it was tested, and any gate or baseline change (baselines may only go down). Deferred items go in a Follow-ups section as `Follow-up: #N`. Rules: "Śledzenie odłożonych rzeczy".
3. CI green.
4. Review by the PR Review agent (checklist in `docs/REVIEW.md` once it exists). Requested changes are fixed in the same PR.
5. Merge, as a squash merge:
   - PRs by the Grzybobranie agent: merged by that agent after PR Review approves and `check` is green.
   - PRs by the Quality agent: only after the repo owner's explicit OK.
   - Anything that changes safety content (warnings, edibility, emergency numbers, look-alikes): the owner has the final word, whoever opened the PR.

## Weekly reviews

Two automated reviews run every Monday morning (Europe/Warsaw) on `main`: a SOLID/DRY code review and a security review (npm and Python dependencies, CI/CD, app permissions and data, training pipeline, new code). Each produces a report with a comparison to the previous week. Fixes from these reviews start only after the owner's OK.

The SOLID/DRY report includes "otwarte follow-upy": issues with no activity for more than 7 days. Tracking rules are in "Śledzenie odłożonych rzeczy".

## Śledzenie odłożonych rzeczy

Odłożona rzecz nie zostaje w czacie ani w samym opisie PR. W tej samej turze dostaje issue (albo punkt w issue, które już jest) i link z opisu PR.

1. Każda odłożona rzecz („w osobnym PR”, „po merge'u”, „decyzja Wojtka”) dostaje issue w tej samej turze, w której padła, albo punkt w istniejącym issue. Nic odłożonego nie zostaje tylko w czacie lub opisie PR.
2. Opis PR ma sekcję „Follow-ups” z linkiem `#N` do każdej odłożonej pozycji. Review nie daje approve, jeśli w review padło „w osobnym PR”, a w opisie nie ma linii `Follow-up: #N`.
3. `TODO` w kodzie zawsze ma numer issue, na przykład `TODO(#50)`.
4. Używamy wyłącznie etykiet, które już są w repozytorium.

| Etykieta | Kiedy |
|---|---|
| `needs-decision` | Czeka na decyzję Wojtka. |
| `deferred` | Odłożone na później. |
| `safety` | Treści BHP, numery alarmowe, zatrucia. Zawsze priorytet. |
| `data` | Dane gatunków, zdjęcia treningowe, licencje. |
| `code` | Kod aplikacji, CI i bramki jakości. |
| `ui` | Interfejs, teksty i dostępność. |

5. Rzecz wymagana przed publiczną wersją dostaje kamień milowy „Przed wydaniem”.
6. Jedno zbiorcze issue: [#52](https://github.com/lonwi/mushroom-recognition-app/issues/52). Mniejsze issue są jego sub-issues. Szczegóły odhacza się w mniejszych issue.
7. Poniedziałkowy przegląd SOLID/DRY (sekcja „Weekly reviews”) ma w raporcie sekcję „otwarte follow-upy”: issue bez ruchu dłużej niż 7 dni.
