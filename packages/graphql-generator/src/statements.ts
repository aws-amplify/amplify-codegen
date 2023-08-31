import * as path from 'path';
import * as fs from 'fs-extra';
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import type { GeneratedOperations, GraphQLWithMeta } from '@aws-amplify/graphql-docs-generator';
import { GenerateStatementsOptions, StatementsTarget, GeneratedOutput } from './typescript';
import { statementsTargetToFileExtensionMap, GraphQLStatementsFormatter } from './utils';

export function generateStatements(options: GenerateStatementsOptions): void {
  const { schema, target, outputDir, maxDepth = 2, typenameIntrospection = true, relativeTypesPath } = options;

  if (!Object.keys(statementsTargetToFileExtensionMap).includes(target)) {
    throw new Error(`${target} is not a supported target.`);
  }

  const generatedOperations = generateGraphQLDocuments(schema, {
    maxDepth,
    useExternalFragmentForS3Object: target === 'graphql',
    typenameIntrospection,
    includeMetaData: true,
  });
  writeGeneratedDocuments(target, generatedOperations, outputDir, relativeTypesPath);
}

async function writeGeneratedDocuments(target: StatementsTarget, generatedStatements: GeneratedOperations<GraphQLWithMeta>, outputDir: string, relativeTypesPath?: string) {
  const fileExtension = statementsTargetToFileExtensionMap[target];
  const operations: ['queries', 'mutations', 'subscriptions'] = ['queries', 'mutations', 'subscriptions'];

  operations.forEach(op => {
    const ops = generatedStatements[op];
    if (ops && ops.size) {
      const formattedStatements = new GraphQLStatementsFormatter(target, op, relativeTypesPath).format(ops);
      const outputFile = path.resolve(path.join(outputDir, `${op}.${fileExtension}`));
      fs.outputFileSync(outputFile, formattedStatements);
    }
  });

  if (fileExtension === 'graphql') {
    // External Fragments are rendered only for GraphQL targets
    const fragments = generatedStatements['fragments'];
    if (fragments.size) {
      const formattedStatements = new GraphQLStatementsFormatter(target).formatGraphQL(fragments);
      const outputFile = path.resolve(path.join(outputDir, 'fragments.graphql'));
      fs.outputFileSync(outputFile, formattedStatements);
    }
  }
}
