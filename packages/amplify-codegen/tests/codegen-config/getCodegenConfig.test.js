const { getCodegenConfig } = require('../../src/codegen-config');
const fs = require('fs-extra');
const graphQLConfig = require('graphql-config');
const path = require('path');

jest.mock('fs-extra');
jest.mock('graphql-config');

const MOCK_PROJECT_ROOT = 'mockprojectpath';
const MOCK_CODEGEN_CONFIG_PROJECT = {
  schemaPath: 'mockSchema',
  includes: 'src/graphql/**/*.js',
  excludes: './amplify/**',
  extensions: {
    amplify: {
      codeGenTarget: 'typescript',
      generatedFileName: 'src/API.ts',
      docsFilePath: 'src/graphql',
      maxDepth: 4,
      version: 3
    }
  }
};

const MOCK_CODEGEN_CONFIG = {
  config: { ...MOCK_CODEGEN_CONFIG_PROJECT },
  getProjects: jest.fn().mockReturnValue([MOCK_CODEGEN_CONFIG_PROJECT])
};

describe('get codegen configuration', () => {
  beforeEach(()=> {
    jest.resetAllMocks();
  });

  it('throws error for non-existent project path', () => {
    expect(() => { getCodegenConfig() } ).toThrowError();
  });

  it('throws error for invalid project path', () => {
    expect(() => { getCodegenConfig(MOCK_PROJECT_ROOT) } ).toThrowError();
  });

  it('throws error for non-existent config file at project path', () => {
    fs.existsSync = jest.fn().mockImplementationOnce( (path) => {
      return path === MOCK_PROJECT_ROOT
    });
    expect(() => { getCodegenConfig(MOCK_PROJECT_ROOT) } ).toThrowError();
  });

  it('correctly returns the generated documents path', () => {
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(MOCK_CODEGEN_CONFIG);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getGeneratedQueriesPath()).toEqual(path.join('src', 'graphql', 'queries'));
    expect(getConfigReturn.getGeneratedMutationsPath()).toEqual(path.join('src', 'graphql', 'mutations'));
    expect(getConfigReturn.getGeneratedSubscriptionsPath()).toEqual(path.join('src', 'graphql', 'subscriptions'));
    expect(getConfigReturn.getGeneratedFragmentsPath()).toEqual(path.join('src', 'graphql', 'fragments'));
  });

  it('returns correct maxDepth as a Number', () => {
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(MOCK_CODEGEN_CONFIG);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getQueryMaxDepth()).toEqual(4);
  });

  it('uses the includes property if the generated documents path does not exist', () => {
    const configWithoutDocumentsPath = { ...MOCK_CODEGEN_CONFIG };
    delete configWithoutDocumentsPath.config.extensions.amplify.docsFilePath;
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(configWithoutDocumentsPath);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getGeneratedQueriesPath()).toEqual(path.join('src', 'graphql', 'queries'));
    expect(getConfigReturn.getGeneratedMutationsPath()).toEqual(path.join('src', 'graphql', 'mutations'));
    expect(getConfigReturn.getGeneratedSubscriptionsPath()).toEqual(path.join('src', 'graphql', 'subscriptions'));
    expect(getConfigReturn.getGeneratedFragmentsPath()).toEqual(path.join('src', 'graphql', 'fragments'));
  });

  it('correctly returns the generated types path if exists', () => {
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(MOCK_CODEGEN_CONFIG);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getGeneratedTypesPath()).toEqual(path.join('src', 'API.ts'));
  });

  it('returns undefined if types path does not exist', () => {
    const configWithoutTypes = { ...MOCK_CODEGEN_CONFIG };
    delete configWithoutTypes.config.extensions.amplify.generatedFileName;
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(configWithoutTypes);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getGeneratedTypesPath()).toBeUndefined();
  });

  it('returns undefined if types path is empty string', () => {
    const configWithoutTypes = { ...MOCK_CODEGEN_CONFIG };
    configWithoutTypes.config.extensions.amplify.generatedFileName = '';
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(configWithoutTypes);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getGeneratedTypesPath()).toBeUndefined();
  });

  it('returns undefined if maxDepth does not exist', () => {
    const configWithoutMaxDepth = { ...MOCK_CODEGEN_CONFIG };
    delete configWithoutMaxDepth.config.extensions.amplify.maxDepth;
    fs.existsSync = jest.fn().mockReturnValue(true);
    graphQLConfig.getGraphQLConfig = jest.fn().mockReturnValue(configWithoutMaxDepth);
    const getConfigReturn = getCodegenConfig(MOCK_PROJECT_ROOT);
    expect(getConfigReturn.getQueryMaxDepth()).toBeUndefined();
  });
});
