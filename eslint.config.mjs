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

const platformPackagePattern =
  /^(?:@react-native-async-storage\/async-storage|expo-file-system|expo-location|expo-secure-store|expo-image-manipulator|expo-image-picker|expo-camera|react-native-fast-tflite|react-native-nitro-modules)(?:\/|$)/;

const UNWRAP_EXPRESSION = new Set([
  'TSAsExpression',
  'TSTypeAssertion',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'ChainExpression',
  'ParenthesizedExpression',
]);

function unwrapExpression(node) {
  let current = node;
  while (current && UNWRAP_EXPRESSION.has(current.type)) current = current.expression;
  return current;
}

function isPlatformRequire(node) {
  if (node?.type !== 'CallExpression' || node.callee?.type !== 'Identifier' || node.callee.name !== 'require') {
    return false;
  }
  const arg = node.arguments[0];
  return Boolean(arg && arg.type === 'Literal' && typeof arg.value === 'string' && platformPackagePattern.test(arg.value));
}

function isPlatformValue(node, tainted) {
  const current = unwrapExpression(node);
  if (!current) return false;
  if (current.type === 'Identifier') return tainted.has(current.name);
  if (current.type === 'MemberExpression') return isPlatformValue(current.object, tainted);
  return isPlatformRequire(current);
}

function collectPlatformImports(node, tainted) {
  if (node.importKind === 'type') return;
  if (typeof node.source?.value !== 'string' || !platformPackagePattern.test(node.source.value)) return;
  for (const specifier of node.specifiers) {
    if (specifier.importKind === 'type') continue;
    tainted.add(specifier.local.name);
  }
}

function taintAlias(node, tainted) {
  const init = unwrapExpression(node.init);
  if (node.id.type === 'Identifier' && init?.type === 'Identifier' && tainted.has(init.name)) {
    tainted.add(node.id.name);
  }
}

function isImportBinding(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (
    parent.type === 'ImportDefaultSpecifier' ||
    parent.type === 'ImportSpecifier' ||
    parent.type === 'ImportNamespaceSpecifier'
  ) {
    return parent.local === node;
  }
  return false;
}

function isTypePosition(node) {
  const parent = node.parent;
  if (!parent) return false;
  return (
    parent.type === 'TSTypeQuery' ||
    parent.type === 'TSTypeReference' ||
    parent.type === 'TSQualifiedName' ||
    parent.type === 'TSImportType'
  );
}

function isNonComputedProperty(node) {
  const parent = node.parent;
  return parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
}

function platformRooted(node, tainted) {
  const current = unwrapExpression(node);
  if (!current || current.type === 'CallExpression') return false;
  if (current.type === 'Identifier') return tainted.has(current.name);
  if (current.type === 'MemberExpression') return platformRooted(current.object, tainted);
  if (current.type === 'ChainExpression') return platformRooted(current.expression, tainted);
  return false;
}

const DECLARED_ID = new Set(['VariableDeclarator', 'FunctionDeclaration', 'ClassDeclaration']);
const PATTERN_PARENT = new Set(['ObjectPattern', 'ArrayPattern']);

function isPatternBinding(parent, node) {
  return parent.type === 'Property' && parent.value === node && PATTERN_PARENT.has(parent.parent?.type);
}

function isDeclaredName(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (DECLARED_ID.has(parent.type) && parent.id === node) return true;
  if (parent.type === 'RestElement' && parent.argument === node) return true;
  if (parent.type === 'AssignmentPattern' && parent.left === node) return true;
  if (parent.type === 'ArrowFunctionExpression' && parent.params.includes(node)) return true;
  return isPatternBinding(parent, node);
}

function reportBarePlatformUse(node, tainted, context) {
  if (node.type !== 'Identifier' || !tainted.has(node.name)) return;
  if (isImportBinding(node) || isTypePosition(node) || isNonComputedProperty(node) || isDeclaredName(node)) return;
  const parent = node.parent;
  if (parent?.type === 'MemberExpression' && parent.object === node) return;
  if (parent?.type === 'ChainExpression') return;
  context.report({ node, messageId: 'reexport' });
}

