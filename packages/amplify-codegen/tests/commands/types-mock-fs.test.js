const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');

const generateTypes = require('../../src/commands/types');
const generateStatements = require('../../src/commands/statements');
const constants = require('../../src/constants');
const { getAppSyncAPIDetails, readSchemaFromFile, getFrontEndHandler } = require('../../src/utils');
const { loadConfig } = require('../../src/codegen-config');
const { setupMocks } = require('./mock-fs-setup');

jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  getAppSyncAPIDetails: jest.fn(),
  ensureIntrospectionSchema: jest.fn(),
  getFrontEndHandler: jest.fn(),
}));
jest.mock('../../src/codegen-config');
jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn(),
    succeed: jest.fn(),
    stop: jest.fn(),
    fail: jest.fn(),
  })),
);
const MOCK_PROJECT_ROOT = '.';
const MOCK_API_ID = 'MOCK_API_ID';
const MOCK_APIS = [
  {
    id: MOCK_API_ID,
  },
];
const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
  },
  amplify: {
    getProjectMeta: jest.fn(() => ({ api: { id: MOCK_API_ID } })),
    getEnvInfo: jest.fn(),
    getResourceStatus: jest.fn(),
    executeProviderUtils: jest.fn(),
    pathManager: {
      getBackendDirPath: jest.fn(),
    },
    getProjectConfig: jest.fn(),
  },
};

const testCases = [
  {
    frontend: 'javascript',
    target: 'typescript',
    expectedGeneratedFileName: 'src/API.ts',
  },
  {
    frontend: 'javascript',
    target: 'flow',
    expectedGeneratedFileName: 'src/API.js',
  },
  {
    frontend: 'javascript',
    target: 'angular',
    expectedGeneratedFileName: 'src/app/API.service.ts',
  },
  {
    frontend: 'swift',
    target: 'swift',
    expectedGeneratedFileName: 'API.swift',
  },
];

describe('command - types (mock fs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
    getAppSyncAPIDetails.mockReturnValue(MOCK_APIS);
  });

  afterEach(mockFs.restore);

  testCases.forEach(({ frontend, target, expectedGeneratedFileName }) => {
    it(`should generate types for ${frontend} - ${target}`, async () => {
      const { generatedFileName } = setupMocks(mockFs, loadConfig, MOCK_API_ID, frontend, target);

      await generateStatements(MOCK_CONTEXT, false);
      await generateTypes(MOCK_CONTEXT, false);
      expect(fs.existsSync(generatedFileName)).toBeTruthy();
      expect(generatedFileName).toEqual(expectedGeneratedFileName);
    });
  });

  it('should not generate types when target is javascript', async () => {
    const generatedFileName = setupMocks(mockFs, loadConfig, MOCK_API_ID, 'javascript', 'javascript');

    await generateStatements(MOCK_CONTEXT, false);
    await generateTypes(MOCK_CONTEXT, false);
    expect(fs.readdirSync('./src')).toEqual(['graphql']);
  });

  it('should not generate types when frontend is android', async () => {
    const generatedFileName = setupMocks(mockFs, loadConfig, MOCK_API_ID, 'android', '');

    await generateStatements(MOCK_CONTEXT, false);
    await generateTypes(MOCK_CONTEXT, false);
    expect(fs.existsSync(generatedFileName)).toBeFalsy();
  });
});
