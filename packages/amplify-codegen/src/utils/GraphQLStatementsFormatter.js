const prettier = require('prettier');
const {
  interfaceNameFromOperation,
  interfaceVariablesNameFromOperation,
} = require('@aws-amplify/graphql-types-generator/lib/typescript/codeGeneration');

const CODEGEN_WARNING = 'this is an auto generated file. This will be overwritten';
const LINE_DELIMITOR = '\n';

/**
 * Utility class to format the generated GraphQL statements based on frontend language type
 */
class GraphQLStatementsFormatter {
  constructor(language, op, typesPath) {
    this.language = language || 'graphql';
    this.opTypeName = {
      queries: 'Query',
      mutations: 'Mutation',
      subscriptions: 'Subscription',
    }[op];
    this.lintOverrides = [];
    this.headerComments = [];
    this.typesPath = typesPath ? typesPath.replace(/.ts/i, '') : null;
  }

  get typeDefs() {
    if (this.language === 'typescript' && this.opTypeName && this.typesPath) {
      return [
        `import * as APITypes from '${this.typesPath}';`,
        `type Generated${this.opTypeName}<InputType, OutputType> = string & {`,
        `  __generated${this.opTypeName}Input: InputType;`,
        `  __generated${this.opTypeName}Output: OutputType;`,
        `};`,
      ].join(LINE_DELIMITOR);
    }
    return '';
  }

  format(statements) {
    switch (this.language) {
      case 'javascript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push('/* eslint-disable */');
        return this.prettify(this.formatJS(statements));
      case 'typescript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push(...['/* tslint:disable */', '/* eslint-disable */']);
        return this.prettify(this.formatJS(statements));
      case 'flow':
        this.headerComments.push('@flow', CODEGEN_WARNING);
        return this.prettify(this.formatJS(statements));
      default:
        this.headerComments.push(CODEGEN_WARNING);
        return this.prettify(this.formatGraphQL(statements));
    }
  }

  formatGraphQL(statements) {
    const headerBuffer = this.headerComments.map(comment => `# ${comment}`).join(LINE_DELIMITOR);
    const statementsBuffer = statements ? [...statements.values()].map(s => s.graphql).join(LINE_DELIMITOR) : '';
    const formattedOutput = [headerBuffer, LINE_DELIMITOR, statementsBuffer].join(LINE_DELIMITOR);
    return formattedOutput;
  }

  formatJS(statements) {
    const lintOverridesBuffer = this.lintOverrides.join(LINE_DELIMITOR);
    const headerBuffer = this.headerComments.map(comment => `// ${comment}`).join(LINE_DELIMITOR);
    const formattedStatements = [];
    if (statements) {
      for (const [key, { graphql, operationName, operationType }] of statements) {
        const typeTag = this.buildTypeTag(operationName, operationType);
        formattedStatements.push(`export const ${key} = /* GraphQL */ \`${graphql}\`${typeTag}`);
      }
    }
    const formattedOutput = [lintOverridesBuffer, headerBuffer, LINE_DELIMITOR, this.typeDefs, LINE_DELIMITOR, ...formattedStatements].join(
      LINE_DELIMITOR,
    );
    return formattedOutput;
  }

  buildTypeTag(operationName, operationType) {
    if (!operationType || !this.typesPath || this.language !== 'typescript') return '';

    const resultTypeName = `APITypes.${interfaceNameFromOperation({
      operationName,
      operationType,
    })}`;

    const variablesTypeName = `APITypes.${interfaceVariablesNameFromOperation({
      operationName,
      operationType,
    })}`;

    return ` as Generated${this.opTypeName}<
      ${variablesTypeName},
      ${resultTypeName}
    >;`;
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
