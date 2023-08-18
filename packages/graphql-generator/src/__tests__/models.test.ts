import { generateModels, GenerateModelsOptions, ModelsTarget } from '..';
import { readSchema } from './utils';

describe('generateModels', () => {
  describe('targets', () => {
    const targets: ModelsTarget[] = ['android', 'ios', 'flutter', 'introspection'];
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
