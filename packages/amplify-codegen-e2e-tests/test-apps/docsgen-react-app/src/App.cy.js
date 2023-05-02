import React from 'react';
import App from './App';

const operations = ['queries', 'mutations', 'subscriptions'];
const operationPrefixes = [
  'create', 
  'update', 
  'delete',
  'get',
  'list'
];

describe('Testing browser compatibility of Documents Generation', () => {
  beforeEach(() => {
    cy.mount(<App />);

    // clear all the inputs and outputs
    cy.get('input[name="inputSchema"]').clear();
    cy.get('input[name="maxDepth"]').clear();
    operations.map((operation) => {
      cy.get(`textarea[name="${operation}"]`).clear();
    });
    operationPrefixes.map((opPrefix) => {
      cy.get(`textarea[name="${opPrefix}TodoResult"]`).clear();
    });
  });

  it('generates operations for valid SDL schema and default maxDepth', async () => {
    await testGraphQLDocumentsGeneration('sdl-schema.graphql', 2);
  });

  it('generates operations for valid Introspection schema and default maxDepth', async () => {
    await testGraphQLDocumentsGeneration('introspection-schema.json', 2);
  });
});

const testGraphQLDocumentsGeneration = async (schemaFileName, maxDepth) => {
  // generate GraphQL documents for the compiled schema
  const schemaString = await fetch(`/${schemaFileName}`);
  cy.get('input[name="inputSchema"]').type(await schemaString.text());
  cy.get('input[name="maxDepth"]').type(maxDepth);
  cy.get('button[name="generateDocuments"]').click();

  // verify that GraphQL documents are generated
  operations.map((operation) => {
    const outputField = cy.get(`textarea[name="${operation}"]`);
    outputField.invoke('val').then((outputValue) => {
      expect(outputValue).to.exist;
      expect(outputValue).to.have.length.greaterThan(0);
    });
  });

  // trigger GraphQL operations using generated Documents
  cy.get('button[name="testGraphQLOperations"]').click();

  // verify that GraphQL operations successfully return results
  operationPrefixes.map((opPrefix) => {
    const outputField = cy.get(`textarea[name="${opPrefix}TodoResult"]`);
    outputField.invoke('val').then((outputValue) => {
      expect(outputValue).to.exist;
      expect(outputValue).to.have.length.greaterThan(0);
    });
  });
};
