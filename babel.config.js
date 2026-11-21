// NativeWind's preset names this plugin as a string. Babel resolves that
// name from the project root, and Gradle does not set pnpm's NODE_PATH.
require('@babel/plugin-transform-react-jsx');

module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const testing = process.env.NODE_ENV === 'test';
  return {
    presets: [
      ['babel-preset-expo', testing ? {} : { jsxImportSource: 'nativewind' }],
      ...(testing ? [] : ['nativewind/babel']),
    ],
  };
};
