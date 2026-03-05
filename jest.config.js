module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!__tests__/**',
    '!__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  moduleNameMapper: {
    '^electron$': '<rootDir>/__mocks__/electron.js'
  },
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  verbose: true
};
