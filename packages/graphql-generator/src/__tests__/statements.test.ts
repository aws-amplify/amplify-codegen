import { generateStatements, GenerateStatementsOptions, StatementsTarget } from '..';
import { readSchema } from './utils';

describe('generateStatements', () => {
  describe('targets', () => {
    const schema = readSchema('blog-sdl.graphql');
    const targets: StatementsTarget[] = ['javascript', 'graphql', 'flow', 'typescript', 'angular'];

    targets.forEach(target => {
      test(`basic ${target}`, () => {
        const options: GenerateStatementsOptions = {
          schema,
          target,
        };

        const statements = generateStatements(options);
        expect(statements).toMatchSnapshot();
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
