import { Types } from '@graphql-codegen/plugin-helpers';
import { Kind, TypeDefinitionNode } from 'graphql';
import { join } from 'path';
import { JAVA_SCALAR_MAP, SWIFT_SCALAR_MAP, TYPESCRIPT_SCALAR_MAP, DART_SCALAR_MAP, METADATA_SCALAR_MAP } from './scalars';
import { LOADER_CLASS_NAME, GENERATED_PACKAGE_NAME } from './configs/java-config';
import { graphqlName, toUpper } from 'graphql-transformer-common';
import { SyncTypes } from './types/sync';

const APPSYNC_DATA_STORE_CODEGEN_TARGETS = ['java', 'swift', 'javascript', 'typescript', 'dart', 'introspection'];

export type Target = 'java' | 'swift' | 'javascript' | 'typescript' | 'dart' | 'introspection';

export type AppSyncModelCodeGenPresetConfig = {
  /**
   * @name target
   * @type string
   * @description Required, target language for codegen
   *
   * @example
   * ```yml
   * generates:
   * Models:
   *  preset: amplify-codegen-appsync-model-plugin
   *  presetConfig:
   *    target: java
   *  plugins:
   *    - amplify-codegen-appsync-model-plugin
   * ```
   */
  overrideOutputDir: string | null;
  target: Target;
  isDataStoreEnabled?: boolean;
};

type GenerateOptions = Omit<SyncTypes.GenerateOptions, 'cache' | 'pluginMap'>;
type PresetFnArgs = Omit<SyncTypes.PresetFnArgs<AppSyncModelCodeGenPresetConfig>, 'cache' | 'pluginMap'>;

const generateJavaPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
  manyToManyJoinModels: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  const modelFolder = options.config.overrideOutputDir
    ? [options.config.overrideOutputDir]
    : [options.baseOutputDir, ...GENERATED_PACKAGE_NAME.split('.')];

  // Only generate lazy models if feature flag enabled and datastore is not being used.
  const generateAPILazyModels = options.config.generateModelsForLazyLoadAndCustomSelectionSet && !options.config.isDataStoreEnabled

  // Class loader
  config.push({
    ...options,
    filename: join(...modelFolder, `${LOADER_CLASS_NAME}.java`),
    config: {
      ...options.config,
      scalars: { ...JAVA_SCALAR_MAP, ...options.config.scalars },
      generate: 'loader',
    },
  });

  models.forEach(model => {
    const modelName = model.name.value;
    config.push({
      ...options,
      filename: join(...modelFolder, `${modelName}.java`),
      config: {
        ...options.config,
        scalars: { ...JAVA_SCALAR_MAP, ...options.config.scalars },
        selectedType: modelName,
      },
    });

    // Create ModelPath's only if lazy models are generated
    if (generateAPILazyModels) {
      // Create ModelPath if type is @model
      if (model?.directives?.find((directive) => directive?.name?.value === 'model')) {
        config.push({
          ...options,
          filename: join(...modelFolder, `${modelName}Path.java`),
          config: {
            ...options.config,
            scalars: { ...JAVA_SCALAR_MAP, ...options.config.scalars },
            generate: 'metadata',
            selectedType: modelName,
          },
        });
      }
    }
  });

  // Create ModelPath's only if lazy models are generated
  if (generateAPILazyModels) {
    manyToManyJoinModels.forEach(joinModel => {
      config.push({
        ...options,
        filename: join(...modelFolder, `${joinModel.name.value}Path.java`),
        config: {
          ...options.config,
          scalars: {...JAVA_SCALAR_MAP, ...options.config.scalars},
          generate: 'metadata',
          selectedType: joinModel.name.value,
        },
      });
    });
  };

  return config;
};

const generateSwiftPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  const modelFolder = options.config.overrideOutputDir ? options.config.overrideOutputDir : options.baseOutputDir;
  models.forEach(model => {
    const modelName = model.name.value;
    config.push({
      ...options,
      filename: join(modelFolder, `${modelName}.swift`),
      config: {
        ...options.config,
        scalars: { ...SWIFT_SCALAR_MAP, ...options.config.scalars },
        generate: 'code',
        selectedType: modelName,
      },
    });
    if (model.kind !== Kind.ENUM_TYPE_DEFINITION) {
      config.push({
        ...options,
        filename: join(modelFolder, `${modelName}+Schema.swift`),
        config: {
          ...options.config,
          target: 'swift',
          scalars: { ...SWIFT_SCALAR_MAP, ...options.config.scalars },
          generate: 'metadata',
          selectedType: modelName,
        },
      });
    }
  });

  // class loader
  config.push({
    ...options,
    filename: join(modelFolder, `AmplifyModels.swift`),
    config: {
      ...options.config,
      scalars: { ...SWIFT_SCALAR_MAP, ...options.config.scalars },
      target: 'swift',
      generate: 'loader',
    },
  });
  return config;
};

const generateTypeScriptPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  const modelFolder = options.config.overrideOutputDir ? options.config.overrideOutputDir : join(options.baseOutputDir);
  config.push({
    ...options,
    filename: join(modelFolder, 'index.ts'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
    },
  });
  // metadata
  config.push({
    ...options,
    filename: join(modelFolder, 'schema.ts'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'typescript',
    },
  });
  return config;
};

const generateJavasScriptPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  const modelFolder = options.config.overrideOutputDir ? options.config.overrideOutputDir : join(options.baseOutputDir);
  config.push({
    ...options,
    filename: join(modelFolder, 'index.js'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
    },
  });

  //indx.d.ts
  config.push({
    ...options,
    filename: join(modelFolder, 'index.d.ts'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
      isDeclaration: true,
    },
  });
  // metadata schema.js
  config.push({
    ...options,
    filename: join(modelFolder, 'schema.js'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'javascript',
    },
  });

  // schema.d.ts
  config.push({
    ...options,
    filename: join(modelFolder, 'schema.d.ts'),
    config: {
      ...options.config,
      scalars: { ...TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'typeDeclaration',
    },
  });
  return config;
};

const generateDartPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  const modelFolder = options.config.overrideOutputDir ?? options.baseOutputDir;
  models.forEach(model => {
    const modelName = model.name.value;
    config.push({
      ...options,
      filename: join(modelFolder, `${modelName}.dart`),
      config: {
        ...options.config,
        scalars: { ...DART_SCALAR_MAP, ...options.config.scalars },
        selectedType: modelName,
      },
    });
  });
  // Class loader
  config.push({
    ...options,
    filename: join(modelFolder, `ModelProvider.dart`),
    config: {
      ...options.config,
      scalars: { ...DART_SCALAR_MAP, ...options.config.scalars },
      generate: 'loader',
    },
  });
  return config;
};

const generateManyToManyModelStubs = (options: PresetFnArgs): TypeDefinitionNode[] => {
  let models = new Array<TypeDefinitionNode>();
  let manyToManySet = new Set<string>();
  options.schema.definitions.forEach(def => {
    if (def.kind === 'ObjectTypeDefinition') {
      def?.fields?.forEach(field => {
        field?.directives?.forEach(dir => {
          if (dir?.name?.value === 'manyToMany') {
            dir?.arguments?.forEach(arg => {
              if (arg.name.value === 'relationName' && arg.value.kind === 'StringValue') {
                manyToManySet.add(graphqlName(toUpper(arg.value.value)));
              }
            });
          }
        });
      });
    }
  });
  manyToManySet.forEach(modelName => {
    models.push({
      kind: 'ObjectTypeDefinition',
      name: {
        kind: 'Name',
        value: modelName,
      },
    });
  });
  return models;
};

const generateIntrospectionPreset = (
  options: PresetFnArgs,
  models: TypeDefinitionNode[],
): GenerateOptions[] => {
  const config: GenerateOptions[] = [];
  // model-intropection.json
  config.push({
    ...options,
    filename: join(options.config.overrideOutputDir!, 'model-introspection.json'),
    config: {
      ...options.config,
      scalars: { ...METADATA_SCALAR_MAP, ...options.config.scalars },
      target: 'introspection',
    },
  });
  return config;
};

const buildGenerations = (options: PresetFnArgs): GenerateOptions[] => {
    const codeGenTarget = options.config.target;
    const typesToSkip: string[] = ['Query', 'Mutation', 'Subscription'];
    const models: TypeDefinitionNode[] = options.schema.definitions.filter(
      t =>
        (t.kind === 'ObjectTypeDefinition' && !typesToSkip.includes(t.name.value)) ||
        (t.kind === 'EnumTypeDefinition' && !t.name.value.startsWith('__')),
    ) as any;
    const manyToManyModels = generateManyToManyModelStubs(options);
    if (options.config.usePipelinedTransformer || options.config.transformerVersion === 2) {
      models.push(...manyToManyModels);
    }

    switch (codeGenTarget) {
      case 'java':
        return generateJavaPreset(options, models, manyToManyModels);
      case 'swift':
        return generateSwiftPreset(options, models);
      case 'javascript':
        return generateJavasScriptPreset(options, models);
      case 'typescript':
        return generateTypeScriptPreset(options, models);
      case 'dart':
        return generateDartPreset(options, models);
      case 'introspection':
        return generateIntrospectionPreset(options, models);
      default:
        throw new Error(
          `amplify-codegen-appsync-model-plugin not support language target ${codeGenTarget}. Supported codegen targets are ${APPSYNC_DATA_STORE_CODEGEN_TARGETS.join(
            ', ',
          )}`,
        );
    }
  };

export const presetSync: SyncTypes.OutputPreset<AppSyncModelCodeGenPresetConfig> = {
  buildGeneratesSection: (options: SyncTypes.PresetFnArgs<AppSyncModelCodeGenPresetConfig>): SyncTypes.GenerateOptions[] => {
    const {cache, pluginMap, ...otherOptions} = options;

    return buildGenerations(otherOptions).map((config: GenerateOptions) => ({
      pluginMap,
      cache,
      ...config,
    }))
  }
}

export const preset: Types.OutputPreset<AppSyncModelCodeGenPresetConfig> = {
  buildGeneratesSection: (options: Types.PresetFnArgs<AppSyncModelCodeGenPresetConfig>): Types.GenerateOptions[] => {
    const {cache, pluginMap, ...otherOptions} = options;

    return buildGenerations(otherOptions).map((config: GenerateOptions) => ({
      pluginMap,
      cache,
      ...config,
    }))
  }
}
