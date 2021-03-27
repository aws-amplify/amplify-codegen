import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema, parse, visit } from 'graphql';
import { RawAppSyncTypeConfig } from './visitors/appsync-visitor';

import { generateSource as generateTypescriptSource } from './typescript';
import { compileToLegacyIR } from './compiler/legacyIR';
import { loadSchema, loadAndMergeQueryDocuments } from './loading';

export const plugin: PluginFunction<RawAppSyncTypeConfig> = (
  schema: GraphQLSchema,
  rawDocuments: Types.DocumentFile[],
  config: RawAppSyncTypeConfig,
) => {
  const document = loadAndMergeQueryDocuments(config.temp, '');
  const context = compileToLegacyIR(schema, document, {
    addTypename: true,
    // complexObjectSupport: 'auto',
  });
  let output = generateTypescriptSource(context);

  return output;
};
