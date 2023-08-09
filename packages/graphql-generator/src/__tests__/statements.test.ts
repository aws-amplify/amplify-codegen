import { generateStatements, GenerateStatementsOptions } from '..';

describe('generateStatements', () => {
  test('basic test', () => {
    const options: GenerateStatementsOptions = {
      schema: `
        type Query {
          hello: String!
        }
        
        schema {
          query: Query
        }
      `,
      appSyncApi: '',
      target: 'javascript',
    };

    const statements = generateStatements(options);
    console.log(statements);
    expect(statements).toMatchSnapshot();
  });
});
