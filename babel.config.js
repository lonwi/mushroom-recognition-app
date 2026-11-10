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
