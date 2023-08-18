import { generate, generateTypes as generateTypesHelper } from '@aws-amplify/graphql-types-generator';
import { GenerateTypesOptions, GeneratedOutput } from './typescript';

export async function generateTypes(options: GenerateTypesOptions): Promise<GeneratedOutput> {
  const { schema, target, only = '', queries = [], multipleFiles = true, introspection = false } = options;

  return generateTypesHelper(schema, introspection, queries, only, target, multipleFiles, {
    addTypename: true,
    complexObjectSupport: 'auto',
  });
}
