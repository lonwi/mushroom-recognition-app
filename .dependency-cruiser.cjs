// UI may talk to storage and device I/O only through src/services.
//
// Known violations live in .dependency-cruiser-known-violations.json.
// `pnpm depcruise` ignores those and fails on any new one.
// `pnpm depcruise:tighten` drops entries that no longer occur.
// A full rewrite (needed after rebasing onto the minors PR) is:
//   pnpm depcruise:baseline
// Review that diff before committing it: it accepts current violations.
//
// TODO: when LanguageContext reads language through a service, and when the
// scanner's camera / image-picker access moves behind a service or a dedicated
// view wrapper, run `pnpm depcruise:tighten` so those exceptions disappear.

/** Packages the UI layer is not allowed to import directly. */
const STORAGE_OR_PLATFORM = [
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
        'Screens, components, and contexts must not import AsyncStorage or other storage/platform modules. Call src/services instead (for example storageService, journalPhotos, journalLocation).',
      from: {
        path: '^src/(screens|components|contexts)/',
      },
      to: {
        path: `(?:^|/)node_modules/(?:${STORAGE_OR_PLATFORM})(?:/|$)`,
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown'],
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
