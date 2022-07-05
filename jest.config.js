const pack = require('./package');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  clearMocks: true,
  coverageDirectory: '<rootDir>/coverage/',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/*.mock.ts', '!**/node_modules/**', '!**/build/**'],
  coverageReporters: ['json-summary', 'lcov', 'text', 'text-summary'],
  collectCoverage: true,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: `./reports/${pack.name}`,
        outputName: 'junit.xml',
      },
    ],
  ],
  displayName: pack.name,
};
