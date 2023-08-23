import { generateTypes, GenerateTypesOptions, TypesTarget } from '..';
import { readSchema } from './utils';

describe('generateTypes', () => {
  describe('targets', () => {
    const targets: TypesTarget[] = ['json', 'swift', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    targets.forEach(target => {
      const sdlSchema = readSchema('blog-sdl.graphql');
      const introspectionSchema = readSchema('blog-introspection.json');

      test(`basic ${target}`, async () => {
        const options: GenerateTypesOptions = {
          schema: sdlSchema,
          target,
        };

        const typesFromSdl = await generateTypes({ schema: sdlSchema, target });
        const typesFromIntrospection = await generateTypes({ schema: introspectionSchema, target, introspection: true });

        expect(typesFromSdl).toEqual(typesFromIntrospection);
        expect(typesFromSdl).toMatchSnapshot();
      });
    });
  });

  test('multipleSwiftFiles', async () => {
    const options: GenerateTypesOptions = {
      schema: readSchema('blog-sdl.graphql'),
      target: 'swift',
      multipleSwiftFiles: true,
    };

    const types = await generateTypes(options);
    expect(types).toMatchSnapshot();
  });
});
