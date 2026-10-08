// Adapter allowlist gate.
//
// Only the files in scripts/adapter-allowlist.cjs may import storage and
// platform packages. Each of those adapters may be imported only by the
// modules named next to it. That importer check is exact: hits are never
// written to .dependency-cruiser-known-violations.json.
//
// UI may still reach an adapter through an allowed importer. The old
// transitive UI→adapter rule is gone because LanguageContext → settingsStore
// → keyValueStore is a legitimate chain, and useLanguage() pulls it into
// almost every screen. A (from, to) baseline cannot see a new wrapper that
// calls asyncStorageStore.get/set; the importer rule can.
//
// A path that reaches a platform package is allowed only when it enters an
// adapter or a direct import already in the baseline (LanguageContext, the
// scanner). import type does not count.
//
// dependency-cruiser 18.5 needs Node ^22 || ^24. The check below uses
// package.json `engines.node`, which is the same range.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { satisfiesNode } from './node-engine.mjs';

const loadConfig = createRequire(import.meta.url);
const cruiseConfig = loadConfig('../.dependency-cruiser.cjs');
const { adapters } = loadConfig('./adapter-allowlist.cjs');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const nodeRange = packageJson.engines?.node;
if (!nodeRange || !satisfiesNode(process.versions.node, nodeRange)) {
  console.error(
    `This repo needs Node ${nodeRange ?? '(missing engines.node)'}. Current process: ${process.versions.node}. dependency-cruiser 18.5 fails on Node 20.19.`,
  );
  process.exit(1);
}

const knownPath = path.resolve('.dependency-cruiser-known-violations.json');
const update = process.argv.includes('--update');
const shrink = process.argv.includes('--shrink');
const platformRuleName = 'ui-not-to-storage-or-platform';
const platformReachableName = 'ui-not-to-storage-or-platform-reachable';
const IMPORTER_PREFIX = 'adapter-importer-';
const removedAdapterRules = ['ui-not-to-platform-adapter', 'ui-not-to-platform-adapter-reachable'];
const outsideWrapper = 'src/services/qaRawStore.ts';
const outsideScreen = 'src/screens/QaRawScreen.tsx';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ruleByName(name) {
  return cruiseConfig.forbidden.find((rule) => rule.name === name);
}

function joined(value) {
  return Array.isArray(value) ? value.join('|') : String(value ?? '');
}

function assertPattern(label, pattern, matches, skips) {
  const expression = new RegExp(joined(pattern));
  for (const sample of matches) {
    if (!expression.test(sample)) fail(`${label} should match ${sample}`);
  }
  for (const sample of skips) {
    if (expression.test(sample)) fail(`${label} should not match ${sample}`);
  }
}

function assertRemovedRules() {
  for (const name of removedAdapterRules) {
    if (ruleByName(name)) {
      fail(`${name} must stay removed. Importer allowlists replace the UI→adapter rules.`);
    }
  }
}

function assertOneImporter(adapter, outside) {
  const rule = ruleByName(`${IMPORTER_PREFIX}${adapter.name}`);
  if (!rule) fail(`Missing importer rule for ${adapter.name}.`);
  if (rule.to?.path !== adapter.to) fail(`Importer target drifted for ${adapter.name}.`);
  if (joined(rule.from?.pathNot) !== joined(adapter.importers)) fail(`Importer list drifted for ${adapter.name}.`);
  if (rule.to?.reachable || rule.to?.dependencyTypesNot) {
    fail(`${adapter.name} importer rule must match every import, including import type.`);
  }
  assertPattern(`${adapter.name} importers`, rule.from.pathNot, [], outside);
}

function assertImporterRulesMatchAllowlist() {
  const importerRules = cruiseConfig.forbidden.filter((rule) => rule.name.startsWith(IMPORTER_PREFIX));
  if (importerRules.length !== adapters.length) {
    fail(`Expected ${adapters.length} importer rules, found ${importerRules.length}.`);
  }
  const outside = [outsideWrapper, outsideScreen, 'src/services/storage/qaRawStore.ts'];
  for (const adapter of adapters) assertOneImporter(adapter, outside);
}

