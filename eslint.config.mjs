import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const androidOrIosOnlyImports = [
  'PermissionsAndroid',
  'ToastAndroid',
  'DrawerLayoutAndroid',
  'ProgressBarAndroid',
  'DatePickerAndroid',
  'TimePickerAndroid',
  'BackHandler',
  'ActionSheetIOS',
  'PushNotificationIOS',
  'DynamicColorIOS',
];

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'ml/**',
      '.agents/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'schemas/**',
      '.expo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.jest },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: androidOrIosOnlyImports,
              message:
                'API tylko dla Androida albo tylko dla iOS są zakazane. Użyj modułu Expo. Sprawdzenie Platform.OS należy do src/infra/platform (D-02, Q13).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infra/platform/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Platform'][property.name='OS']",
          message: 'Platform.OS jest dozwolone tylko w src/infra/platform (D-02, Q13).',
        },
        {
          selector: "CallExpression[callee.object.name='Platform'][callee.property.name='select']",
          message: 'Platform.select jest dozwolone tylko w src/infra/platform (D-02, Q13).',
        },
      ],
    },
  },
  {
    files: ['src/core/i18n/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Intl',
          message: 'Reguły liczby mnogiej CLDR są liczone bez Intl (D-05).',
        },
      ],
    },
  },
);
