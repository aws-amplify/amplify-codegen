module.exports = {
  preset: 'ts-jest',
  bail: false,
  verbose: true,
  testRunner: 'jest-circus/runner',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '**/*.d.ts',
    '**/__e2e__/',
    '**/__integration__/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'core', 'node'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/.(ts|tsx|js|jsx)$', '!src/**/*.test.(ts|tsx|js|jsx)$', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  projects: [
    '<rootDir>/packages/appsync-modelgen-plugin'
  ],
};
