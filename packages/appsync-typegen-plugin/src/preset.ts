import { Types } from '@graphql-codegen/plugin-helpers';
import { Kind, TypeDefinitionNode } from 'graphql';
import { join } from 'path';
import { TYPESCRIPT_SCALAR_MAP } from './scalars';

const APPSYNC_DATA_STORE_CODEGEN_TARGETS = ['java', 'swift', 'javascript', 'typescript', 'dart'];

export type AppSyncTypeCodeGenPresetConfig = {
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
  target: 'java' | 'swift' | 'javascript' | 'typescript' | 'dart';
};

const generateTypeScriptPreset = (
  options: Types.PresetFnArgs<AppSyncTypeCodeGenPresetConfig>,
  models: TypeDefinitionNode[],
): Types.GenerateOptions[] => {
  const config: Types.GenerateOptions[] = [];
  const modelFolder = join(options.baseOutputDir, 'models');
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
  options: Types.PresetFnArgs<AppSyncTypeCodeGenPresetConfig>,
  models: TypeDefinitionNode[],
): Types.GenerateOptions[] => {
  const config: Types.GenerateOptions[] = [];
  const modelFolder = join(options.baseOutputDir, 'models');
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

export const preset: Types.OutputPreset<AppSyncTypeCodeGenPresetConfig> = {
  buildGeneratesSection: (options: Types.PresetFnArgs<AppSyncTypeCodeGenPresetConfig>): Types.GenerateOptions[] => {
    const codeGenTarget = options.config.target;

    const models: TypeDefinitionNode[] = options.schema.definitions.filter(
      t => t.kind === 'ObjectTypeDefinition' || (t.kind === 'EnumTypeDefinition' && !t.name.value.startsWith('__')),
    ) as any;

    switch (codeGenTarget) {
      case 'javascript':
        return generateJavasScriptPreset(options, models);
      case 'typescript':
        return generateTypeScriptPreset(options, models);
      default:
        throw new Error(
          `amplify-codegen-appsync-model-plugin not support language target ${codeGenTarget}. Supported codegen targets arr ${APPSYNC_DATA_STORE_CODEGEN_TARGETS.join(
            ', ',
          )}`,
        );
    }
  },
};
