import { generateTypes, GenerateTypesOptions, TypesTarget } from '..';
import { readSchema } from './utils';

describe('generateTypes', () => {
  describe('targets', () => {
    const targets: TypesTarget[] = ['json', 'swift', 'typescript', 'flow', 'scala', 'flow-modern', 'angular'];
    targets.forEach(target => {
      test(`basic ${target}`, async () => {
        const options: GenerateTypesOptions = {
          schema: readSchema('blog-sdl.graphql'),
          target,
        };

        const types = await generateTypes(options);
        expect(types).toMatchSnapshot();
      });
    });
  });
});