function assertPlatformLayer() {
  const platformRule = ruleByName(platformRuleName);
  const platformReachable = ruleByName(platformReachableName);
  if (!platformRule?.from?.pathNot || !platformReachable?.to?.path || !platformReachable.from?.path) {
    fail('Platform layer rules in .dependency-cruiser.cjs are incomplete.');
  }

  assertPattern(
    'keyValueStore target',
    ruleByName(`${IMPORTER_PREFIX}keyValueStore`).to.path,
    ['src/services/keyValueStore.ts', 'src/services/storage/keyValueStore.ts'],
    [
      'src/services/storage/keyValueStoreExtra.ts',
      'src/services/notkeyValueStore.ts',
      'src/keyValueStore.ts',
      'src/services/storage/backup/keyValueStore.ts',
    ],
  );
  assertPattern(
    'keyValueStore importers',
    ruleByName(`${IMPORTER_PREFIX}keyValueStore`).from.pathNot,
    [
      'src/services/storage/journalRepository.ts',
      'src/services/storage/settingsStore.ts',
      'src/services/storage/journalBackupStore.ts',
      'src/services/storage/keyValueStore.test.ts',
      'src/__tests__/services/keyValueStore.test.ts',
    ],
    ['src/contexts/LanguageContext.tsx', 'App.tsx', outsideWrapper, outsideScreen],
  );
  assertPattern(
    'platform importers',
    platformRule.from.pathNot,
    [
      'node_modules/expo-camera/build/index.js',
      'src/stories/JournalScreen.stories.tsx',
      'src/services/storage/keyValueStore.ts',
      'src/services/keyValueStore.ts',
      'src/services/storageService.ts',
      'src/services/journalPhotos.ts',
    ],
    ['src/contexts/LanguageContext.tsx', 'src/screens/ScannerScreen.tsx', outsideWrapper, 'src/services/journalEntry.ts'],
  );
}

function assertAdapterConfig() {
  assertRemovedRules();
  assertImporterRulesMatchAllowlist();
  assertPlatformLayer();
}

assertAdapterConfig();

const platformReachable = ruleByName(platformReachableName);
const adapterPath = adapters.map((adapter) => adapter.to).join('|');
const platformRe = new RegExp(platformReachable.to.path);
const adapterRe = new RegExp(adapterPath);
const platformUiRe = new RegExp(platformReachable.from.path);
const platformUiNotRe = new RegExp(platformReachable.from.pathNot);
const nodeModulesRe = /(?:^|\/)node_modules\//;

function loadReport() {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve('node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'),
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      'src',
      'App.tsx',
      'index.ts',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  if (result.error) fail(result.error.message);

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid JSON';
    fail(result.stderr || detail);
  }

  if (!report?.summary || !Array.isArray(report.modules)) {
    fail(result.stderr || 'dependency-cruiser returned no module graph');
  }
  return report;
}

const report = loadReport();

function viaNames(violation) {
  return (violation.via ?? []).map((hop) => hop.name);
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((name) => right.includes(name));
}

function isSameViolation(left, right) {
  if (left.rule?.name !== right.rule?.name) return false;
  if (left.type === 'reachability' && right.type === 'reachability') {
    return left.from === right.from && left.to === right.to;
  }
  if (left.cycle && right.cycle) {
    return sameMembers(
      left.cycle.map((hop) => hop.name),
      right.cycle.map((hop) => hop.name),
    );
  }
  if (left.via && right.via) {
    return left.from === right.from && left.to === right.to && sameMembers(viaNames(left), viaNames(right));
  }
  return left.from === right.from && left.to === right.to;
}

function preferShorterVia(violations) {
  const kept = [];
  for (const violation of violations) {
    if (violation.type !== 'reachability') {
      kept.push(violation);
      continue;
    }
    const index = kept.findIndex((item) => isSameViolation(item, violation));
    if (index === -1) kept.push(violation);
    else if ((violation.via?.length ?? 0) < (kept[index].via?.length ?? 0)) kept[index] = violation;
  }
  return kept;
}

function sortKey(violation) {
  return [violation.rule?.name ?? '', violation.from ?? '', violation.to ?? '', violation.type ?? ''].join('\0');
}

function readKnown() {
  if (!fs.existsSync(knownPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(knownPath, 'utf8'));
  if (!Array.isArray(parsed)) fail(`${knownPath} must be a JSON array of violations.`);
  return parsed;
}

function isImporterViolation(violation) {
  return (violation.rule?.name ?? '').startsWith(IMPORTER_PREFIX);
}

function rejectBaselinedImporters(violations) {
  const leaked = violations.filter(isImporterViolation);
  if (leaked.length === 0) return;
  console.error('Importer allowlist violations are exact and must not be baselined:');
  for (const violation of leaked) {
    console.error(`  ${violation.rule?.name}: ${violation.from} → ${violation.to}`);
  }
  process.exit(1);
}

function grandfatheredFrom(violations) {
  return new Set(
    violations
      .filter((violation) => violation.type === 'dependency' && violation.rule?.name === platformRuleName)
      .map((violation) => violation.from),
  );
}

function isTypeOnly(dependencyTypes) {
  return (dependencyTypes ?? []).includes('type-only');
}

function platformReachAllowed(violation, grandfathered) {
  const via = violation.via ?? [];
  const last = via[via.length - 1];
  if (last && isTypeOnly(last.dependencyTypes)) return true;
  const beforePackage = [violation.from, ...via.slice(0, -1).map((hop) => hop.name)];
  return beforePackage.some((name) => adapterRe.test(name) || grandfathered.has(name));
}

function keepCruiserViolation(violation, grandfathered) {
  if (isImporterViolation(violation)) return true;
  if (violation.rule?.name === platformReachableName) {
    return !platformReachAllowed(violation, grandfathered);
  }
  return true;
}

function graphFrom(modules) {
  const graph = new Map();
  for (const module of modules) {
    const edges = [];
    for (const dependency of module.dependencies ?? []) {
      if (dependency.resolved) {
        edges.push({ resolved: dependency.resolved, dependencyTypes: dependency.dependencyTypes ?? [] });
      }
    }
    graph.set(module.source, edges);
  }
  return graph;
}

function byResolved(left, right) {
  return left.resolved.localeCompare(right.resolved);
}

function pushReach(found, ruleName, source, current, next) {
  found.push({
    type: 'reachability',
    from: source,
    to: next.resolved,
    rule: { severity: 'error', name: ruleName },
    via: [...current.path, next].map((edge) => ({
      name: edge.resolved,
      dependencyTypes: edge.dependencyTypes,
    })),
  });
}

function blockedPlatform(edge, seen, grandfathered) {
  return (
    nodeModulesRe.test(edge.resolved) ||
    adapterRe.test(edge.resolved) ||
    grandfathered.has(edge.resolved) ||
    seen.has(edge.resolved)
  );
}

function walk(graph, source, ruleName, decide) {
  const found = [];
  const queue = [{ node: source, path: [] }];
  const seen = new Set([source]);
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of [...(graph.get(current.node) ?? [])].sort(byResolved)) {
      const action = decide(edge, seen);
      if (action === 'hit') pushReach(found, ruleName, source, current, edge);
      if (action === 'follow') {
        seen.add(edge.resolved);
        queue.push({ node: edge.resolved, path: [...current.path, edge] });
      }
    }
  }
  return found;
}

