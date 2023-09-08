const mockFs = require('mock-fs');
const path = require('path');
const { getOutputFileName } = require('@aws-amplify/graphql-types-generator');

/* Setup mocks for types and statements generation.
 * Create a mock filesystem so that output paths can be tested.
 * Mocks existence of `schema.json` using mocks fs
 * Mocks existence of `.graphqlconfig.yml` by mocking return value for loadConfig utility
 */
function setupMocks(mockFs, loadConfig, apiId, frontend, target) {
  mockFs.restore();
  const docsFilePath = {
    javascript: 'src/graphql',
    android: 'app/src/main/graphql/com/amazonaws/amplify/generated/graphql',
    swift: 'graphql',
  };
  const generatedFileName = getOutputFileName('API', target);
  const schemaFilePath = 'schema.json';
  const nodeModulesPrettier = path.resolve(path.join(__dirname, '../../../../node_modules/prettier'));
  const mockedFiles = {
    // load actual prettier module to avoid error
    // Cannot find module './parser-graphql' from '../../node_modules/prettier/index.js'
    // It's not clear why other modules don't need to be loaded
    [nodeModulesPrettier]: mockFs.load(nodeModulesPrettier, {
      recursive: true,
      lazy: true,
    }),
    [schemaFilePath]: mockFs.load(path.resolve(path.join(__dirname, './blog-introspection-schema.json'))),
  };
  mockFs(mockedFiles);

  // mock-fs does not correctly isolate .graphqlconfig.yml between tests
  loadConfig.mockReturnValue({
    getProjects: jest.fn(() => [
      {
        schema: schemaFilePath,
        includes: [path.join(docsFilePath[frontend], '*')],
        excludes: ['./amplify/**'],
        amplifyExtension: {
          codeGenTarget: target,
          generatedFileName,
          docsFilePath: docsFilePath[frontend],
          region: 'us-west-2',
          apiId,
          frontend,
          framework: 'react',
          maxDepth: 2,
        },
        __root__: false,
        projectName: 'Codegen Project',
      },
    ]),
  });

  return { generatedFileName, docsFilePath: docsFilePath[frontend] };
}

module.exports = {
  setupMocks,
};
