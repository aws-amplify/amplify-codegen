import { generate, generateTypes as generateTypesHelper } from '@aws-amplify/graphql-types-generator';
import { GenerateTypesOptions, GeneratedOutput } from './type';

export async function generateTypes(options: GenerateTypesOptions): Promise<GeneratedOutput> {
  const { schema, queries, target, platform, only, multipleFiles = true, introspection = false } = options;
  if (platform === 'android') {
    throw new Error('Android not supported.');
  }

  return generateTypesHelper(schema, introspection, queries, '', target, multipleFiles, {
    addTypename: true,
    complexObjectSupport: 'auto',
  });
}
