module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  // The first render on a GitHub-hosted runner can pass Jest's 5s default.
  testTimeout: 15000,
};
