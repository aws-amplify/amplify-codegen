import { parse } from 'graphql';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
import { codegen } from '@graphql-codegen/core';
import { ModelsTarget, GenerateModelsOptions, GeneratedOutput } from './typescript';
const { version: packageVersion } = require('../package.json');

export async function generateModels(options: GenerateModelsOptions): Promise<GeneratedOutput> {
  const {
    schema,
    target,
    directives,

    // feature flags
    generateIndexRules = true,
    emitAuthProvider = true,
    useExperimentalPipelinedTransformer = true,
    transformerVersion = true,
    respectPrimaryKeyAttributesOnConnectionField = true,
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
      isTimestampFieldsAdded: addTimestampFields,
      emitAuthProvider,
      generateIndexRules,
      handleListNullabilityTransparently,
      usePipelinedTransformer: useExperimentalPipelinedTransformer,
      transformerVersion,
      respectPrimaryKeyAttributesOnConnectionField,
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
      return { [config.filename]: content };
    }),
  ).then((outputs: GeneratedOutput[]) => outputs.reduce((curr, next) => ({ ...curr, ...next }), {}));
}
