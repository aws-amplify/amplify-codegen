const { join } = require('path');
const selectProject = require('../../src/walkthrough/questions/selectProject');
const askCodegenTargetLanguage = require('../../src/walkthrough/questions/languageTarget');
const askCodegneQueryFilePattern = require('../../src/walkthrough/questions/queryFilePattern');
const askGeneratedFileName = require('../../src/walkthrough/questions/generatedFileName');
const askMaxDepth = require('../../src/walkthrough/questions/maxDepth');
const configure = require('../../src/walkthrough/configure');
const { getIncludePattern } = require('../../src/utils');

jest.mock('../../src/walkthrough/questions/selectProject');
jest.mock('../../src/walkthrough/questions/languageTarget');
jest.mock('../../src/walkthrough/questions/queryFilePattern');
jest.mock('../../src/walkthrough/questions/generatedFileName');
jest.mock('../../src/walkthrough/questions/maxDepth');
jest.mock('../../src/utils');

describe('configure walk-through', () => {
  const mockAPI = 'two';
  const mockTargetLanguage = 'MOCK_TARGET_LANGUAGE';
  const mockIncludes = 'MOCK_INCLUDE_PATTERN';
  const mockContext = 'MOCK_CONTEXT';
  const mockGeneratedFileName = 'MOCK_FILE_NAME.ts';
  const mockGraphQLDirectory = 'MOCK_GQL_DIR';
  const mockGraphQLExtension = 'MOCK_GQL_EXTENSION';
  const MOCK_MAX_DEPTH = 'MOCK_MAX_DEPTH';

  const projectOneExcludes = ['one/excluded/*.gql', 'one/excluded/*.graphql'];
  const projectTwoExcludes = ['two/excluded/*.gql', 'two/excluded/*.graphql'];

  const mockConfigs = [
    {
      projectName: 'One',
      includes: ['one/**/*.gql', 'one/**/*.graphql'],
      excludes: projectOneExcludes,
      amplifyExtension: {
        graphQLApiId: 'one',
        generatedFileName: 'one-1.ts',
        codeGenTarget: 'language-one',
        maxDepth: 5,
      },
    },
    {
      projectName: 'Two',
      includes: ['two/**/*.gql', 'two/**/*.graphql'],
      excludes: projectTwoExcludes,
      amplifyExtension: {
        graphQLApiId: 'two',
        maxDepth: 10,
        generatedFileName: 'two-2.ts',
        codeGenTarget: 'language-two',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    selectProject.mockReturnValue(mockAPI);
    askCodegenTargetLanguage.mockReturnValue(mockTargetLanguage);
    askCodegneQueryFilePattern.mockReturnValue(mockIncludes);
    askGeneratedFileName.mockReturnValue(mockGeneratedFileName);
    askMaxDepth.mockReturnValue(MOCK_MAX_DEPTH);
    getIncludePattern.mockReturnValue({
      graphQLDirectory: mockGraphQLDirectory,
      graphQLExtension: mockGraphQLExtension,
    });
  });

  it('should pass the available list of AppSync APIs', async () => {
    const results = await configure(mockContext, mockConfigs);
    const mockProjectSelect = [
      {
        name: mockConfigs[0].projectName,
        value: mockConfigs[0].amplifyExtension.graphQLApiId,
      },
      {
        name: mockConfigs[1].projectName,
        value: mockConfigs[1].amplifyExtension.graphQLApiId,
      },
    ];
    expect(selectProject).toHaveBeenCalledWith(mockContext, mockProjectSelect);
    expect(askCodegenTargetLanguage).toHaveBeenCalledWith(
      mockContext,
      mockConfigs[1].amplifyExtension.codeGenTarget,
      false,
      undefined,
      undefined,
    );
    expect(askCodegneQueryFilePattern).toHaveBeenCalledWith([join(mockGraphQLDirectory, '**', mockGraphQLExtension)]);
    expect(askGeneratedFileName).toHaveBeenCalledWith(mockConfigs[1].amplifyExtension.generatedFileName, mockTargetLanguage);
    expect(askMaxDepth).toHaveBeenCalledWith(10);
    expect(results).toEqual({
      projectName: mockConfigs[1].projectName,
      excludes: [...projectTwoExcludes, mockGeneratedFileName],
      includes: mockIncludes,
      amplifyExtension: {
        graphQLApiId: mockConfigs[1].amplifyExtension.graphQLApiId,
        generatedFileName: mockGeneratedFileName,
        codeGenTarget: mockTargetLanguage,
        maxDepth: MOCK_MAX_DEPTH,
      },
    });
  });

  it('should not add generated types file to excludes twice', async () => {
    const result = await configure(mockContext, mockConfigs);
    expect(result).toEqual({
      projectName: mockConfigs[1].projectName,
      excludes: [...projectTwoExcludes, mockGeneratedFileName],
      includes: mockIncludes,
      amplifyExtension: {
        graphQLApiId: mockConfigs[1].amplifyExtension.graphQLApiId,
        generatedFileName: mockGeneratedFileName,
        codeGenTarget: mockTargetLanguage,
        maxDepth: MOCK_MAX_DEPTH,
      },
    });
    expect(await configure(mockContext, [result])).toEqual({
      projectName: mockConfigs[1].projectName,
      excludes: [...projectTwoExcludes, mockGeneratedFileName],
      includes: mockIncludes,
      amplifyExtension: {
        graphQLApiId: mockConfigs[1].amplifyExtension.graphQLApiId,
        generatedFileName: mockGeneratedFileName,
        codeGenTarget: mockTargetLanguage,
        maxDepth: MOCK_MAX_DEPTH,
      },
    });
  });
});
