import { generateModels, generateModelsSync, GenerateModelsOptions, ModelsTarget } from '..';
import { readSchema } from './utils';

const generators = ['generateModels', 'generateModelsSync'] as const;

async function runGenerator(generator: (typeof generators)[number], options: GenerateModelsOptions) {
  if (generator === 'generateModels') {
    return await generateModels(options);
  } else {
    return generateModelsSync(options);
  }
}

generators.forEach((generator) => {
  describe(generator, () => {
    describe('targets', () => {
      const targets: ModelsTarget[] = ['java', 'swift', 'javascript', 'typescript', 'dart', 'introspection'];
      targets.forEach(target => {
        test(`basic ${target}`, async () => {
          const options: GenerateModelsOptions = {
            schema: readSchema('blog-model.graphql'),
            target,
          };
          const models = await runGenerator(generator, options);
          expect(models).toMatchSnapshot();
        });
      });

      test(`improve pluralization swift`, async () => {
        const options: GenerateModelsOptions = {
          schema: readSchema('blog-model.graphql'),
          target: 'swift',
          improvePluralization: true,
        };
        const models = await runGenerator(generator, options);
        expect(models).toMatchSnapshot();
      });
    });

    test('does not fail on custom directives', async () => {
      const options: GenerateModelsOptions = {
        schema: `
          type Blog @customModel {
            id: ID!
            name: String! @customField
          }`,
        target: 'introspection',
        directives: `
          directive @customModel on OBJECT
          directive @customField on FIELD_DEFINITION
        `,
      };
      const models = await runGenerator(generator, options);
      expect(models).toMatchSnapshot();
    });
  });
});

const targets: ModelsTarget[] = ['java', 'swift', 'javascript', 'typescript', 'dart', 'introspection'];
targets.forEach(target => {
  test(`both generates generate the same basic ${target}`, async () => {
    const options: GenerateModelsOptions = {
      schema: readSchema('blog-model.graphql'),
      target,
    };
    const asyncGeneratorModels = await generateModels(options);
    const syncGeneratorModels = generateModelsSync(options);
    expect(asyncGeneratorModels).toEqual(syncGeneratorModels);
  });
});