function reportReturnedPlatform(node, tainted, context) {
  const value = node.type === 'ReturnStatement' ? node.argument : node.body;
  if (!value || value.type === 'BlockStatement' || value.type === 'CallExpression') return;
  if (platformRooted(value, tainted)) context.report({ node: value, messageId: 'reexport' });
}

function reportDestructure(node, tainted, context) {
  if (node.id.type !== 'ObjectPattern' && node.id.type !== 'ArrayPattern') return;
  if (platformRooted(node.init, tainted)) context.report({ node, messageId: 'reexport' });
}

function reportObjectAssign(node, tainted, context) {
  const callee = unwrapExpression(node.callee);
  if (callee?.type !== 'MemberExpression' || callee.computed) return;
  if (callee.object?.type !== 'Identifier' || callee.object.name !== 'Object') return;
  if (callee.property?.type !== 'Identifier' || callee.property.name !== 'assign') return;
  for (const argument of node.arguments) {
    if (platformRooted(argument, tainted)) context.report({ node: argument, messageId: 'reexport' });
  }
}

function reportSpread(node, tainted, context) {
  if (platformRooted(node.argument, tainted)) context.report({ node, messageId: 'reexport' });
}

function reportNamedExport(node, tainted, context) {
  if (node.exportKind === 'type') return;
  if (typeof node.source?.value === 'string' && platformPackagePattern.test(node.source.value)) {
    context.report({ node, messageId: 'reexport' });
    return;
  }
  if (node.declaration?.type === 'VariableDeclaration') {
    for (const declarator of node.declaration.declarations) {
      if (isPlatformValue(declarator.init, tainted)) context.report({ node: declarator, messageId: 'reexport' });
    }
  }
  for (const specifier of node.specifiers) {
    if (specifier.exportKind === 'type') continue;
    if (tainted.has(specifier.local.name)) context.report({ node: specifier, messageId: 'reexport' });
  }
}

function reportDefaultExport(node, tainted, context) {
  if (isPlatformValue(node.declaration, tainted)) context.report({ node, messageId: 'reexport' });
}

function reportExportAll(node, context) {
  if (typeof node.source?.value === 'string' && platformPackagePattern.test(node.source.value)) {
    context.report({ node, messageId: 'reexport' });
  }
}

const noPlatformReexport = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      reexport:
        'Use a platform import only as X.method(...) inside an adapter. Do not return it, destructure it, copy it with Object.assign, or re-export it.',
    },
  },
  create(context) {
    const tainted = new Set();
    return {
      ImportDeclaration(node) {
        collectPlatformImports(node, tainted);
      },
      Identifier(node) {
        reportBarePlatformUse(node, tainted, context);
      },
      VariableDeclarator(node) {
        taintAlias(node, tainted);
        reportDestructure(node, tainted, context);
      },
      ArrowFunctionExpression(node) {
        reportReturnedPlatform(node, tainted, context);
      },
      ReturnStatement(node) {
        reportReturnedPlatform(node, tainted, context);
      },
      CallExpression(node) {
        reportObjectAssign(node, tainted, context);
      },
      SpreadElement(node) {
        reportSpread(node, tainted, context);
      },
      ExportNamedDeclaration(node) {
        reportNamedExport(node, tainted, context);
      },
      ExportDefaultDeclaration(node) {
        reportDefaultExport(node, tainted, context);
      },
      ExportAllDeclaration(node) {
        reportExportAll(node, context);
      },
    };
  },
};

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
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
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
    rules: {
      'sonarjs/no-duplicate-string': 'off',
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
    // Adapters may call platform packages as X.method(...). They must not
    // return the binding (`() => AsyncStorage`), destructure it, copy it with
    // Object.assign, or re-export it (`export const`, `export default`,
    // `export { X }`, `export { default } from`, `export * from`).
    // `import type` stays allowed. A narrowed wrapper
    // (`getItem: (key) => AsyncStorage.getItem(key)`) stays allowed.
    files: ['src/services/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      grzybobranie: {
        rules: {
          'no-platform-reexport': noPlatformReexport,
        },
      },
    },
    rules: {
      'grzybobranie/no-platform-reexport': 'error',
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
  {
    // Metro bundles offline images from a string literal require(). This file
    // is the gallery manifest, so the import rule stays off without a new
    // suppression entry.
    files: ['src/data/speciesGallery.ts', 'src/data/sulphurHoneyComparison.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
