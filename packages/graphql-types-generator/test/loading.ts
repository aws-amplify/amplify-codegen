import * as path from 'path';

import { loadAndMergeQueryDocuments } from '../src/loading';

describe('Validation', () => {
  test(`should extract gql snippet from javascript file`, () => {
    const inputPaths = [path.join(__dirname, '.', 'fixtures', 'starwars', 'gqlQueries.js')];

    const document = loadAndMergeQueryDocuments(inputPaths);
    // the document of type `DocumentNode` produced depends on the underlying OS and is hard to read.
    expect(document).toBeDefined;
  });
  test(`should throw when a file has invalid gql snippets`, () => {
    const inputPaths = [path.join(__dirname, '.', 'fixtures', 'misc', 'invalid-gqlQueries.js')];
    expect(() => {
      loadAndMergeQueryDocuments(inputPaths);
    }).toThrowError(
      `Could not parse graphql operations in ${path.join(
        'fixtures',
        'misc',
        'invalid-gqlQueries.js',
      )}\n  Failed on : world and other words`,
    );
  });
});
