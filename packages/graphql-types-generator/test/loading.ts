import * as path from 'path';

import { loadAndMergeQueryDocuments } from '../src/loading';

describe('Validation', () => {
  test(`should extract gql snippet from javascript file`, () => {
    const inputPaths = [path.join(__dirname, '.', 'fixtures', 'starwars', 'gqlQueries.js')];

    const document = loadAndMergeQueryDocuments(inputPaths);

    if (process.platform === 'win32') {
      expect(document).toMatchSnapshot('loading.windows.ts.snap');
    } else {
      expect(document).toMatchSnapshot('loading.ts.snap');
    }
  });
  test(`should throw a helpful message when a file has invalid gql snippets`, () => {
    const inputPaths = [path.join(__dirname, '.', 'fixtures', 'misc', 'invalid-gqlQueries.js')];
    const expectedErrorMessage = `
"Could not parse graphql operations in ${path.join('test', 'fixtures', 'misc', 'invalid-gqlQueries.js')}
  Failed on : world and other words"
`;
    expect(() => {
      loadAndMergeQueryDocuments(inputPaths);
    }).toThrowErrorMatchingInlineSnapshot(expectedErrorMessage);
  });
});
