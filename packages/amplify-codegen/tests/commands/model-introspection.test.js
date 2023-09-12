const { generateModelIntrospection, getModelIntrospection } = require('../../src/commands/model-intropection');
const graphqlGenerator = require('@aws-amplify/graphql-generator');
const mockFs = require('mock-fs');
const path = require('path');
const fs = require('fs');

jest.mock('@aws-amplify/graphql-generator', () => {
  const originalModule = jest.requireActual('@aws-amplify/graphql-generator');
  return {
    ...originalModule,
    generateModels: jest.fn(),
  };
});
jest.mock('@graphql-codegen/core', () => {
  const originalModule = jest.requireActual('@graphql-codegen/core');
  const codegen = jest.fn();
  codegen.mockReturnValue(MOCK_GENERATED_CODE);
  return {
    ...originalModule,
    codegen,
  };
});

const MOCK_OUTPUT_DIR = 'output';
const MOCK_PROJECT_ROOT = 'project';
const MOCK_PROJECT_NAME = 'myapp';
const MOCK_BACKEND_DIRECTORY = 'backend';
const MOCK_GENERATED_INTROSPECTION = { schemaVersion: 1 };
const MOCK_GENERATED_CODE = JSON.stringify(MOCK_GENERATED_INTROSPECTION);
const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
  amplify: {
    getProjectMeta: jest.fn(),
    getEnvInfo: jest.fn().mockReturnValue({ projectPath: MOCK_PROJECT_ROOT }),
    getResourceStatus: jest.fn().mockReturnValue({
      allResources: [
        {
          service: 'AppSync',
          providerPlugin: 'awscloudformation',
          resourceName: MOCK_PROJECT_NAME,
        },
      ],
    }),
    executeProviderUtils: jest.fn().mockReturnValue([]),
    pathManager: {
      getBackendDirPath: jest.fn().mockReturnValue(MOCK_BACKEND_DIRECTORY),
    },
    getProjectConfig: jest.fn().mockReturnValue('frontend'),
  },
  parameters: {},
};

describe('generateModelIntrospection', () => {
  graphqlGenerator.generateModels.mockReturnValue({ 'model-introspection.json': MOCK_GENERATED_CODE });
  const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
  const outputDirectory = path.join(MOCK_PROJECT_ROOT, MOCK_OUTPUT_DIR);
  const mockedFiles = {};
  mockedFiles[schemaFilePath] = {
    'schema.graphql': ' type SimpleModel { id: ID! status: String } ',
  };
  mockedFiles[outputDirectory] = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate model intropection schema', async () => {
    mockFs(mockedFiles);
    // assert empty folder before generation
    expect(fs.readdirSync(outputDirectory).length).toEqual(0);
    const contextWithOutputDir = {
      ...MOCK_CONTEXT,
      parameters: {
        options: {
          ['output-dir']: MOCK_OUTPUT_DIR,
        },
      },
    };
    await expect(generateModelIntrospection(contextWithOutputDir)).resolves.not.toThrow();
    // assert model generation succeeds with a single schema file
    expect(graphqlGenerator.generateModels).toBeCalled();
    expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);
  });
  it('should throw error if the output dir is not included in the command', async () => {
    mockFs(mockedFiles);
    // assert empty folder before generation
    expect(fs.readdirSync(outputDirectory).length).toEqual(0);
    await expect(generateModelIntrospection(MOCK_CONTEXT)).rejects.toThrowError();
    // assert model generation failure with no file found
    expect(graphqlGenerator.generateModels).not.toBeCalled();
    expect(fs.readdirSync(outputDirectory).length).toEqual(0);
  });

  afterEach(mockFs.restore);
});

describe('getModelIntrospection', () => {
  graphqlGenerator.generateModels.mockReturnValue({ 'model-introspection.json': MOCK_GENERATED_CODE });
  const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
  const outputDirectory = path.join(MOCK_PROJECT_ROOT, MOCK_OUTPUT_DIR);
  const mockedFiles = {};
  mockedFiles[schemaFilePath] = {
    'schema.graphql': ' type SimpleModel { id: ID! status: String } ',
  };
  mockedFiles[outputDirectory] = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return model intropection schema', async () => {
    mockFs(mockedFiles);
    // assert empty folder before generation
    expect(fs.readdirSync(outputDirectory).length).toEqual(0);

    const responseObject = await getModelIntrospection(MOCK_CONTEXT);
    expect(responseObject).toEqual(MOCK_GENERATED_INTROSPECTION);

    // assert model generation succeeds with no file written
    expect(graphqlGenerator.generateModels).toBeCalled();
    expect(fs.readdirSync(outputDirectory).length).toEqual(0);
  });

  afterEach(() => {
    mockFs.restore();
  });
});
