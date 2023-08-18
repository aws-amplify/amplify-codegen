import { generateModels, GenerateModelsOptions, ModelsTarget } from '..';
import { readSchema } from './utils';

describe('generateModels', () => {
  describe('targets', () => {
    const targets: ModelsTarget[] = ['java', 'swift', 'javascript', 'typescript', 'dart', 'introspection'];
    targets.forEach(target => {
      test(`basic ${target}`, async () => {
        const options: GenerateModelsOptions = {
          schema: readSchema('blog-model.graphql'),
          target,
        };
        const models = await generateModels(options);
        expect(models).toMatchSnapshot();
      });
    });
  });
});
