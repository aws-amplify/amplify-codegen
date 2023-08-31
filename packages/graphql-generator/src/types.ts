import * as path from 'path';
import { generate, generateFromString } from '@aws-amplify/graphql-types-generator';
import { GenerateTypesOptions, GeneratedOutput } from './typescript';

export async function generateTypes(options: GenerateTypesOptions): Promise<void> {
  const { schema, target, queries, outputPath, multipleSwiftFiles = true, introspection = false } = options;

  // write to FS
  await generateFromString(schema, introspection, queries, outputPath, target, multipleSwiftFiles, {
    addTypename: true,
    complexObjectSupport: 'auto',
  });
}
