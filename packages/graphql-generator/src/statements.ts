const { GraphQLStatementsFormatter } = require('./utils');
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import type { GeneratedOperations } from '@aws-amplify/graphql-docs-generator';
import { GenerateStatementsOptions, Target, GeneratedOutput } from './type';
import { targetToFileExtensionMap } from './utils';

export function generateStatements(options: GenerateStatementsOptions): GeneratedOutput {
  const { schema, target, maxDepth = 2, typenameIntrospection = true } = options;

  if (!Object.keys(targetToFileExtensionMap).includes(target)) {
    throw new Error(`${target} is not supported a supported target.`);
  }

  const generatedOperations = generateGraphQLDocuments(schema, {
    maxDepth,
    useExternalFragmentForS3Object: target === 'graphql',
    typenameIntrospection,
  });
  if (!generatedOperations) {
    throw new Error('No GraphQL statements are generated. Check if the introspection schema has GraphQL operations defined.');
  }
  return generatedDocuments(target, generatedOperations);
}

function generatedDocuments(target: Target, generatedStatements: GeneratedOperations): GeneratedOutput {
  const fileExtension = targetToFileExtensionMap[target];
  const operations: ['queries', 'mutations', 'subscriptions'] = ['queries', 'mutations', 'subscriptions'];

  const statements = operations
    .filter(operation => generatedStatements[operation]?.size)
    .map(operation => {
      const operationStatements = generatedStatements[operation];
      const formattedStatements = new GraphQLStatementsFormatter(target).format(operationStatements);
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
