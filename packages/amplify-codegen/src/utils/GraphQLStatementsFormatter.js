const prettier = require('prettier');

const CODEGEN_WARNING = 'this is an auto generated file. This will be overwritten';
const LINE_DELIMITOR = '\n';

/**
 * Utility class to format the generated GraphQL statements based on frontend language type
 */
class GraphQLStatementsFormatter {
  constructor(language) {
    this.language = language || 'graphql';
    this.lintOverrides = [];
    this.headerComments = [];
  }

  format(statements) {
    switch (this.language) {
      case 'javascript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push('/* eslint-disable */');
        return this.prettify(this.formatJS(statements));
      case 'typescript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push([
          '/* tslint:disable */',
          '/* eslint-disable */'
        ]);
        return this.prettify(this.formatJS(statements));
      case 'flow':
        this.headerComments.push('@flow', CODEGEN_WARNING);
        this.lintOverrides.push('/* eslint-disable */');
        return this.prettify(this.formatJS(statements));
      default:
        this.headerComments.push(CODEGEN_WARNING);
        return this.prettify(this.formatGraphQL(statements));
    }
  }

  formatGraphQL(statements) {
    const headerBuffer = this.headerComments.map( comment => `# ${comment}`).join(LINE_DELIMITOR);
    const statementsBuffer = [...statements?.values()].join(LINE_DELIMITOR);
    const formattedOutput = [headerBuffer, statementsBuffer].join(LINE_DELIMITOR);
    return formattedOutput;
  }

  formatJS(statements) {
    const headerBuffer = this.headerComments.map( comment => `// ${comment}`).join(LINE_DELIMITOR);
    const formattedStatements = [];
    for (const [key, value] of statements) {
      formattedStatements.push(
        `export const ${key} = /* GraphQL */ \`${value}\``
      );
    }
    const formattedOutput = [headerBuffer, ...formattedStatements].join(LINE_DELIMITOR);
    return formattedOutput;
  }

  prettify(output) {
    const parserMap = {
      javascript: 'babel',
      graphql: 'graphql',
      typescript: 'typescript',
      flow: 'flow',
      angular: 'graphql',
    };
    return prettier.format(output, { parser: parserMap[this.language || 'graphql'] });
  }
}

module.exports = { GraphQLStatementsFormatter };
