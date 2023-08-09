import { generateStatements, GenerateStatementsOptions, Target } from '..';

describe('generateStatements', () => {
  describe('targets', () => {
    const targets: Target[] = ['javascript', 'graphql', 'flow', 'typescript', 'angular'];
    targets.forEach(target => {
      test(`basic ${target}`, () => {
        const options: GenerateStatementsOptions = {
          schema: `
            type Query {
              hello: String!
            }
            
            schema {
              query: Query
            }
          `,
          target,
        };

        const statements = generateStatements(options);
        expect(statements).toMatchSnapshot();
      });
    });
  });
});
