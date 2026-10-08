module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  // Stable path so GitHub Actions can restore the transform cache between runs.
  cacheDirectory: '<rootDir>/.cache/jest',
};
