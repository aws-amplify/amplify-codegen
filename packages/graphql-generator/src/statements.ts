const { GraphQLStatementsFormatter } = require('./utils');
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import type { GeneratedOperations, GraphQLWithMeta } from '@aws-amplify/graphql-docs-generator';
import { GenerateStatementsOptions, StatementsTarget, GeneratedOutput } from './typescript';
import { statementsTargetToFileExtensionMap } from './utils';

export function generateStatements(options: GenerateStatementsOptions): GeneratedOutput {
  const { schema, target, maxDepth = 2, typenameIntrospection = true, relativeTypesPath } = options;

  if (!Object.keys(statementsTargetToFileExtensionMap).includes(target)) {
    throw new Error(`${target} is not a supported target.`);
  }

  const generatedOperations = generateGraphQLDocuments(schema, {
    maxDepth,
    useExternalFragmentForS3Object: target === 'graphql',
    typenameIntrospection,
    includeMetaData: true,
  });
  return generatedOperationsToOutput(target, generatedOperations, relativeTypesPath);
}

function generatedOperationsToOutput(target: StatementsTarget, generatedStatements: GeneratedOperations<GraphQLWithMeta>, relativeTypesPath?: string): GeneratedOutput {
  const fileExtension = statementsTargetToFileExtensionMap[target];
  const operations: ['queries', 'mutations', 'subscriptions'] = ['queries', 'mutations', 'subscriptions'];

  const statements = operations
    .filter(operation => generatedStatements[operation]?.size)
    .map(operation => {
      const operationStatements = generatedStatements[operation];
      const formattedStatements = new GraphQLStatementsFormatter(target, operation, relativeTypesPath).format(operationStatements);
      const filepath = `${operation}.${fileExtension}`;
      return {
        [filepath]: formattedStatements,
      };
    })
    .reduce((curr, next) => ({ ...curr, ...next }), {});

  if (fileExtension === 'graphql') {
    // External Fragments are rendered only for GraphQL targets
    const { fragments } = generatedStatements;
    if (fragments.size) {
      const formattedStatements = new GraphQLStatementsFormatter(target).format(fragments);
      const filepath = 'fragments.graphql';
      return {
        ...statements,
        [filepath]: formattedStatements,
      };
    }
  }

  return statements;
}
