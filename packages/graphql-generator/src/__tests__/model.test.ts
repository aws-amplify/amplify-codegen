import { generateModels, GenerateModelsOptions } from '..';

describe('generateModels', () => {
  test('basic test', async () => {
    const options: GenerateModelsOptions = {
      schema: 'type SimpleModel { id: ID! status: String }',
      platform: 'javascript',
      directiveDefinitions: '',
    };
    const models = await generateModels(options);
    expect(models).toMatchSnapshot();
  });
});
