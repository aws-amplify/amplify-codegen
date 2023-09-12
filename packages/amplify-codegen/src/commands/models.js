const path = require('path');
const fs = require('fs-extra');
const glob = require('glob-all');
const { FeatureFlags, pathManager } = require('@aws-amplify/amplify-cli-core');
const { generateModels: generateModelsHelper } = require('@aws-amplify/graphql-generator');
const { validateAmplifyFlutterMinSupportedVersion } = require('../utils/validateAmplifyFlutterMinSupportedVersion');
const defaultDirectiveDefinitions = require('../utils/defaultDirectiveDefinitions');
const getModelSchemaPathParam = require('../utils/getModelSchemaPathParam');

/**
 * Modelgen Frontend type.
 * @typedef {'android' | 'ios' | 'flutter' | 'javascript' | 'typescript' | 'introspection'} ModelgenFrontend
 */


/**
 * Modelgen Target type.
 * @typedef {import('@aws-amplify/appsync-modelgen-plugin').Target} ModelgenTarget
 */

/**
 * Mapping from modelgen frontends (as configurable in Amplify init) to modelgen targets (languages)
 * @type {Record<ModelgenFrontend, ModelgenTarget>}
 */
const modelgenFrontendToTargetMap = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
  typescript: 'typescript',
  introspection: 'introspection',
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

/**
 * Return the root directory to use for subsequent subdirectories and fs searches.
 * @param {*} context the amplify execution context.
 * @returns {string} the project root, or current working directory
 */
const getProjectRoot = (context) => {
  try {
    // TODO: It's not clear why we call this `getProjectMeta` call first, so maybe it's side-effecting. This try catch also
    // ends up throwing an error over STDOUT "ProjectNotInitializedError: No Amplify backend project files detected within this folder."
    context.amplify.getProjectMeta();
    return context.amplify.getEnvInfo().projectPath;
  } catch (e) {
    return process.cwd();
  }
};

/**
 * Retrieve the path to the model schema (either provided via cli option or in amplify project context).
 * @param {*} context the amplify context to search
 * @returns {!Promise<string | null>} the model schema path to a .graphql file, directory containing a schema.graphql file, or schema directory full of *.graphql files
 */
const getModelSchemaPath = async (context) => {
  const modelSchemaPathParam = getModelSchemaPathParam(context);
  if (modelSchemaPathParam) {
    return modelSchemaPathParam;
  }

  const apiResource = (await context.amplify.getResourceStatus('api')).allResources
    .find(resource => resource.service === 'AppSync' && resource.providerPlugin === 'awscloudformation');

  if (!apiResource) {
    context.print.info('No AppSync API configured. Please add an API');
    return null;
  }

  const backendPath = await context.amplify.pathManager.getBackendDirPath();
  return path.join(backendPath, 'api', apiResource.resourceName);
};

/**
 * Retrieve the directives and definitions necessary to make the user-defined model schema valid.
 * @param {*} context the amplify project context
 * @param {!string} modelSchemaPath the schema path to use for directive retrieval.
 * @returns {!Promise<string>} the directives to append to a model schema to produce a valid SDL Graphql document.
 */
const getDirectives = async (context, modelSchemaPath) => {
  try {
    // Return await is important here, otherwise the catch won't be respected.
    return await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
      resourceDir: modelSchemaPath,
    });
  } catch {
    return defaultDirectiveDefinitions;
  }
};

/**
 * Retrieve the output path to write model assets into.
 * @param {*} context the amplify execution context.
 * @param {!string} overrideOutputDir a user-provided output directory as override
 * @param {!string} projectRoot the project root directory, defaulting to cwd
 * @returns {string | null} the output path to apply for the project, or null if one cannot be found.
 */
const getOutputPath = (context, overrideOutputDir, projectRoot) => {
  if (overrideOutputDir) {
    return overrideOutputDir;
  }

  try {
    return path.join(projectRoot, getModelOutputPath(context));
  } catch (_) {
    context.print.error('Output model path could not be generated from existing amplify project, use --output-dir to override');
    return null;
  }
};

