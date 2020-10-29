module.exports = {
  preset: 'ts-jest',
  bail: false,
  verbose: true,
  testRunner: 'jest-circus/runner',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
<<<<<<< HEAD
  testPathIgnorePatterns: ['**/*.d.ts', '**/__e2e__/', '**/__integration__/'],
=======
  testPathIgnorePatterns: [
    '**/*.d.ts',
    '**/__e2e__/',
    '**/__integration__/'
  ],
>>>>>>> feat(repo-setup): bootstrap dev environment and repo setup
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'core', 'node'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/.(ts|tsx|js|jsx)$', '!src/**/*.test.(ts|tsx|js|jsx)$', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
<<<<<<< HEAD
  projects: ['<rootDir>/packages/appsync-modelgen-plugin'],
=======
  projects: [
    '<rootDir>/packages/appsync-modelgen-plugin'
  ],
>>>>>>> feat(repo-setup): bootstrap dev environment and repo setup
};