function platformPaths(graph, source, grandfathered) {
  return walk(graph, source, platformReachableName, (edge, seen) => {
    if (platformRe.test(edge.resolved)) return isTypeOnly(edge.dependencyTypes) ? 'skip' : 'hit';
    return blockedPlatform(edge, seen, grandfathered) ? 'skip' : 'follow';
  });
}

function isPlatformUi(source) {
  return platformUiRe.test(source) && !platformUiNotRe.test(source);
}

function walkedViolations(modules, grandfathered) {
  const graph = graphFrom(modules);
  const found = [];
  for (const source of [...graph.keys()].sort()) {
    if (isPlatformUi(source) && !grandfathered.has(source)) {
      found.push(...platformPaths(graph, source, grandfathered));
    }
  }
  return found.filter((violation) => (violation.via ?? []).length > 1);
}

const known = readKnown();
const grandfathered = grandfatheredFrom(update ? report.summary.violations : known);
const cruiserViolations = (report.summary.violations ?? []).filter((violation) =>
  keepCruiserViolation(violation, grandfathered),
);
const walked = walkedViolations(report.modules, grandfathered).filter(
  (violation) => !cruiserViolations.some((existing) => isSameViolation(existing, violation)),
);
const current = preferShorterVia([...cruiserViolations, ...walked]).sort((left, right) =>
  sortKey(left).localeCompare(sortKey(right)),
);

function writeKnown(violations) {
  fs.writeFileSync(knownPath, `${JSON.stringify(violations, null, 2)}\n`);
}

function printRoute(violation) {
  const via = viaNames(violation);
  const route = via.length > 0 ? ` via ${via.join(' → ')}` : '';
  return `${violation.rule?.name}: ${violation.from} → ${violation.to}${route}`;
}

if (update) {
  const importerHits = current.filter(isImporterViolation);
  if (importerHits.length > 0) {
    console.error('Refusing to baseline importer-allowlist violations:');
    for (const violation of importerHits) console.error(`  ${printRoute(violation)}`);
    process.exit(1);
  }
  writeKnown(current);
  console.log(`Wrote ${current.length} dependency violations to ${path.relative(process.cwd(), knownPath)}`);
  process.exit(0);
}

if (shrink) {
  rejectBaselinedImporters(known);
  const kept = known.filter((violation) => current.some((item) => isSameViolation(item, violation)));
  writeKnown(kept);
  console.log(`Dependency baseline shrink: kept ${kept.length}, dropped ${known.length - kept.length} stale`);
  process.exit(0);
}

if (!fs.existsSync(knownPath)) {
  fail(`Missing ${knownPath}. Run pnpm depcruise:baseline and commit the file.`);
}

rejectBaselinedImporters(known);

const fresh = current.filter((violation) => isImporterViolation(violation) || !known.some((item) => isSameViolation(item, violation)));
const stale = known.filter((violation) => !current.some((item) => isSameViolation(item, violation)));

console.log(
  `Dependency baseline: ${known.length} grandfathered, ${current.length} current, ${fresh.length} new, ${stale.length} stale`,
);

if (stale.length > 0) {
  console.log('Stale (fixed, still in the baseline — run pnpm depcruise:tighten to drop them):');
  for (const violation of stale) console.log(`  ${printRoute(violation)}`);
}

if (fresh.length > 0) {
  console.error('New dependency violations:');
  for (const violation of fresh) console.error(`  ${printRoute(violation)}`);
  process.exit(1);
}
