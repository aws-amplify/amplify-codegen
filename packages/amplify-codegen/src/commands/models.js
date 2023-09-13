const path = require('path');
const fs = require('fs-extra');
const glob = require('glob-all');
const { FeatureFlags, pathManager } = require('@aws-amplify/amplify-cli-core');
const { generateModels: generateModelsHelper } = require('@aws-amplify/graphql-generator');
const { validateAmplifyFlutterMinSupportedVersion } = require('../utils/validateAmplifyFlutterMinSupportedVersion');
const defaultDirectiveDefinitions = require('../utils/defaultDirectiveDefinitions');
const getProjectRoot = require('../utils/getProjectRoot');
const { getModelSchemaPathParam, hasModelSchemaPathParam } = require('../utils/getModelSchemaPathParam');

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
 * Return feature flag override values from the cli in the format --feature-flag:<feature flag name> <feature flag value>
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!string} flagName the feature flag name
 * @returns {any | null} the raw value if found, else null
 */
const cliFeatureFlagOverride = (context, flagName) => context.parameters?.options?.[`feature-flag:${flagName}`];

/**
 * Returns feature flag value, default to `false`
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!string} flagName feature flag id
 * @returns {!boolean} the feature flag value
 */
const readFeatureFlag = (context, flagName) => {
  const cliValue = cliFeatureFlagOverride(context, flagName);
  if (cliValue) {
    if (cliValue === 'true' || cliValue === 'True' || cliValue === true) {
      return true;
    }
    if (cliValue === 'false' || cliValue === 'False' || cliValue === false) {
      return false;
    }
    throw new Error(`Feature flag value for parameter ${flagName} could not be marshalled to boolean type, found ${cliValue}`);
  }

  try {
    return FeatureFlags.getBoolean(flagName);
  } catch (_) {
    return false;
  }
};

/**
 * Returns feature flag value, default to `1`
 * @param {!AmplifyContext} context the amplify runtime context
 * @param {!string} flagName feature flag id
 * @returns {!number} the feature flag value
 */
const readNumericFeatureFlag = (context, flagName) => {
  const cliValue = cliFeatureFlagOverride(context, flagName);
  if (cliValue) {
    return Number.parseInt(cliValue, 10);
  }

  try {
    return FeatureFlags.getNumber(flagName);
  } catch (_) {
    return 1;
  }
};

/**
 * Return the path to the graphql schema.
 * @param {!AmplifyContext} context the amplify runtime context
 * @returns {!Promise<string | null>} the api path, if one can be found, else null
 */
const getApiResourcePath = async (context) => {
  const modelSchemaPathParam = getModelSchemaPathParam(context);
  if (modelSchemaPathParam) {
    return modelSchemaPathParam;
  }

  try {
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
  } catch (_) {
    throw new Error('Schema resource path not found, if you are running this command from a directory without a local amplify directory, be sure to specify the path to your model schema file or folder via --model-schema.');
  }
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
  try {
    return path.join(projectRoot, getModelOutputPath(context.amplify.getProjectConfig()));
  } catch (_) {
    throw new Error('Output directory could not be determined, to specify, set the --output-dir CLI property.')
  }
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

  const targetParam = context.parameters?.options?.['target'];
  if (targetParam) {
    if (!modelgenFrontendToTargetMap[targetParam]) {
      throw new Error(`Unexpected --target value ${targetParam} provided, expected one of ${JSON.stringify(Object.keys(modelgenFrontendToTargetMap))}`)
    }
    return targetParam;
  }

  try {
    return context.amplify.getProjectConfig().frontend;
  } catch (_) {
    throw new Error('Modelgen target not found, if you are running this command from a directory without a local amplify directory, be sure to specify the modelgen target via --target.');
  }
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

  // Attempt to validate schema compilation, and print any errors if an override schema path was not presented (in which case this will fail)
  try {
    if (!hasModelSchemaPathParam(context)) {
      await context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', {
        noConfig: true,
        forceCompile: true,
        dryRun: true,
        disableResolverOverrides: true,
      });
    }
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
    generateIndexRules: readFeatureFlag(context, 'codegen.generateIndexRules'),
    emitAuthProvider: readFeatureFlag(context, 'codegen.emitAuthProvider'),
    useExperimentalPipelinedTransformer: readFeatureFlag(context, 'graphQLTransformer.useExperimentalPipelinedTransformer'),
    transformerVersion: readNumericFeatureFlag(context, 'graphQLTransformer.transformerVersion'),
    respectPrimaryKeyAttributesOnConnectionField: readFeatureFlag(context, 'graphQLTransformer.respectPrimaryKeyAttributesOnConnectionField'),
    improvePluralization: readFeatureFlag(context, 'graphQLTransformer.improvePluralization'),
    generateModelsForLazyLoadAndCustomSelectionSet: readFeatureFlag(context, 'codegen.generateModelsForLazyLoadAndCustomSelectionSet'),
    addTimestampFields: readFeatureFlag(context, 'codegen.addTimestampFields'),
    handleListNullabilityTransparently: readFeatureFlag(context, 'codegen.handleListNullabilityTransparently'),
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

/**
 * Retrieve the model output path for the given project configuration
 * @param {any} projectConfig the amplify runtime context
 * @returns the model output path, relative to the project root
 */
function getModelOutputPath(projectConfig) {
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
  let projectConfig;
  let projectPath;
  try {
    projectConfig = context.amplify.getProjectConfig();
    projectPath = pathManager.findProjectRoot();
  } catch (_) {
    return;
  }

  if (projectConfig.frontend !== 'javascript') {
    return;
  }


  if (!projectPath) {
    return;
  }

  const eslintIgnorePath = path.join(projectPath, '.eslintignore');
  const modelFolder = path.join(getModelOutputPath(projectConfig), 'models');

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
