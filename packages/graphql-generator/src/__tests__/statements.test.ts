import { generateStatements, GenerateStatementsOptions, Target } from '..';
import { readSchema } from './utils';

describe('generateStatements', () => {
  describe('targets', () => {
    const targets: Target[] = ['javascript', 'graphql', 'flow', 'typescript', 'angular'];
    targets.forEach(target => {
      test(`basic ${target}`, () => {
        const options: GenerateStatementsOptions = {
          schema: readSchema('blog-sdl.graphql'),
          target,
        };

        const statements = generateStatements(options);
        expect(statements).toMatchSnapshot();
      });
    });
  });
});
