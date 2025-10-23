/**
 * Jest configuration for Selenium Real E2E tests
 */

module.exports = {
  displayName: 'selenium-real-e2e',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/selenium/tests/**/*.test.ts'],
  globalSetup: '<rootDir>/tests/selenium/global-setup-real.ts',
  globalTeardown: '<rootDir>/tests/selenium/global-teardown-real.ts',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'es2022',
          module: 'es2022',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 120000, // 2 minutes per test
  verbose: true,
  bail: false, // Continue running tests even if one fails
  maxWorkers: 1, // Run tests sequentially (real YouTube can be unpredictable)
  forceExit: true, // Force Jest to exit after tests complete (needed for Selenium cleanup)
};
