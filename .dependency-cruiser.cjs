/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-not-to-ui-app-infra-screens',
      severity: 'error',
      comment: 'Domena nie zna UI, tras ani adapterów.',
      from: { path: '^src/core' },
      to: { path: '^src/(ui|app|infra|screens)' },
    },
    {
      name: 'core-not-to-react-native-or-expo',
      severity: 'error',
      comment: 'Domena zostaje czystym TypeScriptem.',
      from: { path: '^src/core' },
      to: { path: '^(react-native|expo|expo-|@expo/)' },
    },
    {
      name: 'ui-not-to-app-infra-screens',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/(app|infra|screens)' },
    },
    {
      name: 'infra-not-to-app-screens-ui',
      severity: 'error',
      from: { path: '^src/infra' },
      to: { path: '^src/(app|screens|ui)' },
    },
    {
      name: 'screens-not-to-app',
      severity: 'error',
      from: { path: '^src/screens' },
      to: { path: '^src/app' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
