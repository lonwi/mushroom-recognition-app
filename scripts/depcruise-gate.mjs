// Adapter allowlist gate.
//
// Only the files named in .dependency-cruiser.cjs may import storage and
// platform packages. UI (App.tsx, index.ts, screens, components, contexts,
// utils, stories) may not import those adapter files, directly or through
// another module. A path that reaches a platform package is allowed only
// when it enters an adapter or a direct import already in the baseline
// (LanguageContext, the scanner). import type does not count.
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
const adapterRuleName = 'ui-not-to-platform-adapter';
const adapterReachableName = 'ui-not-to-platform-adapter-reachable';

function ruleByName(name) {
  return cruiseConfig.forbidden.find((rule) => rule.name === name);
}

const platformRule = ruleByName(platformRuleName);
const platformReachable = ruleByName(platformReachableName);
const adapterRule = ruleByName(adapterRuleName);
const adapterReachable = ruleByName(adapterReachableName);

if (
  !platformRule?.from?.pathNot?.includes('src/stories/') ||
  !platformRule.from.pathNot.includes('keyValueStore') ||
  !adapterRule?.to?.path?.includes('keyValueStore') ||
  !platformReachable?.to?.path ||
  !adapterReachable?.from?.path
) {
  console.error('Layer rules in .dependency-cruiser.cjs no longer exclude stories or name the adapter allowlist.');
  process.exit(1);
}

const platformRe = new RegExp(platformReachable.to.path);
const adapterRe = new RegExp(adapterRule.to.path);
const platformUiRe = new RegExp(platformReachable.from.path);
const platformUiNotRe = new RegExp(platformReachable.from.pathNot);
const adapterUiRe = new RegExp(adapterReachable.from.path);
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

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid JSON';
    console.error(result.stderr || detail);
    process.exit(1);
  }

  if (!report?.summary || !Array.isArray(report.modules)) {
    console.error(result.stderr || 'dependency-cruiser returned no module graph');
    process.exit(result.status || 1);
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
    // One forbidden target per UI file. A second route to that same file
    // is the same leak; only a new target (or a new UI file) fails.
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
  if (!Array.isArray(parsed)) {
    console.error(`${knownPath} must be a JSON array of violations.`);
    process.exit(1);
  }
  return parsed;
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
  if (violation.rule?.name === platformReachableName) {
    return !platformReachAllowed(violation, grandfathered);
  }
  if (violation.rule?.name === adapterReachableName && (violation.via ?? []).length <= 1) {
    return false;
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

function adapterPaths(graph, source) {
  return walk(graph, source, adapterReachableName, (edge, seen) => {
    if (adapterRe.test(edge.resolved)) return 'hit';
    if (nodeModulesRe.test(edge.resolved) || seen.has(edge.resolved)) return 'skip';
    return 'follow';
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
    if (adapterUiRe.test(source)) found.push(...adapterPaths(graph, source));
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

if (update) {
  writeKnown(current);
  console.log(`Wrote ${current.length} dependency violations to ${path.relative(process.cwd(), knownPath)}`);
  process.exit(0);
}

if (shrink) {
  const kept = known.filter((violation) => current.some((item) => isSameViolation(item, violation)));
  writeKnown(kept);
  console.log(`Dependency baseline shrink: kept ${kept.length}, dropped ${known.length - kept.length} stale`);
  process.exit(0);
}

if (!fs.existsSync(knownPath)) {
  console.error(`Missing ${knownPath}. Run pnpm depcruise:baseline and commit the file.`);
  process.exit(1);
}

const fresh = current.filter((violation) => !known.some((item) => isSameViolation(item, violation)));
const stale = known.filter((violation) => !current.some((item) => isSameViolation(item, violation)));

console.log(
  `Dependency baseline: ${known.length} grandfathered, ${current.length} current, ${fresh.length} new, ${stale.length} stale`,
);

if (stale.length > 0) {
  console.log('Stale (fixed, still in the baseline — run pnpm depcruise:tighten to drop them):');
  for (const violation of stale) {
    console.log(`  ${violation.rule?.name}: ${violation.from} → ${violation.to}`);
  }
}

if (fresh.length > 0) {
  console.error('New dependency violations:');
  for (const violation of fresh) {
    const via = viaNames(violation);
    const route = via.length > 0 ? ` via ${via.join(' → ')}` : '';
    console.error(`  ${violation.rule?.name}: ${violation.from} → ${violation.to}${route}`);
  }
  process.exit(1);
}
