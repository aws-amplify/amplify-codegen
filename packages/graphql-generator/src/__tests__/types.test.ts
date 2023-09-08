import { generateTypes, GenerateTypesOptions, TypesTarget } from '..';
import { readSchema } from './utils';

describe('generateTypes', () => {
  const queries = `
    query GetBlog($id: ID!) {
      getBlog(id: $id) {
        id
        name
        posts {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        __typename
      }
    }
  `;
  const sdlSchema = readSchema('blog-sdl.graphql');

  describe('targets', () => {
    const targets: TypesTarget[] = ['json', 'swift', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    const introspectionSchema = readSchema('blog-introspection.json');
    targets.forEach(target => {
      test(`basic ${target}`, async () => {
        const typesFromSdl = await generateTypes({ schema: sdlSchema, queries, target });
        const typesFromIntrospection = await generateTypes({ schema: introspectionSchema, target, queries, introspection: true });

        if (target !== 'json') {
          expect(typesFromSdl).toEqual(typesFromIntrospection);
        } else {
          expect(typesFromIntrospection).toMatchSnapshot();
        }
        expect(typesFromSdl).toMatchSnapshot();
      });
    });
  });

  test('multipleSwiftFiles', async () => {
    const options: GenerateTypesOptions = {
      schema: sdlSchema,
      queries,
      target: 'swift',
      multipleSwiftFiles: true,
    };

    const types = await generateTypes(options);
    expect(types).toMatchSnapshot();
  });
});
