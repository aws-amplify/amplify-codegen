const path = require('path');
const fs = require('fs-extra');
const glob = require('glob-all');
const { FeatureFlags, pathManager } = require('@aws-amplify/amplify-cli-core');
const { generateModels: generateModelsHelper } = require('@aws-amplify/graphql-generator');
const { validateAmplifyFlutterMinSupportedVersion } = require('../utils/validateAmplifyFlutterMinSupportedVersion');
const defaultDirectiveDefinitions = require('../utils/defaultDirectiveDefinitions');

/**
 * Amplify Context type.
 * @typedef {import('@aws-amplify/amplify-cli-core').$TSContext} AmplifyContext
 */

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

/**
 * Returns feature flag value, default to `false`
 * @param {!string} key feature flag id
 * @returns {!boolean} the feature flag value
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
 * @param {!string} key feature flag id
 * @returns {!number} the feature flag value
 */
const readNumericFeatureFlag = key => {
  try {
    return FeatureFlags.getNumber(key);
  } catch (err) {
    return 1;
  }
};

/**
 * Retrieve the project root for use in validation and tk
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns {!string} path to the project root, or cwd if not found
 */
const getProjectRoot = (context) => {
  try {
    context.amplify.getProjectMeta();
    return context.amplify.getEnvInfo().projectPath;
  } catch (_) {
    return process.cwd();
  }
};

/**
 * Return the path to the graphql schema.
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns {!Promise<string | null>} the api path, if one can be found, else null
 */
const getApiResourcePath = async (context) => {
  const allApiResources = await context.amplify.getResourceStatus('api');
  const apiResource = allApiResources.allResources.find(
    resource => resource.service === 'AppSync' && resource.providerPlugin === 'awscloudformation',
  );
  if (!apiResource) {
    context.print.info('No AppSync API configured. Please add an API');
    return null;
  }

  const backendPath = await context.amplify.pathManager.getBackendDirPath();
  return path.join(backendPath, 'api', apiResource.resourceName);
};

/**
 * Return the additional directive definitions requred for graphql parsing and validation.
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!string} apiResourcePath the directory to attempt to retrieve amplify compilation in
 * @returns {!Promise<string>} the stringified version in the transformer directives
 */
const getDirectives = async (context, apiResourcePath) => {
  try {
    // Return await is important here, otherwise we will fail to drop into the catch statement
    return await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
      resourceDir: apiResourcePath,
    });
  } catch {
    return defaultDirectiveDefinitions;
  }
};

/**
 * Retrieve the output directory to write assets into.
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!string} projectRoot the project root directory
 * @param {string | null} overrideOutputDir the override dir, if one is specified
 * @returns {!string} the directory to write output files into
 */
const getOutputDir = (context, projectRoot, overrideOutputDir) => {
  if (overrideOutputDir) {
    return overrideOutputDir;
  }
  return path.join(projectRoot, getModelOutputPath(context));
};

/**
 * Return the frontend to run modelgen for.
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns {!ModelgenFrontend} the frontend configured in the project
 */
const getFrontend = (context, isIntrospection) => {
  if (isIntrospection === true) {
    return 'introspection';
  }
  return context.amplify.getProjectConfig().frontend;
};

/**
 * Validate the project for any configuration issues.
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!ModelgenFrontend} frontend the frontend used in this project
 * @param {!string} projectRoot project root directory for validation
 * @returns {!Promise<{validationFailures: Array<string>, validationWarnings: Array<string>}>} an array of any detected validation failures
 */
const validateProject = async (context, frontend, projectRoot) => {
  const validationFailures = [];
  const validationWarnings = [];

  // Attempt to validate schema compilation, and print any errors
  try {
    await context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', {
      noConfig: true,
      forceCompile: true,
      dryRun: true,
      disableResolverOverrides: true,
    });
  } catch (err) {
    validationWarnings.push(err.toString());
  }

  // Flutter version check
  if (frontend === 'flutter' && !validateAmplifyFlutterMinSupportedVersion(projectRoot)) {
    validationFailures.push(`🚫 Models are not generated!
Amplify Flutter versions prior to 0.6.0 are no longer supported by codegen. Please upgrade to use codegen.`);
  }

  return { validationWarnings, validationFailures };
};

