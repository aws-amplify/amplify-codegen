import { parse } from 'graphql';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
import { codegen } from '@graphql-codegen/core';
const { version: packageVersion } = require('../package.json');

const platformToLanguageMap: { [platform: string]: 'java' | 'swift' | 'dart' | 'javascript' | 'introspection' } = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
  introspection: 'introspection',
};

const defaultGenerateModelsOption = {
  overrideOutputDir: null,
  isIntrospection: false,
  writeToDisk: true,
};

export type GenerateModelsOptions = {
  schema: string;
  platform: 'android' | 'ios' | 'flutter' | 'javascript' | 'introspection';
  directiveDefinitions: any;

  // feature flags
  generateIndexRules?: boolean;
  emitAuthProvider?: boolean;
  useExperimentalPipelinedTranformer?: boolean;
  transformerVersion?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
  generateModelsForLazyLoadAndCustomSelectionSet?: boolean;
  addTimestampFields?: boolean;
  handleListNullabilityTransparently?: boolean;
};

export async function generateModels(options: GenerateModelsOptions): Promise<string[]> {
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

  // steps:
  // 1. Load the schema and validate using transformer
  // 2. get all the directives supported by transformer
  // 3. Generate code

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
    appsyncLocalConfig.map(cfg => {
      return codegen({
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
    }),
  );
}

async function validateSchema(schema: string) {
  // TODO: do something
}
