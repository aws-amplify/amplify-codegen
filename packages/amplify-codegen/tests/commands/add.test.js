const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../../src/codegen-config');
const generateStatements = require('../../src/commands/statements');
const generateTypes = require('../../src/commands/types');
const addWalkthrough = require('../../src/walkthrough/add');
const askForFrontend = require('../../src/walkthrough/questions/selectFrontend');
const askForFramework = require('../../src/walkthrough/questions/selectFramework');
const changeAppSyncRegions = require('../../src/walkthrough/changeAppSyncRegions');
const { AmplifyCodeGenAPINotFoundError } = require('../../src/errors');

const add = require('../../src/commands/add');

const {
  getAppSyncAPIDetails,
  getAppSyncAPIInfo,
  getProjectAwsRegion,
  getSDLSchemaLocation,
  downloadIntrospectionSchemaWithProgress,
} = require('../../src/utils');

const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
  },
  amplify: {
    getProjectMeta: jest.fn(),
  },
  parameters: {
    options: {},
  },
};
const mockProjectDir = '/user/foo/project';
jest.mock('fs');
jest.mock('../../src/walkthrough/add');
jest.mock('../../src/walkthrough/questions/selectFrontend');
jest.mock('../../src/walkthrough/questions/selectFramework');
jest.mock('../../src/walkthrough/changeAppSyncRegions');
jest.mock('../../src/commands/types');
jest.mock('../../src/commands/statements');
jest.mock('../../src/codegen-config');
jest.mock('../../src/utils');
jest.mock('process', () => ({
  cwd: () => mockProjectDir,
}));

const MOCK_INCLUDE_PATTERN = 'MOCK_INCLUDE';
const MOCK_EXCLUDE_PATTERN = 'MOCK_EXCLUDE';
const MOCK_SCHEMA_LOCATION = 'INTROSPECTION_SCHEMA.JSON';
const MOCK_TARGET = 'TYPE_SCRIPT_OR_FLOW_OR_ANY_OTHER_LANGUAGE';
const MOCK_GENERATED_FILE_NAME = 'API.TS';
const MOCK_API_ID = 'MOCK_API_ID';
const MOCK_DOCS_FILE_PATH = 'MOCK_DOCS_FILE_PATH';
const MOCK_ENDPOINT = 'MOCK_APPSYNC_ENDPOINT';
const MOCK_API_NAME = 'MOCK_API_NAME';
const MOCK_SCHEMA_FILE_LOCATION = 'amplify/backend/api/MOCK_API_NAME/build/schema.graphql';
const MOCK_AWS_REGION = 'MOCK_AWS_PROJECT_REGION';

const MOCK_ANSWERS = {
  includePattern: MOCK_INCLUDE_PATTERN,
  excludePattern: MOCK_EXCLUDE_PATTERN,
  target: MOCK_TARGET,
  generatedFileName: MOCK_GENERATED_FILE_NAME,
  docsFilePath: MOCK_DOCS_FILE_PATH,
  schemaLocation: MOCK_SCHEMA_LOCATION,
  shouldGenerateDocs: true,
  shouldGenerateCode: true,
};

const MOCK_APPSYNC_API_DETAIL = {
  id: MOCK_API_ID,
  endpoint: MOCK_ENDPOINT,
  name: MOCK_API_NAME,
};

const LOAD_CONFIG_METHODS = {
  getProjects: jest.fn(),
  addProject: jest.fn(),
  save: jest.fn(),
};

