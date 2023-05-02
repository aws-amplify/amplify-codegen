import { resolve } from 'path';
import * as fs from 'fs';
import { generateGraphQLDocuments } from '../src';

describe('GraphQL documents generation tests for introspection schema input', () => {
  const schemaPath = resolve(__dirname, '../fixtures/schema.json');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  it('should generate GraphQL documents for schema', () => {
    const generatedOutput = generateGraphQLDocuments(schema, { maxDepth: 3 });
    snapshotTestGeneratedOutput(generatedOutput);
  });
});

describe('end 2 end tests to test if the case style is retained for type names', () => {
  const schemaPath = resolve(__dirname, '../fixtures/caseTypes.graphql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  it('should generate statements', () => {
    const generatedOutput = generateGraphQLDocuments(schema, { maxDepth: 3 });
    snapshotTestGeneratedOutput(generatedOutput);
  });
});

const snapshotTestGeneratedOutput = (generatedOutput: any, includesFragments = false) => {
  expect(generatedOutput.queries).toBeDefined();
  expect(generatedOutput.queries).toMatchSnapshot();

  expect(generatedOutput.mutations).toBeDefined();
  expect(generatedOutput.mutations).toMatchSnapshot();

  expect(generatedOutput.subscriptions).toBeDefined();
  expect(generatedOutput.subscriptions).toMatchSnapshot();

  if (includesFragments) {
    expect(generatedOutput.fragments).toBeDefined();
    expect(generatedOutput.fragments).toMatchSnapshot();
  }
};
