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

    // TODO: get correct default values
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

  // TODO: get current flutter version
  /*
  if (platform === 'flutter' && !validateAmplifyFlutterMinSupportedVersion(projectRoot)) {
    throw new Error('Amplify Flutter versions prior to 0.6.0 are no longer supported by codegen. Please upgrade to use codegen.');
  }
  */

  const appsyncLocalConfig = await appSyncDataStoreCodeGen.preset.buildGeneratesSection({
    schema: parsedSchema,
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
      overrideOutputDir: target === 'introspection' ? '' : undefined,
    },
    plugins: [],
    pluginMap: {},
    presetConfig: {
      overrideOutputDir: '',
      // not used, make ts happy
      target: 'javascript',
    },
    documents: [],
    baseOutputDir: '',
  });

  return Promise.all(
    appsyncLocalConfig.map(async cfg => {
      const content = await codegen({
        ...cfg,
        plugins: [
          {
            appSyncLocalCodeGen: {},
          },
        ],
        pluginMap: {
          appSyncLocalCodeGen: appSyncDataStoreCodeGen,
        },
      });
      return { [cfg.filename]: content };
    }),
  ).then((outputs: GeneratedOutput[]) => outputs.reduce((curr, next) => ({ ...curr, ...next }), {}));
}
