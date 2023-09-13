const fs = require('fs');
const mockFs = require('mock-fs');

const generateStatements = require('../../src/commands/statements');
const { getAppSyncAPIDetails, readSchemaFromFile, getFrontEndHandler } = require('../../src/utils');
const { loadConfig } = require('../../src/codegen-config');
const schema = require('./blog-introspection-schema.json');
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
    target: 'javascript',
    expectedDocs: ['mutations.js', 'queries.js', 'subscriptions.js'],
  },
  {
    frontend: 'javascript',
    target: 'typescript',
    expectedDocs: ['mutations.ts', 'queries.ts', 'subscriptions.ts'],
  },
  {
    frontend: 'javascript',
    target: 'flow',
    expectedDocs: ['mutations.js', 'queries.js', 'subscriptions.js'],
  },
  {
    frontend: 'android',
    target: 'android',
    expectedDocs: ['mutations.graphql', 'queries.graphql', 'subscriptions.graphql'],
  },
  {
    frontend: 'swift',
    target: 'swift',
    expectedDocs: ['mutations.graphql', 'queries.graphql', 'subscriptions.graphql'],
  },
];

describe('command - types (mock fs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
    getAppSyncAPIDetails.mockReturnValue(MOCK_APIS);
  });

  afterEach(mockFs.restore);

  testCases.forEach(({ frontend, target, expectedDocs }) => {
    it(`should generate statements for ${frontend} - ${target}`, async () => {
      MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({ frontend });
      getFrontEndHandler.mockReturnValueOnce(frontend);
      const { docsFilePath } = setupMocks(mockFs, loadConfig, MOCK_API_ID, frontend, target);

      await generateStatements(MOCK_CONTEXT, false);
      expect(fs.readdirSync(docsFilePath)).toEqual(expectedDocs);
    });
  });
});
