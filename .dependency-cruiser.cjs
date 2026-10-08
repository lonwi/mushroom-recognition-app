// UI may talk to storage and device I/O only through src/services.
//
// `ui-not-to-storage-or-platform` forbids a direct import from App.tsx,
// index.ts, and every module under src/ except src/services. A screen that
// reaches AsyncStorage through src/utils (or data, theme, stories, …) fails
// on that helper's own import.
//
// `ui-not-to-storage-or-platform-reachable` forbids a longer path from the
// UI entry (App.tsx, index.ts, screens, components, contexts, utils) to
// those packages. scripts/depcruise-gate.mjs walks every path (cruiser
// reports only the first) and keeps a path when it enters src/services or
// a direct import that is already listed in the known-violations file.
// A new helper that reaches a package without going through services fails.
//
// Known violations live in .dependency-cruiser-known-violations.json.
// `pnpm depcruise` ignores those and fails on any new one.
// `pnpm depcruise:tighten` drops entries that no longer occur.
// A full rewrite is: pnpm depcruise:baseline
// Review that diff before committing it: it accepts current violations.
//
// TODO: when LanguageContext reads language through a service, when the
// scanner's camera / image-picker access moves behind a service, and when
// JournalScreen.stories stops touching AsyncStorage, run
// `pnpm depcruise:tighten` so those exceptions disappear.

/** Packages the UI layer is not allowed to import, directly or indirectly. */
const PLATFORM_PATH =
  '(?:^|/)node_modules/(?:@react-native-async-storage/async-storage|expo-file-system|expo-location|expo-secure-store|expo-image-manipulator|expo-image-picker|expo-camera|react-native-fast-tflite|react-native-nitro-modules)(?:/|$)';

/** App entry, screens, components, contexts, and utils. */
const UI_REACHABLE_FROM = '^(?:App\\.tsx|index\\.ts|src/(?:screens|components|contexts|utils)/)';

/**
 * Direct imports are forbidden from every cruised file except src/services
 * and third-party packages. scripts/depcruise-gate.mjs reads this pattern
 * and refuses to run if `src/services/` disappears from it.
 */
const NON_SERVICE_PATH_NOT = '(?:^|/)(?:src/services/|node_modules/)';

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
        'App.tsx, index.ts, screens, components, contexts, utils, and any other module outside src/services must not import AsyncStorage or other storage/platform modules. Call src/services instead (for example storageService, journalPhotos, journalLocation).',
      from: {
        pathNot: NON_SERVICE_PATH_NOT,
      },
      to: {
        path: PLATFORM_PATH,
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'ui-not-to-storage-or-platform-reachable',
      severity: 'error',
      comment:
        'App.tsx, index.ts, screens, components, contexts, and utils must not reach AsyncStorage or other storage/platform modules through a helper outside src/services. Paths that only exist because of a direct import already listed in the known-violations file are not reported again.',
      from: {
        path: UI_REACHABLE_FROM,
      },
      to: {
        path: PLATFORM_PATH,
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
