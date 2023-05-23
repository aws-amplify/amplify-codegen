const path = require('path');
const fs = require('fs-extra');

const { loadConfig } = require('../../src/codegen-config');
const generateStatements = require('../../src/commands/statements');
const constants = require('../../src/constants');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails, readSchemaFromFile } = require('../../src/utils');

const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
  },
  amplify: {
    getEnvInfo: jest.fn(),
    getProjectMeta: jest.fn(),
  },
};

jest.mock('../../src/codegen-config');
jest.mock('../../src/utils');
jest.mock('fs-extra');

const MOCK_INCLUDE_PATH = 'MOCK_INCLUDE';
const MOCK_STATEMENTS_PATH = 'MOCK_STATEMENTS_PATH';
const MOCK_SCHEMA = `
type Query {
  hello: String!
}

schema {
  query: Query
}
`;
const MOCK_TARGET_LANGUAGE = 'javascript';
const MOCK_GENERATED_FILE_NAME = 'API.TS';
const MOCK_API_ID = 'MOCK_API_ID';
const MOCK_REGION = 'MOCK_AWS_REGION';
const MOCK_PROJECT_ROOT = 'MOCK_PROJECT_ROOT';

const MOCK_APIS = [
  {
    id: MOCK_API_ID,
  },
];
const MOCK_PROJECT = {
  includes: [MOCK_INCLUDE_PATH],
  schema: MOCK_SCHEMA,
  amplifyExtension: {
    generatedFileName: MOCK_GENERATED_FILE_NAME,
    codeGenTarget: MOCK_TARGET_LANGUAGE,
    graphQLApiId: MOCK_API_ID,
    docsFilePath: MOCK_STATEMENTS_PATH,
    region: MOCK_REGION,
  },
};

getFrontEndHandler.mockReturnValue('javascript');

describe('command - statements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    getFrontEndHandler.mockReturnValue('javascript');
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([MOCK_PROJECT]),
    });
    MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
    getAppSyncAPIDetails.mockReturnValue(MOCK_APIS);
    readSchemaFromFile.mockReturnValue(MOCK_SCHEMA);
  });

  it('should generate statements', async () => {
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(getFrontEndHandler).toHaveBeenCalledWith(MOCK_CONTEXT);
    expect(loadConfig).toHaveBeenCalledWith(MOCK_CONTEXT, false);
  });

  it('should generate graphql statements for non JS projects', async () => {
    getFrontEndHandler.mockReturnValue('ios');
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([
        { ...MOCK_PROJECT, ...{ amplifyExtension: { codeGenTarget: 'javascript' }} }
      ]),
    });
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(getFrontEndHandler).toHaveBeenCalledWith(MOCK_CONTEXT);
    expect(loadConfig).toHaveBeenCalledWith(MOCK_CONTEXT, false);
  });

  it('should download the schema if forceDownload flag is passed', async () => {
    const forceDownload = true;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(ensureIntrospectionSchema).toHaveBeenCalledWith(
      MOCK_CONTEXT,
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      MOCK_APIS[0],
      MOCK_REGION,
      forceDownload,
    );
  });

  it('should download the schema if the schema file is missing', async () => {
    fs.existsSync.mockReturnValue(false);
    const forceDownload = false;
    await generateStatements(MOCK_CONTEXT, forceDownload);
    expect(ensureIntrospectionSchema).toHaveBeenCalledWith(
      MOCK_CONTEXT,
      path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
      MOCK_APIS[0],
      MOCK_REGION,
      forceDownload,
    );
  });

  it('should show a warning if there are no projects configured', async () => {
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([]),
    });
    await generateStatements(MOCK_CONTEXT, false);
    expect(MOCK_CONTEXT.print.info).toHaveBeenCalledWith(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
  });
});
