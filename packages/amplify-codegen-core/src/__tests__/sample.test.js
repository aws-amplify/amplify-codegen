const { sync } = require('glob-all');
const path = require('path');
// const { generateSource } = require('@aws-amplify/appsync-typegen-plugin/src/typescript');
const fs = require('fs-extra');

const loadConfig = require('../../../amplify-codegen/src/codegen-config');
const generateTypes = require('../codegen');
const constants = require('../../../amplify-codegen/src/constants');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails } = require('../../../amplify-codegen/src/utils');

const MOCK_CONTEXT = {
  print: {
    info: jest.fn(),
  },
  amplify: {
    getProjectMeta: jest.fn(),
    getEnvInfo: jest.fn(),
    getResourceStatus: jest.fn(),
    executeProviderUtils: jest.fn(),
    pathManager: {
      getBackendDirPath: jest.fn(),
    },
    getProjectConfig: jest.fn(),
  },
};

jest.mock('glob-all');
jest.mock('@aws-amplify/graphql-types-generator');
jest.mock('../../../amplify-codegen/src/codegen-config');
jest.mock('../../../amplify-codegen/src/utils');
jest.mock('fs-extra');
// Mock the Feature flags for statements and types generation to use migrated packages
jest.mock('amplify-cli-core', () => {
  return {
    FeatureFlags: {
      getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
        if (name === 'codegen.useDocsGeneratorPlugin') {
          return true;
        }
        if (name === 'codegen.useTypesGeneratorPlugin') {
          return true;
        }
      }),
    },
  };
});

const MOCK_INCLUDE_PATH = 'MOCK_INCLUDE';
const MOCK_EXCLUDE_PATH = 'MOCK_EXCLUDE';
const MOCK_QUERIES = ['/Users/sadiredd/amplify-cli-typescript/src/graphql/subscriptions.ts'];
const MOCK_SCHEMA = 'INTROSPECTION_SCHEMA.JSON';
const MOCK_TARGET = 'TYPE_SCRIPT_OR_FLOW_OR_ANY_OTHER_LANGUAGE';
const MOCK_GENERATED_FILE_NAME = 'API.TS';
const MOCK_API_ID = 'MOCK_API_ID';
const MOCK_REGION = 'MOCK_AWS_REGION';
const MOCK_PROJECT_ROOT = 'MOCK_PROJECT_ROOT';
const MOCK_PROJECT_NAME = 'myapp';
const MOCK_BACKEND_DIRECTORY = 'backend';

const MOCK_PROJECT = {
  excludes: [MOCK_EXCLUDE_PATH],
  includes: [MOCK_INCLUDE_PATH],
  schema: MOCK_SCHEMA,
  amplifyExtension: {
    generatedFileName: MOCK_GENERATED_FILE_NAME,
    codeGenTarget: MOCK_TARGET,
    graphQLApiId: MOCK_API_ID,
    region: MOCK_REGION,
  },
};
sync.mockReturnValue(MOCK_QUERIES);
const MOCK_APIS = [
  {
    id: MOCK_API_ID,
  },
];

getFrontEndHandler.mockReturnValue('javascript');

describe('command - types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addMocksToContext();
    fs.existsSync.mockReturnValue(true);
    getFrontEndHandler.mockReturnValue('javascript');
    loadConfig.mockReturnValue({
      getProjects: jest.fn().mockReturnValue([MOCK_PROJECT]),
    });
    MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
    getAppSyncAPIDetails.mockReturnValue(MOCK_APIS);
  });

  it('should generate types in sample', async () => {
    const forceDownload = false;
    MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({ frontend: 'javascript' });
    await generateTypes(MOCK_CONTEXT, forceDownload);
    // expect(getFrontEndHandler).toHaveBeenCalledWith(MOCK_CONTEXT);
    // expect(loadConfig).toHaveBeenCalledWith(MOCK_CONTEXT, false);
    expect(sync).toHaveBeenCalledWith([MOCK_INCLUDE_PATH, `!${MOCK_EXCLUDE_PATH}`], { cwd: MOCK_PROJECT_ROOT, absolute: true });
    // expect(plugin).toHaveBeenCalledWith(
    //   MOCK_QUERIES,
    //   path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
    //   path.join(MOCK_PROJECT_ROOT, MOCK_GENERATED_FILE_NAME),
    //   '',
    //   MOCK_TARGET,
    //   '',
    //   { addTypename: true, complexObjectSupport: 'auto' }
    // );
    // expect(generateSource).toHaveBeenCalled();
  });

  // it('should not generate type if the frontend is android', async () => {
  //   const forceDownload = false;
  //   getFrontEndHandler.mockReturnValue('android');
  //   await generateTypes(MOCK_CONTEXT, forceDownload);
  //   expect(generate).not.toHaveBeenCalled();
  // });

  // it('should download the schema if forceDownload flag is passed', async () => {
  //   const forceDownload = true;
  //   await generateTypes(MOCK_CONTEXT, forceDownload);
  //   expect(ensureIntrospectionSchema).toHaveBeenCalledWith(
  //     MOCK_CONTEXT,
  //     path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
  //     MOCK_APIS[0],
  //     MOCK_REGION,
  //     forceDownload
  //   );
  // });

  // it('should download the schema if the schema file is missing', async () => {
  //   fs.existsSync.mockReturnValue(false);
  //   const forceDownload = false;
  //   await generateTypes(MOCK_CONTEXT, forceDownload);
  //   expect(ensureIntrospectionSchema).toHaveBeenCalledWith(
  //     MOCK_CONTEXT,
  //     path.join(MOCK_PROJECT_ROOT, MOCK_SCHEMA),
  //     MOCK_APIS[0],
  //     MOCK_REGION,
  //     forceDownload
  //   );
  // });

  // it('should show a warning if there are no projects configured', async () => {
  //   loadConfig.mockReturnValue({
  //     getProjects: jest.fn().mockReturnValue([]),
  //   });
  //   await generateTypes(MOCK_CONTEXT, false);
  //   expect(MOCK_CONTEXT.print.info).toHaveBeenCalledWith(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
  // });

  // it('should not generate types when includePattern is empty', async () => {
  //   MOCK_PROJECT.includes = [];
  //   await generateTypes(MOCK_CONTEXT, true);
  //   expect(generate).not.toHaveBeenCalled();
  //   expect(sync).not.toHaveBeenCalled();
  // });

  // it('should not generate type when generatedFileName is missing', async () => {
  //   MOCK_PROJECT.amplifyExtension.generatedFileName = '';
  //   await generateTypes(MOCK_CONTEXT, true);
  //   expect(generate).not.toHaveBeenCalled();
  //   expect(sync).not.toHaveBeenCalled();
  // });
});

function addMocksToContext() {
  MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({ projectPath: MOCK_PROJECT_ROOT });
  MOCK_CONTEXT.amplify.getResourceStatus.mockReturnValue({
    allResources: [
      {
        service: 'AppSync',
        providerPlugin: 'awscloudformation',
        resourceName: MOCK_PROJECT_NAME,
      },
    ],
  });
  MOCK_CONTEXT.amplify.executeProviderUtils.mockReturnValue([]);
  MOCK_CONTEXT.amplify.pathManager.getBackendDirPath.mockReturnValue(MOCK_BACKEND_DIRECTORY);
}
