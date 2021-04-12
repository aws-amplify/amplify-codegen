'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.preset = void 0;
const path_1 = require('path');
const scalars_1 = require('./scalars');
const APPSYNC_DATA_STORE_CODEGEN_TARGETS = ['java', 'swift', 'javascript', 'typescript', 'dart'];
const generateTypeScriptPreset = (options, models) => {
  const config = [];
  const modelFolder = path_1.join(options.baseOutputDir, 'models');
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'index.ts'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
    },
  });
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'schema.ts'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'typescript',
    },
  });
  return config;
};
const generateJavasScriptPreset = (options, models) => {
  const config = [];
  const modelFolder = path_1.join(options.baseOutputDir, 'models');
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'index.js'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
    },
  });
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'index.d.ts'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      metadata: false,
      isDeclaration: true,
    },
  });
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'schema.js'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'javascript',
    },
  });
  config.push({
    ...options,
    filename: path_1.join(modelFolder, 'schema.d.ts'),
    config: {
      ...options.config,
      scalars: { ...scalars_1.TYPESCRIPT_SCALAR_MAP, ...options.config.scalars },
      target: 'metadata',
      metadataTarget: 'typeDeclaration',
    },
  });
  return config;
};
exports.preset = {
  buildGeneratesSection: options => {
    const codeGenTarget = options.config.target;
    const models = options.schema.definitions.filter(
      t => t.kind === 'ObjectTypeDefinition' || (t.kind === 'EnumTypeDefinition' && !t.name.value.startsWith('__')),
    );
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
//# sourceMappingURL=preset.js.map