describe('command - add', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    LOAD_CONFIG_METHODS.getProjects.mockReturnValue([]);
    addWalkthrough.mockReturnValue(MOCK_ANSWERS);
    getAppSyncAPIDetails.mockReturnValue([MOCK_APPSYNC_API_DETAIL]);
    loadConfig.mockReturnValue(LOAD_CONFIG_METHODS);
    getProjectAwsRegion.mockReturnValue(MOCK_AWS_REGION);
    getSDLSchemaLocation.mockReturnValue(MOCK_SCHEMA_FILE_LOCATION);
    downloadIntrospectionSchemaWithProgress.mockReturnValue();
  });

  it('should walkthrough add questions', async () => {
    await add(MOCK_CONTEXT);
    expect(getAppSyncAPIDetails).toHaveBeenCalledWith(MOCK_CONTEXT);
    expect(getAppSyncAPIInfo).not.toHaveBeenCalled();
    expect(LOAD_CONFIG_METHODS.getProjects).toHaveBeenCalledWith();
    expect(LOAD_CONFIG_METHODS.addProject).toHaveBeenCalled();
    const newProjectConfig = LOAD_CONFIG_METHODS.addProject.mock.calls[0][0];
    expect(newProjectConfig.projectName).toEqual(MOCK_API_NAME);
    expect(newProjectConfig.includes).toEqual(MOCK_INCLUDE_PATTERN);
    expect(newProjectConfig.excludes).toEqual(MOCK_EXCLUDE_PATTERN);
    expect(newProjectConfig.schema).toEqual(MOCK_SCHEMA_FILE_LOCATION);
    expect(newProjectConfig.amplifyExtension.codeGenTarget).toEqual(MOCK_TARGET);
    expect(newProjectConfig.amplifyExtension.generatedFileName).toEqual(MOCK_GENERATED_FILE_NAME);
    expect(newProjectConfig.amplifyExtension.docsFilePath).toEqual(MOCK_DOCS_FILE_PATH);

    expect(generateStatements).toHaveBeenCalledWith(MOCK_CONTEXT, false, undefined, false, undefined);
    expect(generateTypes).toHaveBeenCalledWith(MOCK_CONTEXT, false, false, undefined);

    expect(LOAD_CONFIG_METHODS.save).toHaveBeenCalledWith();
  });

  it('should fetch the info from cloud if an apiId is passed', async () => {
    getAppSyncAPIInfo.mockReturnValue(MOCK_APPSYNC_API_DETAIL);
    await add(MOCK_CONTEXT, MOCK_API_ID);
    expect(getAppSyncAPIInfo).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_API_ID, MOCK_AWS_REGION);
    expect(getAppSyncAPIDetails).not.toHaveBeenCalled();
    expect(changeAppSyncRegions).not.toHaveBeenCalled();
  });

  describe('AppSync API in a different region', () => {
    it('should use the user provided region', async () => {
      const MOCK_NEW_REGION = 'NEW_AWS_REGION';
      getAppSyncAPIInfo.mockImplementationOnce(() => {
        getAppSyncAPIInfo.mockReturnValue(MOCK_APPSYNC_API_DETAIL);
        throw new AmplifyCodeGenAPINotFoundError();
      });
      changeAppSyncRegions.mockReturnValue({ shouldRetry: true, region: MOCK_NEW_REGION });
      await add(MOCK_CONTEXT, MOCK_API_ID);
      expect(getAppSyncAPIInfo).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_API_ID, MOCK_AWS_REGION);
      expect(changeAppSyncRegions).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_AWS_REGION);
      expect(getAppSyncAPIDetails).not.toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.save).toHaveBeenCalledWith();
    });

    it('should not add if user chooses not change region', async () => {
      getAppSyncAPIInfo.mockImplementationOnce(() => {
        throw new AmplifyCodeGenAPINotFoundError();
      });
      changeAppSyncRegions.mockReturnValue({ shouldRetry: false });
      await add(MOCK_CONTEXT, MOCK_API_ID);
      expect(getAppSyncAPIInfo).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_API_ID, MOCK_AWS_REGION);
      expect(changeAppSyncRegions).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_AWS_REGION);
      expect(getAppSyncAPIDetails).not.toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.save).not.toHaveBeenCalled();
    });
  });

  it('should throw an error if an AppSync API is already added', async () => {
    LOAD_CONFIG_METHODS.getProjects.mockReturnValue([{ id: MOCK_API_ID }]);
    await expect(add(MOCK_CONTEXT)).rejects.toBeInstanceOf(Error);
  });

  it('should throw an error if no AppSync APIs are available in project', async () => {
    getAppSyncAPIDetails.mockReturnValue([]);
    await expect(add(MOCK_CONTEXT)).rejects.toBeInstanceOf(Error);
  });

  it('should not generate statements when user chooses not to', async () => {
    addWalkthrough.mockReturnValue({ ...MOCK_ANSWERS, shouldGenerateDocs: false });
    await add(MOCK_CONTEXT);
    expect(generateStatements).not.toHaveBeenCalled();
  });

  it('should not generate types when user chooses not to', async () => {
    addWalkthrough.mockReturnValue({ ...MOCK_ANSWERS, shouldGenerateCode: false });
    await add(MOCK_CONTEXT);
    expect(generateTypes).not.toHaveBeenCalled();
  });

  it('should ignore region supplied when with init', async () => {
    const region = 'us-west-2';
    await add(MOCK_CONTEXT, MOCK_API_ID, region);
    expect(getProjectAwsRegion).toHaveBeenCalled();
    expect(getAppSyncAPIInfo).toHaveBeenCalledWith(MOCK_CONTEXT, MOCK_API_ID, MOCK_AWS_REGION);
  });

  describe('without init', () => {
    const getProjectMeta = jest.fn();
    const schemaPath = path.join(mockProjectDir, 'schema.json');
    beforeEach(() => {
      loadConfig.mockReturnValue({ ...LOAD_CONFIG_METHODS, getProjects: jest.fn().mockReturnValue([]) });
      askForFrontend.mockReturnValue('javascript');
      askForFramework.mockReturnValue('react');
      getProjectMeta.mockRejectedValue('no init');
      fs.existsSync.mockReturnValue(false);
      getAppSyncAPIInfo.mockReturnValue(MOCK_APPSYNC_API_DETAIL);
      downloadIntrospectionSchemaWithProgress.mockReturnValue(schemaPath);
    });

    afterEach(() => {
      loadConfig.mockReset();
      askForFrontend.mockReset();
      askForFramework.mockReset();
      getProjectMeta.mockReset();
      fs.existsSync.mockReset();
      getAppSyncAPIInfo.mockReset();
      downloadIntrospectionSchemaWithProgress.mockReset();
    });

    it('should download introspection schema when api id', async () => {
      const context = { ...MOCK_CONTEXT, amplify: { getProjectMeta } };
      const defaultRegion = 'us-east-1';
      await add(context, MOCK_API_ID);
      expect(getAppSyncAPIInfo).toHaveBeenCalledWith(context, MOCK_API_ID, defaultRegion);
      expect(downloadIntrospectionSchemaWithProgress).toHaveBeenCalledWith(context, MOCK_API_ID, schemaPath, defaultRegion);
      expect(LOAD_CONFIG_METHODS.addProject.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should use existing schema if no api id', async () => {
      fs.existsSync.mockReturnValue(true);
      const context = { ...MOCK_CONTEXT, amplify: { getProjectMeta } };
      const defaultRegion = 'us-east-1';
      await add(context);
      expect(getAppSyncAPIInfo).not.toHaveBeenCalled();
      expect(downloadIntrospectionSchemaWithProgress).not.toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.addProject.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should read frontend and framework from options', async () => {
      const parameters = {
        options: {
          frontend: 'javascript',
          framework: 'vue',
        },
      };
      await add({ ...MOCK_CONTEXT, amplify: { getProjectMeta }, parameters }, MOCK_API_ID);
      expect(askForFrontend).not.toHaveBeenCalled();
      expect(askForFramework).not.toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.addProject).toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.addProject.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should use region supplied when without init', async () => {
      const region = 'us-west-2';
      const context = { ...MOCK_CONTEXT, amplify: { getProjectMeta } };
      await add(context, MOCK_API_ID, region);
      expect(getProjectAwsRegion).not.toHaveBeenCalled();
      expect(getAppSyncAPIInfo).toHaveBeenCalledWith(context, MOCK_API_ID, region);
      expect(LOAD_CONFIG_METHODS.addProject).toHaveBeenCalled();
      expect(LOAD_CONFIG_METHODS.addProject.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should error on invalid frontend', () => {
      const parameters = {
        options: {
          frontend: 'foo',
        },
      };
      expect(add({ ...MOCK_CONTEXT, amplify: { getProjectMeta }, parameters }, MOCK_API_ID)).rejects.toThrowError(
        'Invalid frontend provided',
      );
    });

    it('should error on invalid framework', () => {
      const parameters = {
        options: {
          frontend: 'javascript',
          framework: 'foo',
        },
      };
      expect(add({ ...MOCK_CONTEXT, amplify: { getProjectMeta }, parameters }, MOCK_API_ID)).rejects.toThrowError(
        'Invalid framework provided',
      );
    });

    it('should error if codegen project already exists', () => {
      loadConfig.mockReturnValue({ ...LOAD_CONFIG_METHODS, getProjects: jest.fn().mockReturnValue(['foo']) });
      expect(add({ ...MOCK_CONTEXT, amplify: { getProjectMeta } }, MOCK_API_ID)).rejects.toThrowError(
        'Codegen support only one GraphQL API per project',
      );
    });

    it('should error if codegen project already exists', () => {
      fs.existsSync.mockReturnValue(false);
      expect(add({ ...MOCK_CONTEXT, amplify: { getProjectMeta } })).rejects.toThrowError(
        'Provide an AppSync API ID with --apiId or manually download schema.graphql or schema.json and place in /user/foo/project before adding codegen when not in an amplify project',
      );
    });
  });
});
