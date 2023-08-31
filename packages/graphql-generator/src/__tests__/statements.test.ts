import * as fs from 'fs-extra';
import { generateStatements, GenerateStatementsOptions, StatementsTarget } from '..';
import { readSchema } from './utils';

jest.mock('fs-extra');

describe('generateStatements', () => {
  describe('targets', () => {
    const schema = readSchema('blog-sdl.graphql');
    const targets: StatementsTarget[] = ['javascript', 'graphql', 'flow', 'typescript', 'angular'];

    targets.forEach(target => {
      test(`basic ${target}`, () => {
        const outputDir = 'src';
        const mockedFiles = {
          [outputDir]: {},
        };
        const options: GenerateStatementsOptions = {
          schema,
          target,
          outputDir,
        };

        generateStatements(options);
        expect((fs.outputFileSync as jest.MockedFunction<typeof fs.outputFileSync>).mock.calls).toMatchSnapshot();
      });
    });

    test('target not supported', () => {
      const target = 'swift';
      const options: GenerateStatementsOptions = {
        schema,
        // @ts-ignore
        target,
      };

      expect(() => generateStatements(options)).toThrowError('swift is not a supported target.');
    });
  });
});
