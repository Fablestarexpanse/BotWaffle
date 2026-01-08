module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests
  rootDir: process.cwd(),
  
  // Test match patterns
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Exclude old workflow tests that use process.exit
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/create_bot_workflow.test.js'
  ],
  
  // Module paths
  modulePaths: ['<rootDir>/src'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/ui/**', // Exclude UI components (test separately with E2E)
    '!src/tools/**', // Exclude PromptWaffle (has own tests)
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds (disabled for initial setup, will enable after more tests)
  // coverageThreshold: {
  //   global: {
  //     branches: 30,
  //     functions: 30,
  //     lines: 30,
  //     statements: 30
  //   }
  // },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module name mapping for Electron mocking
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/mocks/electron.js'
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};
