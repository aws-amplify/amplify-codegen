const { GraphQLStatementsFormatter } = require('./utils');
import { generateGraphQLDocuments, GeneratedOperations } from '@aws-amplify/graphql-docs-generator';

const targetToFileExtensionMap: { [target: string]: 'js' | 'graphql' | 'ts' | 'graphl' } = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
};

type Target = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';

export type GenerateStatementsOptions = {
  schema: string;
  appSyncApi: any;
  target: Target;
  maxDepth: number;
  typenameIntrospection: boolean;
};

export function generateStatements(options: GenerateStatementsOptions): { filepath: string; contents: string }[] {
  const { schema, appSyncApi, target, maxDepth = 2, typenameIntrospection = true } = options;

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

function generatedDocuments(target: Target, generatedStatements: GeneratedOperations): { filepath: string; contents: string }[] {
  const fileExtension = targetToFileExtensionMap[target];
  const operations: ['queries', 'mutations', 'subscriptions'] = ['queries', 'mutations', 'subscriptions'];

  const statements = operations
    .filter(operation => generatedStatements[operation]?.size)
    .map(operation => {
      const operationStatements = generatedStatements[operation];
      const formattedStatements = new GraphQLStatementsFormatter(target).format(operationStatements);
      const filepath = `${operation}.${fileExtension}`;
      return {
        filepath,
        contents: formattedStatements,
      };
    });

  if (fileExtension === 'graphql') {
    // External Fragments are rendered only for GraphQL targets
    const { fragments } = generatedStatements;
    if (fragments.size) {
      const formattedStatements = new GraphQLStatementsFormatter(target).format(fragments);
      const filepath = 'fragments.graphql';
      return [
        ...statements,
        {
          filepath,
          contents: formattedStatements,
        },
      ];
    }
  }

  return statements;
}
