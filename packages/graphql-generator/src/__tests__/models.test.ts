import { generateModels, GenerateModelsOptions, Platform } from '..';
import { readSchema } from './utils';

describe('generateModels', () => {
  describe('platforms', () => {
    const platforms: Platform[] = ['android', 'ios', 'flutter', 'introspection'];
    platforms.forEach(platform => {
      test(`basic ${platform}`, async () => {
        const options: GenerateModelsOptions = {
          schema: readSchema('blog-model.graphql'),
          platform,
        };
        const models = await generateModels(options);
        expect(models).toMatchSnapshot();
      });
    });
  });
});
