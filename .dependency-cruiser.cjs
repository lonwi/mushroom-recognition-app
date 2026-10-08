// Platform packages (AsyncStorage, camera, file system, TFLite, …) may be
// imported only from the adapter allowlist below. UI may not import those
// adapter files, directly or through another module. A service that
// re-exports a platform package is also rejected by ESLint
// (`no-restricted-syntax` on src/services).
//
// src/stories is outside the platform-import rule on purpose.
// JournalScreen.stories seeds AsyncStorage before the journal screen reads
// it. That fixture is not production UI, so it is excluded with pathNot
// instead of a baseline exception.
//
// src/services/keyValueStore.ts is on the allowlist before the file exists.
// PR #16 adds it as the raw AsyncStorage adapter (get/set/remove/getAllKeys).
// Screens must keep using the journal repository, not that adapter.
//
// Known violations live in .dependency-cruiser-known-violations.json.
// `pnpm depcruise` ignores those and fails on any new one.
// `pnpm depcruise:tighten` drops entries that no longer occur.
// A full rewrite is: pnpm depcruise:baseline
// Review that diff before committing it: it accepts current violations.
//
// TODO: when LanguageContext reads language through a service, and when the
// scanner's camera / image-picker access moves behind an adapter, run
// `pnpm depcruise:tighten` so those exceptions disappear.

/** Closed list. Adding a file here is a deliberate review, not a drive-by import. */
const ADAPTERS = [
  'attributionPackage',
  'journalLocation',
  'journalPhotos',
  'keyValueStore',
  'photoPixels',
  'storageService',
  'tfliteRuntime',
].join('|');

const ADAPTER_PATH = `^src/services/(?:${ADAPTERS})\\.ts$`;

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
const PLATFORM_FROM_PATH_NOT = `(?:^|/)node_modules/|^src/stories/|${ADAPTER_PATH}`;

/** Production UI plus Storybook stories. These must not import adapter files. */
const UI_FROM = '^(?:App\\.tsx|index\\.ts|src/(?:screens|components|contexts|utils|stories)/)';

const VALUE_DEPENDENCY_TYPES = ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown'];

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
        'UI must not reach a storage/platform package through a module that is not an adapter. scripts/depcruise-gate.mjs allows a path that enters the adapter allowlist or a direct import already listed in the known-violations file.',
      from: {
        path: UI_FROM,
        pathNot: '^src/stories/',
      },
      to: {
        path: PLATFORM_PATH,
        reachable: true,
      },
    },
    {
      name: 'ui-not-to-platform-adapter',
      severity: 'error',
      comment:
        'App.tsx, index.ts, screens, components, contexts, utils, and stories must not import adapter files (including keyValueStore.ts). Call the journal repository or another service that does not expose the raw store.',
      from: {
        path: UI_FROM,
      },
      to: {
        path: ADAPTER_PATH,
      },
    },
    {
      name: 'ui-not-to-platform-adapter-reachable',
      severity: 'error',
      comment:
        'The same UI must not reach an adapter through a helper. scripts/depcruise-gate.mjs checks every path, not only the first one dependency-cruiser reports.',
      from: {
        path: UI_FROM,
      },
      to: {
        path: ADAPTER_PATH,
        reachable: true,
      },
    },
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
