import React from 'react';
import App from './App';

describe('graphql-generator does not crash in browser', () => {
  beforeEach(() => {
    cy.mount(<App />);
  });

  const testCases = [
    'generate-models-java',
    'generate-models-javascript',
    'generate-models-typescript',
    'generate-models-dart',
    'generate-models-introspection',
  ];

  testCases.forEach((testCase) => {
    it(testCase, {}, () => {
      cy.get(`#${testCase}_button`).click();
      cy.get(`#${testCase}_result`).contains('✅', { timeout: 5000 });
    });
  });
});
