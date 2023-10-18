import * as path from 'path';
import { GraphQLStatementsFormatter } from '../../utils';

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(jest.requireActual('path').join),
}));

describe('GraphQL statements Formatter', () => {
  const statements = new Map();

  const graphql = `
    query GetProject($id: ID!) {
      getProject(id: $id) {
        id
        name
        createdAt
        updatedAt
      }
    }
  `;

  statements.set('getProject', {
    graphql,
    operationName: 'GetProject',
    operationType: 'query',
    fieldName: 'getProject',
  });

  it('Generates formatted output for JS frontend', () => {
    const formattedOutput = new GraphQLStatementsFormatter('javascript').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for TS frontend with posix path', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', '../API.ts').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for TS frontend with windows path', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', '..\\API.ts').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for TS frontend with posix path in same dir', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', './API.ts').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output for TS frontend with windows path in same dir', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', '.\\API.ts').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  // simulate windows path.join functionality until tests are run on windows
  it('Generates formatted output for TS frontend with windows simulated', () => {
    path.join.mockReturnValueOnce('..\\types\\API.ts');
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', '../types/API.ts').format(statements);
    expect(formattedOutput).toMatchSnapshot();
  });

  it('Generates formatted output and only remove file extension', () => {
    const formattedOutput = new GraphQLStatementsFormatter('typescript', 'queries', '../Components/Data/API.tsx').format(statements);
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
