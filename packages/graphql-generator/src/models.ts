import * as path from 'path';
import { parse } from 'graphql';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
import { DefaultDirectives } from '@aws-amplify/graphql-directives';
import { codegen } from '@graphql-codegen/core';
import { ModelsTarget, GenerateModelsOptions, GeneratedOutput } from './typescript';
const { version: packageVersion } = require('../package.json');

const directiveDefinitions = DefaultDirectives.map(directive => directive.definition).join('\n');

export async function generateModels(options: GenerateModelsOptions): Promise<GeneratedOutput> {
  const {
    schema,
    target,
    directives = directiveDefinitions,
    isDataStoreEnabled,

    // feature flags
    generateIndexRules = true,
    emitAuthProvider = true,
    useExperimentalPipelinedTransformer = true,
    transformerVersion = true,
    respectPrimaryKeyAttributesOnConnectionField = true,
    improvePluralization = false,
    generateModelsForLazyLoadAndCustomSelectionSet = true,
    addTimestampFields = true,
    handleListNullabilityTransparently = true,
  } = options;

  const parsedSchema = parse(schema);

  const overrideOutputDir = '';
  const appsyncLocalConfig = await appSyncDataStoreCodeGen.preset.buildGeneratesSection({
    schema: parsedSchema,
    baseOutputDir: '',
    config: {
      target,
      directives,
      isDataStoreEnabled,
      isTimestampFieldsAdded: addTimestampFields,
      emitAuthProvider,
      generateIndexRules,
      handleListNullabilityTransparently,
      usePipelinedTransformer: useExperimentalPipelinedTransformer,
      transformerVersion,
      respectPrimaryKeyAttributesOnConnectionField,
      improvePluralization,
      generateModelsForLazyLoadAndCustomSelectionSet,
      codegenVersion: packageVersion,
      overrideOutputDir,
    },
    presetConfig: {
      overrideOutputDir,
      target,
    },
    plugins: [
      {
        appSyncLocalCodeGen: {},
      },
    ],
    pluginMap: {
      appSyncLocalCodeGen: appSyncDataStoreCodeGen,
    },
    documents: [],
  });

  return Promise.all(
    appsyncLocalConfig.map(async config => {
      const content = await codegen(config);

      // set the keys to always use posix path separators
      // Fallback to \ because path.win32 is not implemented by path-browserify
      return { [config.filename.split(path.win32?.sep || '\\').join(path.posix.sep)]: content };
    }),
  ).then((outputs: GeneratedOutput[]) => outputs.reduce((curr, next) => ({ ...curr, ...next }), {}));
}
