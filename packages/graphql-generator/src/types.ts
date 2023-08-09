import { generate, generateTypes as generateTypesHelper } from '@aws-amplify/graphql-types-generator';
import { GenerateTypesOptions, GeneratedOutput } from './type';

export async function generateTypes(options: GenerateTypesOptions): Promise<GeneratedOutput> {
  const { schema, authDirective, queries, target, only, multipleFiles = true, introspection = false } = options;

  return generateTypesHelper(schema, introspection, authDirective, queries, only, target, multipleFiles, {
    addTypename: true,
    complexObjectSupport: 'auto',
  });
}
