import { parse } from 'graphql';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
import { codegen } from '@graphql-codegen/core';
import { Platform, Language, GenerateModelsOptions, GeneratedOutput } from './type';
import { platformToLanguageMap } from './utils';
const { version: packageVersion } = require('../package.json');

export async function generateModels(options: GenerateModelsOptions): Promise<GeneratedOutput> {
  const {
    schema,
    platform,
    directiveDefinitions,

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

  await validateSchema(schema);
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
      target: platformToLanguageMap[platform],
      directives: directiveDefinitions,
      isTimestampFieldsAdded: addTimestampFields,
      emitAuthProvider,
      generateIndexRules,
      handleListNullabilityTransparently,
      usePipelinedTransformer: useExperimentalPipelinedTranformer,
      transformerVersion,
      respectPrimaryKeyAttributesOnConnectionField,
      generateModelsForLazyLoadAndCustomSelectionSet,
      codegenVersion: packageVersion,
    },
    plugins: [],
    pluginMap: {},
    presetConfig: {
      overrideOutputDir: null,
      target: platformToLanguageMap[platform],
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

async function validateSchema(schema: string) {
  // TODO: do something
}
