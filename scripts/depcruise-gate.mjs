// dependency-cruiser gate for the UI / services layer.
//
// The direct rule forbids every non-service module from importing storage
// and platform packages. The reachable rule forbids a path from App.tsx,
// index.ts, screens, components, contexts, or utils to those packages.
//
// Cruiser reports a single path per pair, and that path is often the
// legitimate one through src/services. This script walks every path. A path
// is allowed when it enters src/services, or when it enters a module whose
// direct import is already in the known-violations file (LanguageContext,
// the scanner, the journal story). Any other path fails.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const loadConfig = createRequire(import.meta.url);
const cruiseConfig = loadConfig('../.dependency-cruiser.cjs');

const knownPath = path.resolve('.dependency-cruiser-known-violations.json');
const update = process.argv.includes('--update');
const shrink = process.argv.includes('--shrink');
const reachableRule = 'ui-not-to-storage-or-platform-reachable';
const directRule = 'ui-not-to-storage-or-platform';
const directRuleConfig = cruiseConfig.forbidden.find((rule) => rule.name === directRule);
const reachableRuleConfig = cruiseConfig.forbidden.find((rule) => rule.name === reachableRule);

if (!directRuleConfig?.from?.pathNot?.includes('src/services/') || !reachableRuleConfig?.to?.path) {
  console.error('Layer rules in .dependency-cruiser.cjs no longer exclude src/services or name a target.');
  process.exit(1);
}

const platformRe = new RegExp(reachableRuleConfig.to.path);
const uiRe = new RegExp(reachableRuleConfig.from.path);
const serviceRe = /(?:^|\/)src\/services\//;
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
    console.error(result.stderr);
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
  if (left.cycle && right.cycle) {
    const leftNames = left.cycle.map((hop) => hop.name);
    const rightNames = right.cycle.map((hop) => hop.name);
    return sameMembers(leftNames, rightNames);
  }
  if (left.via && right.via) {
    return left.from === right.from && left.to === right.to && sameMembers(viaNames(left), viaNames(right));
  }
  return left.from === right.from && left.to === right.to;
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
      .filter((violation) => violation.type === 'dependency' && violation.rule?.name === directRule)
      .map((violation) => violation.from),
  );
}

function hopsBeforePackage(violation) {
  const via = viaNames(violation);
  const intermediates = via.length > 0 ? via.slice(0, -1) : [];
  return [violation.from, ...intermediates];
}

function allowedReach(violation, grandfathered) {
  if (violation.rule?.name !== reachableRule) return false;
  return hopsBeforePackage(violation).some((name) => serviceRe.test(name) || grandfathered.has(name));
}

function graphFrom(modules) {
  const graph = new Map();
  for (const module of modules) {
    const next = [];
    for (const dependency of module.dependencies ?? []) {
      if (dependency.resolved) next.push(dependency.resolved);
    }
    graph.set(module.source, next);
  }
  return graph;
}

function recordPlatform(found, source, current, next) {
  found.push({
    type: 'reachability',
    from: source,
    to: next,
    rule: { severity: 'error', name: reachableRule },
    via: [...current.path, next].map((name) => ({ name })),
  });
}

function hopStops(next, seen, grandfathered) {
  return nodeModulesRe.test(next) || serviceRe.test(next) || grandfathered.has(next) || seen.has(next);
}

function pathsFrom(graph, source, grandfathered) {
  const found = [];
  const queue = [{ node: source, path: [] }];
  const seen = new Set([source]);
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of [...(graph.get(current.node) ?? [])].sort()) {
      if (platformRe.test(next)) {
        recordPlatform(found, source, current, next);
      } else if (!hopStops(next, seen, grandfathered)) {
        seen.add(next);
        queue.push({ node: next, path: [...current.path, next] });
      }
    }
  }
  return found;
}

function bypasses(modules, grandfathered) {
  const graph = graphFrom(modules);
  const found = [];
  for (const source of [...graph.keys()].sort()) {
    // A grandfathered file's own import is already a direct-rule violation.
    if (uiRe.test(source) && !grandfathered.has(source)) {
      found.push(...pathsFrom(graph, source, grandfathered));
    }
  }
  return found;
}

const known = readKnown();
// On a rewrite, grandfather against the direct imports that exist now.
// On a check, grandfather only against imports already written down, so a
// new direct import is not silently treated as an old leak.
const grandfathered = grandfatheredFrom(update ? report.summary.violations : known);

const cruiserViolations = (report.summary.violations ?? []).filter(
  (violation) => !allowedReach(violation, grandfathered),
);
const walked = bypasses(report.modules, grandfathered).filter(
  (violation) => !cruiserViolations.some((existing) => isSameViolation(existing, violation)),
);
const current = [...cruiserViolations, ...walked].sort((left, right) => sortKey(left).localeCompare(sortKey(right)));

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
  const dropped = known.length - kept.length;
  console.log(`Dependency baseline shrink: kept ${kept.length}, dropped ${dropped} stale`);
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