/**
 * Type for invoking the generateModels method.
 * @typedef {Object} GenerateModelsOptions
 * @property {string | null} overrideOutputDir override path for the file output
 * @property {!boolean} isIntrospection whether or not this is an introspection
 * @property {!boolean} writeToDisk whether or not to write the results to the disk
 */

/**
 * @type GenerateModelsOptions
 */
const defaultGenerateModelsOption = {
  overrideOutputDir: null,
  isIntrospection: false,
  writeToDisk: true,
};

/**
 * Generate the models for client via the following steps.
 *   1. Load the schema and validate using transformer
 *   2. get all the directives supported by transformer
 *   3. Generate code
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {GenerateModelsOptions | null} generateOptions the generation options
 * @returns the generated assets as a map
 */
async function generateModels(context, generateOptions = null) {
  const { overrideOutputDir, isIntrospection, writeToDisk } = generateOptions
    ? { ...defaultGenerateModelsOption, ...generateOptions }
    : defaultGenerateModelsOption;

  const frontend = getFrontend(context, isIntrospection);

  const apiResourcePath = await getApiResourcePath(context);
  if (!apiResourcePath) {
    return;
  }

  const projectRoot = getProjectRoot(context);

  const { validationFailures, validationWarnings } = await validateProject(context, frontend, projectRoot);
  validationWarnings.forEach(context.print.warning);
  validationFailures.forEach(context.print.error);
  if (validationFailures.length > 0) {
    return;
  }

  const generatedCode = await generateModelsHelper({
    schema: loadSchema(apiResourcePath),
    directives: await getDirectives(context, apiResourcePath),
    target: modelgenFrontendToTargetMap[frontend],
    generateIndexRules: readFeatureFlag('codegen.generateIndexRules'),
    emitAuthProvider: readFeatureFlag('codegen.emitAuthProvider'),
    useExperimentalPipelinedTransformer: readFeatureFlag('graphQLTransformer.useExperimentalPipelinedTransformer'),
    transformerVersion: readNumericFeatureFlag('graphQLTransformer.transformerVersion'),
    respectPrimaryKeyAttributesOnConnectionField: readFeatureFlag('graphQLTransformer.respectPrimaryKeyAttributesOnConnectionField'),
    improvePluralization: readFeatureFlag('graphQLTransformer.improvePluralization'),
    generateModelsForLazyLoadAndCustomSelectionSet: readFeatureFlag('codegen.generateModelsForLazyLoadAndCustomSelectionSet'),
    addTimestampFields: readFeatureFlag('codegen.addTimestampFields'),
    handleListNullabilityTransparently: readFeatureFlag('codegen.handleListNullabilityTransparently'),
  });

  if (writeToDisk) {
    const outputDir = getOutputDir(context, projectRoot, overrideOutputDir);
    Object.entries(generatedCode).forEach(([filepath, contents]) => {
      fs.outputFileSync(path.resolve(path.join(outputDir, filepath)), contents);
    });

    // TODO: move to @aws-amplify/graphql-generator
    generateEslintIgnore(context);

    context.print.info(`Successfully generated models. Generated models can be found in ${outputDir}`);
  }

  return Object.values(generatedCode);
}

/**
 * Load the graphql schema definition from a given project directory.
 * @param {!string} apiResourcePath the path to the directory containing graphql files.
 * @returns {!string} the graphql string for all schema files found
 */
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

/**
 * Retrieve the model output path for the given project configuration
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns the model output path, relative to the project root
 */
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

/**
 * Write the .eslintignore file contents to disk if appropriate for the project
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns once eslint side effecting is complete
 */
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
