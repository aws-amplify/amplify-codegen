const generateModels = require('../../src/commands/models');
const mock = require('mock-fs');
const graphqlCodegen = require('@graphql-codegen/core');
const fs = require('fs');
const path = require('path');

jest.mock('@graphql-codegen/core');
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
        getBackendDirPath: jest.fn()
    },
    getProjectConfig: jest.fn()
  },
};
const OUTPUT_PATHS = {
    javascript: 'src',
    android: 'app/src/main/java',
    ios: 'amplify/generated/models',
    flutter: 'lib/models'
};
const MOCK_PROJECT_ROOT = 'project';
const MOCK_PROJECT_NAME = 'myapp';
const MOCK_BACKEND_DIRECTORY = 'backend';
const MOCK_GENERATED_CODE = 'This code is auto-generated!';

// Mock the Feature flag to use migrated moldegen
jest.mock('amplify-cli-core', (MOCK_PROJECT_ROOT) => {
  return {
    FeatureFlags: {
      getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
        if (name === 'codegen.useappsyncmodelgenplugin') {
          return true;
        }
      })
    },
    pathManager: {
        findProjectRoot: jest.fn().mockReturnValue(MOCK_PROJECT_ROOT)
    }
  };
});

describe('command - models', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      MOCK_CONTEXT.amplify.getEnvInfo.mockReturnValue({projectPath: MOCK_PROJECT_ROOT});
      MOCK_CONTEXT.amplify.getResourceStatus.mockReturnValue(
           {
              allResources: [
                  {
                      service: 'AppSync', 
                      providerPlugin: 'awscloudformation',
                      resourceName: MOCK_PROJECT_NAME
                    }
                ]
            }
        );
      MOCK_CONTEXT.amplify.executeProviderUtils.mockReturnValue([]);
      MOCK_CONTEXT.amplify.pathManager.getBackendDirPath.mockReturnValue(MOCK_BACKEND_DIRECTORY);
      graphqlCodegen.codegen.mockReturnValue(MOCK_GENERATED_CODE);
    });

    for (const frontend in OUTPUT_PATHS) {
        it(frontend + ': Should generate models from a single schema file', async () => {
            // mock the input and output file structure
            const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
            const mockedFiles = {};
            mockedFiles[schemaFilePath] = {
                'schema.graphql': ' type SimpleModel { id: ID! status: String } '
            };
            mockedFiles[path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend])] = {}
            mock(mockedFiles);
            MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({frontend: frontend});
            const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
            // assert empty folder before generation
            expect(fs.readdirSync(outputDirectory).length).toEqual(0);
            await generateModels(MOCK_CONTEXT);
            // assert model generation succeeds with a single schema file
            expect(graphqlCodegen.codegen).toBeCalled();
            // assert model files are generated in expected output directory
            expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);
        });

        it(frontend + ': Should generate models from any subdirectory in schema folder', async () => {
            // mock the input and output file structure
            const schemaFolderPath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME, 'schema', 'nested', 'deeply');
            const mockedFiles = {};
            mockedFiles[schemaFolderPath] = {
                'myschema.graphql': ' type SimpleModel { id: ID! status: String } '
            };
            mockedFiles[path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend])] = {}
            mock(mockedFiles);
            MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({frontend: frontend});
            const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
            // assert empty folder before generation
            expect(fs.readdirSync(outputDirectory).length).toEqual(0);
            await generateModels(MOCK_CONTEXT);
            // assert model generation succeeds with a single schema file
            expect(graphqlCodegen.codegen).toBeCalled();
            // assert model files are generated in expected output directory
            expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);
        });
    };

    afterEach(mock.restore);
  });
