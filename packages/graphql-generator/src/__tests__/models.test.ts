import * as fs from 'fs-extra';
import { generateModels, GenerateModelsOptions, ModelsTarget } from '..';
import { readSchema } from './utils';

jest.mock('fs-extra');

describe('generateModels', () => {
  describe('targets', () => {
    const targets: ModelsTarget[] = ['java', 'swift', 'javascript', 'typescript', 'dart', 'introspection'];
    targets.forEach(target => {
      test(`basic ${target}`, async () => {
        const schema = readSchema('blog-model.graphql');
        const outputDir = 'src';
        const options: GenerateModelsOptions = {
          schema,
          target,
          directives: '',
          outputDir,
        };
        await generateModels(options);
        expect((fs.outputFileSync as jest.MockedFunction<typeof fs.outputFileSync>).mock.calls).toMatchSnapshot();
      });
    });
  });
});