/**
 * Retrieve the codegen target given a set of input flags, context options, and the project config.
 * @param {*} context the amplify execution context
 * @param {!boolean} isIntrospection whether or not this is a request for an introspection model.
 * @returns {!ModelgenTarget} the Modelgen target as a string
 */
const getFrontend = (context, isIntrospection) => {
  if (isIntrospection) {
    return 'introspection';
  }

  const targetParam = context.parameters?.options?.['target'];
  if (targetParam) {
    return targetParam;
  }

  return context.amplify.getProjectConfig().frontend;
};

/**
 * Try and retrieve a boolean feature flag value from the CLI input.
 * @param {*} context the amplify runtime context
 * @param {!string} flagName the feature flag name
 * @returns {boolean | null} the feature flag value if found, and can be coerced to a boolean, else null
 */
const getBooleanFeatureFlag = (context, flagName) => {
  // Attempt to read from cli input options as overrides first.~
  const featureFlagParamName = `feature-flag:${flagName}`;
  const paramNames = context.parameters?.options ? new Set(Object.keys(context.parameters?.options)) : new Set();
  if (paramNames.has(featureFlagParamName)) {
    const optionValue = context.parameters?.options?.[featureFlagParamName];
    if (optionValue === 'true' || optionValue === 'True' || optionValue === true) {
      return true;
    }
    if (optionValue === 'false' || optionValue === 'False' || optionValue === false) {
      return false;
    }
    throw new Error(`Feature flag value for parameter ${featureFlagParamName} could not be marshalled to boolean type, found ${optionValue}`);
  }

  // Read from feature flag file, fall back to false if nothing is found, and no default exists in-system.
  try {
    return FeatureFlags.getBoolean(flagName);
  } catch (_) {
    return false;
  }
};

/**
 * Try and retrieve an integer feature flag value from the CLI input.
 * @param {*} context the amplify runtime context
 * @param {!string} flagName the feature flag name
 * @returns {number | null} the feature flag value if found, and can be coerced to an int, else null
 */
const getNumericFeatureFlag = (context, flagName) => {
  // Attempt to read from cli input options as overrides first.
  const featureFlagParamName = `feature-flag:${flagName}`;
  const paramNames = context.parameters?.options ? new Set(Object.keys(context.parameters?.options)) : new Set();
  if (paramNames.has(featureFlagParamName)) {
    const optionValue = context.parameters?.options?.[featureFlagParamName];
    return Number.parseInt(optionValue, 10);
  }

  // Read from feature flag file, fall back to '1' if nothing is found, and no default exists in-system.
  try {
    return FeatureFlags.getNumber(flagName);
  } catch (_) {
    return 1;
  }
};

/**
 * Get modelgen target given the runtime platform.
 * @param {!ModelgenFrontend} frontend the frontend supplied either by the amplify context or customer input
 * @returns {!ModelgenTarget} the modelgen target value, and throws an error if no mapping value is found.
 */
const getTarget = (frontend) => {
  const supportedFrontends = Object.keys(modelgenFrontendToTargetMap);
  if (!supportedFrontends.find((supportedFrontend) => supportedFrontend === frontend)) {
    throw new Error(`Specified frontend ${frontend} not found in frontend to target mapping, ${JSON.stringify(supportedFrontends)}`);
  }
  return modelgenFrontendToTargetMap[frontend];
}

/**
 * Run validations over the project state, return the errors of an array of strings.
 * @param {!string} projectRoot the project root path for validating local state
 * @param {!Platform} platform the frontend being targeted for this project.
 * @returns {!Array<string>} the list of validation failures detected
 */
const validateProjectState = (projectRoot, platform) => {
  const validationFailures = [];
  if (platform === 'flutter' && !validateAmplifyFlutterMinSupportedVersion(projectRoot)) {
    validationFailures.push(`🚫 Models are not generated!
Amplify Flutter versions prior to 0.6.0 are no longer supported by codegen. Please upgrade to use codegen.`);
  }
  return validationFailures;
};

