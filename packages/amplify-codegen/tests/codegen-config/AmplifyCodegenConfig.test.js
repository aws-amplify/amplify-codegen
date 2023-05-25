const AmplifyCodeGenConfig = require('../../src/codegen-config/AmplifyCodeGenConfig');
const fs = require('fs-extra');
const graphQLConfig = require('graphql-config');

jest.mock('fs-extra');

const MOCK_PROJECT_ROOT = 'mockprojectpath';

describe('AmplifyCodeGenConfig', () => {
  describe('normalizePath', () => {
    let winPathConfig;

    beforeEach(() => {
      winPathConfig = {
        schemaPath: 'foo\\schema.graphql',
        includes: ['foo\\**\\*.grpahql'],
        excludes: ['bar\\**\\*.grpahql'],
        extensions: {
          amplify: {
            generatedFileName: 'src\\api.ts',
            docsFilePath: 'src\\graphql\\',
          },
        },
      };
    });
    it('should convert windows style path to unix style path', () => {
      const normalizedConfig = AmplifyCodeGenConfig.normalizePath(winPathConfig);
      expect(normalizedConfig.schemaPath).toEqual('foo/schema.graphql');
      expect(normalizedConfig.includes).toEqual(['foo/**/*.grpahql']);
      expect(normalizedConfig.excludes).toEqual(['bar/**/*.grpahql']);
      expect(normalizedConfig.extensions.amplify.generatedFileName).toEqual('src/api.ts');
      expect(normalizedConfig.extensions.amplify.docsFilePath).toEqual('src/graphql/');
    });

    it('should handle config where generatedFileName is missing', () => {
      delete winPathConfig.extensions.amplify.generatedFileName;
      const normalizedConfig = AmplifyCodeGenConfig.normalizePath(winPathConfig);
      expect(normalizedConfig.schemaPath).toEqual('foo/schema.graphql');
      expect(normalizedConfig.includes).toEqual(['foo/**/*.grpahql']);
      expect(normalizedConfig.excludes).toEqual(['bar/**/*.grpahql']);
      expect(normalizedConfig.extensions.amplify.generatedFileName).toBeUndefined();
      expect(normalizedConfig.extensions.amplify.docsFilePath).toEqual('src/graphql/');
    });
  });

  describe('graphqlconfig file existence', () => {
    const err = new graphQLConfig.ConfigNotFoundError('cannot find config file');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return a default with no config file', () => {
      jest.spyOn(graphQLConfig, 'getGraphQLConfig').mockImplementation((rootDir) => {
        throw err;
      });
      const configObj = new AmplifyCodeGenConfig(MOCK_PROJECT_ROOT);
      expect(configObj?.gqlConfig?.config).toEqual({});
      expect(configObj?.getProjects()).toEqual([]);
    });

    it('should read the config file is one exists instead of defaulting', () => {
      const MOCK_CONFIG = { config: { key: 'value' } };
      fs.existsSync = jest.fn().mockReturnValue(true);
      jest.spyOn(graphQLConfig, 'getGraphQLConfig').mockImplementation((rootDir) => {
        if (!rootDir) {
          throw err;
        }
        return MOCK_CONFIG;
      });
      const configObj = new AmplifyCodeGenConfig(MOCK_PROJECT_ROOT);
      expect(configObj?.gqlConfig).toEqual(MOCK_CONFIG);
    });
  });
});
