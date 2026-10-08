// Grandfathered Knip findings. A new unused file, export, type, or dependency
// fails this script. Findings that have been fixed do not (so a cleanup PR
// stays green). Drop stale entries with: pnpm knip:update
//
// TODO: run `pnpm knip:update` after the real issues are removed, until the
// baseline is empty. Do not use --update to hide a new finding.
//
// knip.json `ignoreDependencies` is only for false positives: @babel/core
// (installed peer), expo-updates and expo-system-ui (Knip's Expo heuristics),
// and @resvg/resvg-js (optional `pnpm dlx` tool). dependency-cruiser is
// spawned by file path from scripts/depcruise-gate.mjs, so Knip does not
// see the package name in an npm script. Real unused packages belong
// in quality/knip-baseline.json, not in that ignore list.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const baselinePath = path.resolve('quality/knip-baseline.json');
const update = process.argv.includes('--update');

const result = spawnSync(
  process.execPath,
  [
    path.resolve('node_modules/knip/bin/knip.js'),
    '--reporter',
    'json',
    '--no-progress',
    '--no-config-hints',
  ],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

const crashed = result.status !== 0 && result.status !== 1;
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(result.stderr);
  console.error(result.stdout);
  process.exit(result.status || 1);
}

if (crashed) {
  console.error(result.stderr);
  process.exit(result.status || 1);
}

function identities(payload) {
  const ids = [];
  for (const issue of payload.issues ?? []) {
    const file = issue.file ?? '';
    for (const [type, items] of Object.entries(issue)) {
      if (type === 'file' || !Array.isArray(items)) continue;
      for (const item of items) {
        const name = typeof item === 'string' ? item : item?.name;
        if (!name) continue;
        ids.push(`${type}\t${file}\t${name}`);
      }
    }
  }
  for (const file of payload.files ?? []) {
    ids.push(`files\t${file}\t${file}`);
  }
  return [...new Set(ids)].sort();
}

const current = identities(report);

if (update) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  const document = {
    note: 'Grandfathered Knip issues. A new dependency, unlisted import, or unresolved import (including require) fails immediately. Up to 12 new files, exports, or types are allowed so a split can move symbols; lower EXPORT_SLACK in scripts/knip-baseline.mjs to 0 after that. pnpm knip:update rewrites this list from the current tree.',
    issues: current,
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Wrote ${current.length} Knip issues to ${path.relative(process.cwd(), baselinePath)}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing ${baselinePath}. Run pnpm knip:update and commit the file.`);
  process.exit(1);
}

// Exports, types, and files move when code is split. A few new identities of
// those kinds are allowed so the in-flight refactor can land beside this gate.
// A new dependency, unlisted import, or unresolved import (JS import or
// require of a missing module) is never inside that slack.
// TODO: set EXPORT_SLACK to 0 once that refactor is merged and the baseline is refreshed.
const EXPORT_SLACK = 12;
const SLACK_TYPES = new Set([
  'files',
  'exports',
  'types',
  'nsExports',
  'nsTypes',
  'duplicates',
  'enumMembers',
  'namespaceMembers',
]);

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const known = new Set(baseline.issues ?? []);
const fresh = current.filter((id) => !known.has(id));
const stale = [...known].filter((id) => !current.includes(id));
const freshHard = fresh.filter((id) => !SLACK_TYPES.has(id.split('\t')[0]));
const freshSoft = fresh.filter((id) => SLACK_TYPES.has(id.split('\t')[0]));

const byType = (ids) => {
  const counts = {};
  for (const id of ids) {
    const type = id.split('\t')[0];
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
};

console.log(
  `Knip baseline: ${known.size} grandfathered, ${current.length} current, ${fresh.length} new (${freshHard.length} hard, ${freshSoft.length} movable, slack ${EXPORT_SLACK}), ${stale.length} stale`,
);
console.log(`Current by type: ${JSON.stringify(byType(current))}`);

if (stale.length > 0) {
  console.log('Stale (fixed, still in the baseline — run pnpm knip:update to drop them):');
  for (const id of stale) console.log(`  ${id.replaceAll('\t', ' ')}`);
}

if (freshHard.length > 0 || freshSoft.length > EXPORT_SLACK) {
  console.error('New Knip issues:');
  for (const id of fresh) console.error(`  ${id.replaceAll('\t', ' ')}`);
  process.exit(1);
}

if (freshSoft.length > 0) {
  console.log(`Allowed by slack (${freshSoft.length}/${EXPORT_SLACK}):`);
  for (const id of freshSoft) console.log(`  ${id.replaceAll('\t', ' ')}`);
}
