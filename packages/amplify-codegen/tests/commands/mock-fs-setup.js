const mockFs = require('mock-fs');
const path = require('path');
const getOutputFileName = require('../../src/utils/getOutputFileName');

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
