const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails } = require('../utils');
const { generate } = require('@aws-amplify/graphql-types-generator');

export type GenerateTypesOptions = {
  schema: string;
  queries: string[];
  platform: string;
  only: string;
  target: string;
  appSyncApi: any;
  generatedFileName: string;
};
export async function generateTypes(options: GenerateTypesOptions) {
  const { schema, queries, target, platform } = options;
  if (platform === 'android') {
    throw new Error('Android not supported.');
  }

  return generate(schema, queries, '', target, {
    addTypename: true,
    complexObjectSupport: 'auto',
  });
}
