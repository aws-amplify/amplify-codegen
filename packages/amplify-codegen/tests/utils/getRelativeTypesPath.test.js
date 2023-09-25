const getRelativeTypesPath = require('../../src/utils/getRelativeTypesPath');

describe('getRelativeTypesPath', () => {
  test('in same directory', () => {
    expect(getRelativeTypesPath('src/graphql', 'src/graphql/API.ts')).toEqual('./API.ts');
  });

  test('one dir up', () => {
    expect(getRelativeTypesPath('src/graphql', 'src/API.ts')).toEqual('../API.ts');
  });

  test('two dir up', () => {
    expect(getRelativeTypesPath('src/graphql', 'API.ts')).toEqual('../../API.ts');
  });

  test('one dir down', () => {
    expect(getRelativeTypesPath('src/graphql', 'src/graphql/types/API.ts')).toEqual('./types/API.ts');
  });

  test('two dir down', () => {
    expect(getRelativeTypesPath('src/graphql', 'src/graphql/types/foo/API.ts')).toEqual('./types/foo/API.ts');
  });

  test('sibling dirs', () => {
    expect(getRelativeTypesPath('src/graphql', 'src/types/API.ts')).toEqual('../types/API.ts');
  });

  test('no types file', () => {
    expect(getRelativeTypesPath('src/graphql', null)).toEqual(null);
  });
});
