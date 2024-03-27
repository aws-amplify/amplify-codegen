import * as path from 'path';
import { generate, generateFromString } from '@aws-amplify/graphql-types-generator';
import { GenerateTypesOptions, GeneratedOutput } from './typescript';

export async function generateTypes(options: GenerateTypesOptions): Promise<GeneratedOutput> {
  const { schema, target, queries, multipleSwiftFiles = false, introspection = false, amplifyJsLibraryVersion } = options;

  const generatedOutput = await generateFromString(schema, introspection, queries, target, multipleSwiftFiles, {
    addTypename: true,
    complexObjectSupport: 'auto',
    amplifyJsLibraryVersion,
  });

  return Object.fromEntries(Object.entries(generatedOutput).map(([filepath, contents]) => [path.basename(filepath), contents]));
}
