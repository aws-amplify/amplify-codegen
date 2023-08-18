import { GraphQLStatementsFormatter } from '../../utils';

describe('GraphQL statements Formatter', () => {
  const statements = new Map();
  statements.set(
    'getTodo',
    `
    query GetProject($id: ID!) {
      getProject(id: $id) {
        id
        name
        createdAt
        updatedAt
      }
    }
  `,
  );

  it('Generates formatted output for JS frontend', () => {
    const formattedOutput = new GraphQLStatementsFormatter('javascript').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for TS frontend', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for Flow frontend', () => {
    const formattedOutput = new GraphQLStatementsFormatter('flow').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for Angular frontend', () => {
    const formattedOutput = new GraphQLStatementsFormatter('angular').format(statements);
    // Note that for Angular, we generate in GraphQL language itself.
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for GraphQL language', () => {
    const formattedOutput = new GraphQLStatementsFormatter('graphql').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });
});
