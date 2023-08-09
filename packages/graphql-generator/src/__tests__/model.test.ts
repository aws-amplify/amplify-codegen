import { generateModels, GenerateModelsOptions, Platform } from '..';

describe('generateModels', () => {
  describe('platforms', () => {
    const platforms: Platform[] = ['android', 'ios', 'flutter', 'introspection'];
    platforms.forEach(platform => {
      test(`basic ${platform}`, async () => {
        const options: GenerateModelsOptions = {
          schema: 'type SimpleModel @model { id: ID! status: String }',
          platform,
        };
        const models = await generateModels(options);
        expect(models).toMatchSnapshot();
      });
    });
  });
});
