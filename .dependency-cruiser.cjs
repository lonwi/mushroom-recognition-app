// Platform packages (AsyncStorage, camera, file system, TFLite, …) may be
// imported only from the adapter files in scripts/adapter-allowlist.cjs.
// Each adapter may be imported only by the modules listed there. That
// importer rule is exact: it is not written to the known-violations file.
//
// There is no transitive "UI reaches an adapter" rule. After PR #16 the
// legitimate chain is LanguageContext → settingsStore → keyValueStore, and
// useLanguage() reaches that chain from almost every screen. A (from, to)
// baseline of that reach would hide a new wrapper that calls
// asyncStorageStore.get/set. The importer allowlist catches the wrapper.
//
// src/stories is outside the platform-import rule on purpose.
// JournalScreen.stories seeds AsyncStorage before the journal screen reads
// it. That fixture is not production UI, so it is excluded with pathNot
// instead of a baseline exception.
//
// keyValueStore is allowlisted at src/services/keyValueStore.ts and at
// src/services/storage/keyValueStore.ts (the path PR #16 adds). The optional
// storage/ segment applies only to that file.
//
// Known direct platform imports live in .dependency-cruiser-known-violations.json.
// `pnpm depcruise` ignores those and fails on any new one, including every
// importer-allowlist hit.
// `pnpm depcruise:tighten` drops entries that no longer occur.
// A full rewrite is: pnpm depcruise:baseline
// Review that diff before committing it: it accepts current violations.
// It must not accept importer-allowlist violations; the gate refuses those.
//
// TODO: when LanguageContext reads language through a service, and when the
// scanner's camera / image-picker access moves behind an adapter, run
// `pnpm depcruise:tighten` so those exceptions disappear.

const { adapters } = require('./scripts/adapter-allowlist.cjs');

const PLATFORM_PACKAGES = [
  '@react-native-async-storage/async-storage',
  'expo-file-system',
  'expo-location',
  'expo-secure-store',
  'expo-image-manipulator',
  'expo-image-picker',
  'expo-camera',
  'react-native-fast-tflite',
  'react-native-nitro-modules',
].join('|');

const PLATFORM_PATH = `(?:^|/)node_modules/(?:${PLATFORM_PACKAGES})(?:/|$)`;

/**
 * Adapters may import platform packages. Stories are excluded (see file header).
 * Everyone else, including other files in src/services, may not.
 */
const PLATFORM_FROM_PATH_NOT = `(?:^|/)node_modules/|^src/stories/|(?:${adapters.map((adapter) => adapter.to).join('|')})`;

/** Production UI. Used only for the platform reachability walk in the gate. */
const UI_FROM = '^(?:App\\.tsx|index\\.ts|src/(?:screens|components|contexts|utils|stories)/)';

const VALUE_DEPENDENCY_TYPES = ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown'];

function importerRule(adapter) {
  return {
    name: `adapter-importer-${adapter.name}`,
    severity: 'error',
    comment: `Only the modules listed for ${adapter.name} in scripts/adapter-allowlist.cjs may import it. Not baselined: a new wrapper must fail immediately.`,
    from: {
      pathNot: adapter.importers,
    },
    to: {
      path: adapter.to,
    },
  };
}

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular imports make the offline bundle order fragile. Break the cycle, usually by moving a shared type to src/types or inverting the dependency.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'ui-not-to-storage-or-platform',
      severity: 'error',
      comment:
        'Only the adapter allowlist in this file may import AsyncStorage or other storage/platform packages. Do not re-export the package. import type is allowed.',
      from: {
        pathNot: PLATFORM_FROM_PATH_NOT,
      },
      to: {
        path: PLATFORM_PATH,
        dependencyTypes: VALUE_DEPENDENCY_TYPES,
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'ui-not-to-storage-or-platform-reachable',
      severity: 'error',
      comment:
        'UI must not reach a storage/platform package through a module that is not an adapter. scripts/depcruise-gate.mjs allows a path that enters an adapter or a direct import already listed in the known-violations file.',
      from: {
        path: UI_FROM,
        pathNot: '^src/stories/',
      },
      to: {
        path: PLATFORM_PATH,
        reachable: true,
      },
    },
    ...adapters.map(importerRule),
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: ['(^|/)__tests__/', '\\.(test|spec)\\.(ts|tsx|js|jsx)$', '(^|/)e2e/', 'storybook-static'],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    // Keep pnpm's node_modules/<pkg> path. Following the symlink embeds the
    // .pnpm/<pkg>@version hash in the baseline, which changes on every bump.
    preserveSymlinks: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'react-native', 'browser', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    },
    skipAnalysisNotInRules: true,
  },
};
