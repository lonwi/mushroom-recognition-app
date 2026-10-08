// Quality gate for new code. Existing violations are recorded in
// eslint-suppressions.json (ESLint bulk suppressions). `pnpm lint` passes while
// the count of errors for a file+rule stays at or below that record, and fails
// when new errors appear. Suppressions are not pruned automatically, so a
// parallel cleanup can land without turning CI red.
//
// Tighten later:
//   pnpm lint:prune
// which drops suppressions that no longer match any error. Re-record the
// current tree (for example after rebasing onto the minors PR) with:
//   pnpm lint:baseline
// Review that diff: it accepts whatever the tree currently violates.
//
// TODO: lower `max-lines` (400), `complexity` (15) and
// `sonarjs/cognitive-complexity` (15) once the grandfathered files are split.
// TODO: turn on typescript-eslint type-checked configs and the React Compiler
// rules from eslint-plugin-react-hooks (`recommended`) after the backlog is gone.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactNative from 'eslint-plugin-react-native';
import sonarjs from 'eslint-plugin-sonarjs';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const platformPackageSource =
  '^(@react-native-async-storage\\/async-storage|expo-file-system|expo-location|expo-secure-store|expo-image-manipulator|expo-image-picker|expo-camera|react-native-fast-tflite|react-native-nitro-modules)(\\/|$)';
const platformReexportMessage =
  'Do not re-export a storage or platform package from src/services. Keep the import inside an adapter and export a narrowed API.';

function banPlatformReexport(nodeType) {
  return {
    selector: `${nodeType}[source.value=/${platformPackageSource}/]`,
    message: platformReexportMessage,
  };
}

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'storybook-static/**',
      'dist/**',
      'coverage/**',
      '.expo/**',
      '.cache/**',
      'training/**',
      'android/**',
      'ios/**',
      'test-results/**',
      'playwright-report/**',
      'report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      'react-native': reactNative,
      sonarjs,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        __DEV__: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Already in typescript-eslint recommended; kept explicit so the gate
      // stays obvious if that preset changes.
      '@typescript-eslint/no-explicit-any': 'error',
      // New and edited files. Files already over this cap have a grandfathered
      // ceiling below, with a little room so a nearby refactor can add a few
      // lines. `max-lines` is one finding per file, so a suppression count
      // cannot stop an already-long file from growing.
      // TODO: lower the default toward 400 and the per-file caps toward the
      // lengths measured in this file, once the storage/token refactor has landed.
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 15],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/cognitive-complexity': ['error', 15],
      'react-native/no-color-literals': 'error',
      'react-native/no-inline-styles': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['**/*.{js,cjs}', 'jest.setup.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      'e2e/**/*.{js,jsx,ts,tsx}',
      'jest.setup.js',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    // Catalogs and specs are allowed to be long. The cap still applies to
    // screens, components, services, contexts, and the app shell.
    files: [
      'src/data/**/*.{js,ts,tsx}',
      'src/i18n/**/*.{js,ts,tsx}',
      'src/__tests__/**/*.{js,jsx,ts,tsx}',
      'e2e/**/*.{js,jsx,ts,tsx}',
      '**/*.d.ts',
    ],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // Adapters may call platform packages. They must not re-export them, or a
    // screen can `export { default } from '@react-native-async-storage/async-storage'`
    // and skip the journal repository. keyValueStore.ts (PR #16) is the raw
    // AsyncStorage adapter and is covered by the same pattern.
    files: ['src/services/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banPlatformReexport('ExportAllDeclaration'),
        banPlatformReexport('ExportNamedDeclaration'),
      ],
    },
  },
  {
    // TODO: lower each cap toward 500 (the default above) as these files are split.
    // Counts skip blank lines and comments. The extra lines above today's
    // count are slack for the in-flight refactor.
    files: ['src/services/storageService.ts'],
    rules: { 'max-lines': ['error', { max: 460, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['src/screens/ScannerScreen.tsx'],
    rules: { 'max-lines': ['error', { max: 560, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['src/screens/JournalScreen.tsx'],
    rules: { 'max-lines': ['error', { max: 640, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['src/screens/SpeciesDetailScreen.tsx'],
    rules: { 'max-lines': ['error', { max: 720, skipBlankLines: true, skipComments: true }] },
  },
);
