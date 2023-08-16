const path = require('path');
const fs = require('fs-extra');
const { parse } = require('graphql');
const glob = require('glob-all');
const { FeatureFlags, pathManager } = require('@aws-amplify/amplify-cli-core');
const { generateModels: generateModelsHelper } = require('@aws-amplify/graphql-generator');
const { validateAmplifyFlutterMinSupportedVersion } = require('../utils/validateAmplifyFlutterMinSupportedVersion');

const platformToLanguageMap = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
};

/**
 * Returns feature flag value, default to `false`
 * @param {string} key feature flag id
 * @returns
 */
const readFeatureFlag = key => {
  let flagValue = false;
  try {
    flagValue = FeatureFlags.getBoolean(key);
  } catch (err) {
    flagValue = false;
  }
  return flagValue;
};

/**
 * Returns feature flag value, default to `1`
 * @param {string} key feature flag id
 * @returns
 */
const readNumericFeatureFlag = key => {
  try {
    return FeatureFlags.getNumber(key);
  } catch (err) {
    return 1;
  }
};

// type GenerateModelsOptions = {
//   overrideOutputDir?: String;
//   isIntrospection: Boolean;
//   writeToDisk: Boolean;
// }

const defaultGenerateModelsOption = {
  overrideOutputDir: null,
  isIntrospection: false,
  writeToDisk: true,
};

async function generateModels(context, generateOptions = null) {
  const { overrideOutputDir, isIntrospection, writeToDisk } = generateOptions
    ? { ...defaultGenerateModelsOption, ...generateOptions }
    : defaultGenerateModelsOption;

  // steps:
  // 1. Load the schema and validate using transformer
  // 2. get all the directives supported by transformer
  // 3. Generate code
  let projectRoot;
  try {
    context.amplify.getProjectMeta();
    projectRoot = context.amplify.getEnvInfo().projectPath;
  } catch (e) {
    projectRoot = process.cwd();
  }

  const allApiResources = await context.amplify.getResourceStatus('api');
  const apiResource = allApiResources.allResources.find(
    resource => resource.service === 'AppSync' && resource.providerPlugin === 'awscloudformation',
  );

  if (!apiResource) {
    context.print.info('No AppSync API configured. Please add an API');
    return;
  }

  await validateSchema(context);
  const backendPath = await context.amplify.pathManager.getBackendDirPath();
  const apiResourcePath = path.join(backendPath, 'api', apiResource.resourceName);

  const directiveDefinitions = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
    resourceDir: apiResourcePath,
  });

  const schema = loadSchema(apiResourcePath);

  const directives = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
    resourceDir: apiResourcePath,
  });

  const baseOutputDir = overrideOutputDir || path.join(projectRoot, getModelOutputPath(context));
  const projectConfig = context.amplify.getProjectConfig();

  if (!isIntrospection && projectConfig.frontend === 'flutter' && !validateAmplifyFlutterMinSupportedVersion(projectRoot)) {
    context.print.error(`🚫 Models are not generated!
Amplify Flutter versions prior to 0.6.0 are no longer supported by codegen. Please upgrade to use codegen.`);
    return;
  }

  const generateIndexRules = readFeatureFlag('codegen.generateIndexRules');
  const emitAuthProvider = readFeatureFlag('codegen.emitAuthProvider');
  const usePipelinedTransformer = readFeatureFlag('graphQLTransformer.useExperimentalPipelinedTransformer');
  const transformerVersion = readNumericFeatureFlag('graphQLTransformer.transformerVersion');
  const respectPrimaryKeyAttributesOnConnectionField = readFeatureFlag('graphQLTransformer.respectPrimaryKeyAttributesOnConnectionField');
  const generateModelsForLazyLoadAndCustomSelectionSet = readFeatureFlag('codegen.generateModelsForLazyLoadAndCustomSelectionSet');
  const improvePluralization = readFeatureFlag('graphQLTransformer.improvePluralization');

  let addTimestampFields = readFeatureFlag('codegen.addTimestampFields');

  const handleListNullabilityTransparently = readFeatureFlag('codegen.handleListNullabilityTransparently');

  const output = await generateModelsHelper({
    schema,
    directives,
    platform: isIntrospection ? 'introspection' : projectConfig.frontend,
    generateIndexRules,
    emitAuthProvider,
    useExperimentalPipelinedTranformer: usePipelinedTransformer,
    transformerVersion,
    respectPrimaryKeyAttributesOnConnectionField,
    improvePluralization,
    generateModelsForLazyLoadAndCustomSelectionSet,
    addTimestampFields,
    handleListNullabilityTransparently,
    overrideOutputDir,
  });

  if (writeToDisk) {
    Object.entries(output).forEach(([filepath, contents]) => {
      fs.ensureFileSync(path.join(baseOutputDir, filepath));
      fs.writeFileSync(path.join(baseOutputDir, filepath), contents);
    });

    generateEslintIgnore(context);

    context.print.info(`Successfully generated models. Generated models can be found in ${overrideOutputDir ?? baseOutputDir}`);
  }

  return output;
}

async function validateSchema(context) {
  try {
    await context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', {
      noConfig: true,
      forceCompile: true,
      dryRun: true,
      disableResolverOverrides: true,
    });
  } catch (err) {
    context.print.error(err.toString());
  }
}

function loadSchema(apiResourcePath) {
  const schemaFilePath = path.join(apiResourcePath, 'schema.graphql');
  const schemaDirectory = path.join(apiResourcePath, 'schema');
  if (fs.pathExistsSync(schemaFilePath)) {
    return fs.readFileSync(schemaFilePath, 'utf8');
  }
  if (fs.pathExistsSync(schemaDirectory) && fs.lstatSync(schemaDirectory).isDirectory()) {
    // search recursively for graphql schema files inside `schema` directory
    const schemas = glob.sync([path.join(schemaDirectory, '**/*.graphql')]);
    return schemas.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  }

  throw new Error('Could not load the schema');
}

function getModelOutputPath(context) {
  const projectConfig = context.amplify.getProjectConfig();
  switch (projectConfig.frontend) {
    case 'javascript':
      return projectConfig.javascript && projectConfig.javascript.config && projectConfig.javascript.config.SourceDir
        ? path.normalize(projectConfig.javascript.config.SourceDir)
        : 'src';
    case 'android':
      return projectConfig.android && projectConfig.android.config && projectConfig.android.config.ResDir
        ? path.normalize(path.join(projectConfig.android.config.ResDir, '..', 'java'))
        : path.join('app', 'src', 'main', 'java');
    case 'ios':
      return 'amplify/generated/models';
    case 'flutter':
      return 'lib/models';
    default:
      return '.';
  }
}

function generateEslintIgnore(context) {
  const projectConfig = context.amplify.getProjectConfig();

  if (projectConfig.frontend !== 'javascript') {
    return;
  }

  const projectPath = pathManager.findProjectRoot();

  if (!projectPath) {
    return;
  }

  const eslintIgnorePath = path.join(projectPath, '.eslintignore');
  const modelFolder = path.join(getModelOutputPath(context), 'models');

  if (!fs.existsSync(eslintIgnorePath)) {
    fs.writeFileSync(eslintIgnorePath, modelFolder);
    return;
  }

  const eslintContents = fs.readFileSync(eslintIgnorePath);

  if (!eslintContents.includes(modelFolder)) {
    fs.appendFileSync(eslintIgnorePath, `\n${modelFolder}\n`);
  }
}

module.exports = generateModels;
