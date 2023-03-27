import { resolve } from 'path';
import * as fs from 'fs';
import { generate } from '../src';

describe('end 2 end tests', () => {
  const schemaPath = resolve(__dirname, '../fixtures/schema.json');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  it('should generate statements', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, isSDLSchema: false });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in JS', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'javascript', isSDLSchema: false });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in Typescript', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'typescript', isSDLSchema: false });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in flow', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'flow', isSDLSchema: false });
    expect(generatedOutput).toMatchSnapshot();
  });
});

describe('end 2 end tests to test if the case style is retained for type names', () => {
  const schemaPath = resolve(__dirname, '../fixtures/caseTypes.graphql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  it('should generate statements', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'graphql' });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in JS', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'javascript' });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in Typescript', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'typescript' });
    expect(generatedOutput).toMatchSnapshot();
  });

  it('should generate statements in flow', () => {
    const generatedOutput = generate(schema, { maxDepth: 3, language: 'flow' });
    expect(generatedOutput).toMatchSnapshot();
  });
});