async function generateModels(context, generateOptions = null) {
  const { overrideOutputDir, isIntrospection, writeToDisk } = generateOptions
    ? { ...defaultGenerateModelsOption, ...generateOptions }
    : defaultGenerateModelsOption;

  const projectRoot = getProjectRoot(context);
  const modelSchemaPath = await getModelSchemaPath(context);
  if (!modelSchemaPath) {
    return;
  }
  const directives = await getDirectives(context, modelSchemaPath);

  await validateSchema(context);
  const schema = loadSchema(modelSchemaPath);
  const frontend = getFrontend(context, isIntrospection);
  const target = getTarget(frontend);

  const validationFailures = validateProjectState(projectRoot, frontend);
  if (validationFailures.length > 0) {
    validationFailures.forEach((validationFailure) => context.print.error(validationFailure));
    return;
  }

  const generateIndexRules = getBooleanFeatureFlag(context, 'codegen.generateIndexRules');
  const emitAuthProvider = getBooleanFeatureFlag(context, 'codegen.emitAuthProvider');
  const useExperimentalPipelinedTransformer = getBooleanFeatureFlag(context, 'graphQLTransformer.useExperimentalPipelinedTransformer');
  const transformerVersion = getNumericFeatureFlag(context, 'graphQLTransformer.transformerVersion');
  const respectPrimaryKeyAttributesOnConnectionField = getBooleanFeatureFlag(context, 'graphQLTransformer.respectPrimaryKeyAttributesOnConnectionField');
  const generateModelsForLazyLoadAndCustomSelectionSet = getBooleanFeatureFlag(context, 'codegen.generateModelsForLazyLoadAndCustomSelectionSet');
  const improvePluralization = getBooleanFeatureFlag(context, 'graphQLTransformer.improvePluralization');
  const addTimestampFields = getBooleanFeatureFlag(context, 'codegen.addTimestampFields');
  const handleListNullabilityTransparently = getBooleanFeatureFlag(context, 'codegen.handleListNullabilityTransparently');

  const generatedCode = await generateModelsHelper({
    schema,
    directives,
    target,
    generateIndexRules,
    emitAuthProvider,
    useExperimentalPipelinedTransformer,
    transformerVersion,
    respectPrimaryKeyAttributesOnConnectionField,
    improvePluralization,
    generateModelsForLazyLoadAndCustomSelectionSet,
    addTimestampFields,
    handleListNullabilityTransparently,
  });

  if (writeToDisk) {
    const outputPath = getOutputPath(context, overrideOutputDir, projectRoot);
    if (!outputPath) {
      return;
    }
    Object.entries(generatedCode).forEach(([filepath, contents]) => {
      fs.outputFileSync(path.resolve(path.join(outputPath, filepath)), contents);
    });

    try {
      // TODO: move to @aws-amplify/graphql-generator
      generateEslintIgnore(context, frontend);
    } catch (e) {}

    context.print.info(`Successfully generated models. Generated models can be found in ${outputPath}`);
  }

  return Object.values(generatedCode);
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

/**
 * Given a path, return the graphql file contents (or concatenated contents)
 * @param {*} apiResourcePath the path to a graphql file or directory of graphql files.
 * @returns the graphql file contents
 */
function loadSchema(apiResourcePath) {
  if (fs.lstatSync(apiResourcePath).isFile()) {
    return fs.readFileSync(apiResourcePath, 'utf8');
  }
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
      return path.join(
        projectConfig.javascript && projectConfig.javascript.config && projectConfig.javascript.config.SourceDir
          ? path.normalize(projectConfig.javascript.config.SourceDir)
          : 'src',
        'models',
      );
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

const generateEslintIgnore = (context, frontend) => {
  if (frontend !== 'javascript') {
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
