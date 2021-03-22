"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preset = void 0;
const graphql_1 = require("graphql");
const path_1 = require("path");
const scalars_1 = require("./scalars");
const java_config_1 = require("./configs/java-config");
const APPSYNC_DATA_STORE_CODEGEN_TARGETS = ['java', 'swift', 'javascript', 'typescript', 'dart'];
const generateJavaPreset = (options, models) => {
    const config = [];
    const baseOutputDir = [options.baseOutputDir, ...java_config_1.GENERATED_PACKAGE_NAME.split('.')];
    models.forEach(model => {
        const modelName = model.name.value;
        config.push({
            ...options,
            filename: path_1.join(...baseOutputDir, `${modelName}.java`),
            config: {
                ...options.config,
                scalars: { ...scalars_1.JAVA_SCALAR_MAP, ...options.config.scalars },
                selectedType: modelName,
            },
        });
    });
    config.push({
        ...options,
        filename: path_1.join(...baseOutputDir, `${java_config_1.LOADER_CLASS_NAME}.java`),
        config: {
            ...options.config,
            scalars: { ...scalars_1.JAVA_SCALAR_MAP, ...options.config.scalars },
            generate: 'loader',
        },
    });
    return config;
};
const generateSwiftPreset = (options, models) => {
    const config = [];
    models.forEach(model => {
        const modelName = model.name.value;
        config.push({
            ...options,
            filename: path_1.join(options.baseOutputDir, `${modelName}.swift`),
            config: {
                ...options.config,
                scalars: { ...scalars_1.SWIFT_SCALAR_MAP, ...options.config.scalars },
                generate: 'code',
                selectedType: modelName,
            },
        });
        if (model.kind !== graphql_1.Kind.ENUM_TYPE_DEFINITION) {
            config.push({
                ...options,
                filename: path_1.join(options.baseOutputDir, `${modelName}+Schema.swift`),
                config: {
                    ...options.config,
                    target: 'swift',
                    scalars: { ...scalars_1.SWIFT_SCALAR_MAP, ...options.config.scalars },
                    generate: 'metadata',
                    selectedType: modelName,
                },
            });
        }
    });
    config.push({
        ...options,
        filename: path_1.join(options.baseOutputDir, `AmplifyModels.swift`),
        config: {
            ...options.config,
            scalars: { ...scalars_1.SWIFT_SCALAR_MAP, ...options.config.scalars },
            target: 'swift',
            generate: 'loader',
        },
    });
    return config;
};
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
const generateDartPreset = (options, models) => {
    const config = [];
    models.forEach(model => {
        const modelName = model.name.value;
        config.push({
            ...options,
            filename: path_1.join(options.baseOutputDir, `${modelName}.dart`),
            config: {
                ...options.config,
                scalars: { ...scalars_1.DART_SCALAR_MAP, ...options.config.scalars },
                selectedType: modelName,
            },
        });
    });
    config.push({
        ...options,
        filename: path_1.join(options.baseOutputDir, `ModelProvider.dart`),
        config: {
            ...options.config,
            scalars: { ...scalars_1.DART_SCALAR_MAP, ...options.config.scalars },
            generate: 'loader',
        },
    });
    return config;
};
exports.preset = {
    buildGeneratesSection: (options) => {
        const codeGenTarget = options.config.target;
        const models = options.schema.definitions.filter(t => t.kind === 'ObjectTypeDefinition' || (t.kind === 'EnumTypeDefinition' && !t.name.value.startsWith('__')));
        switch (codeGenTarget) {
            case 'java':
                return generateJavaPreset(options, models);
            case 'swift':
                return generateSwiftPreset(options, models);
            case 'javascript':
                return generateJavasScriptPreset(options, models);
            case 'typescript':
                return generateTypeScriptPreset(options, models);
            case 'dart':
                return generateDartPreset(options, models);
            default:
                throw new Error(`amplify-codegen-appsync-model-plugin not support language target ${codeGenTarget}. Supported codegen targets arr ${APPSYNC_DATA_STORE_CODEGEN_TARGETS.join(', ')}`);
        }
    },
};
//# sourceMappingURL=preset.js.map