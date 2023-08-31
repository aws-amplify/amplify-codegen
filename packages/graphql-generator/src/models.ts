import * as fs from 'fs-extra';
import { parse } from 'graphql';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
import { codegen } from '@graphql-codegen/core';
import { ModelsTarget, GenerateModelsOptions, GeneratedOutput } from './typescript';
const { version: packageVersion } = require('../package.json');

export async function generateModels(options: GenerateModelsOptions): Promise<void> {
  const {
    schema,
    target,
    directives,
    outputDir,

    // feature flags
    generateIndexRules = true,
    emitAuthProvider = true,
    useExperimentalPipelinedTranformer = true,
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
    baseOutputDir: outputDir,
    config: {
      target,
      directives,
      isTimestampFieldsAdded: addTimestampFields,
      emitAuthProvider,
      generateIndexRules,
      handleListNullabilityTransparently,
      usePipelinedTransformer: useExperimentalPipelinedTranformer,
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

  await Promise.all(
    appsyncLocalConfig.map(async config => {
      const { filename } = config;
      codegen(config);
      fs.outputFileSync(filename, await codegen(config));
    }),
  );
}
