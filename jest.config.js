const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '\\.tflite$': '<rootDir>/src/__tests__/mocks/tfliteModule.js',
  },
  // Stable path so GitHub Actions can restore the transform cache between runs.
  cacheDirectory: '<rootDir>/.cache/jest',
};
