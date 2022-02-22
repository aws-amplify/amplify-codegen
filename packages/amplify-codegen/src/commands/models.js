const path = require('path');
const fs = require('fs-extra');
const { parse } = require('graphql');
const glob = require('glob-all');
const { FeatureFlags, pathManager } = require('amplify-cli-core');
const gqlCodeGen = require('@graphql-codegen/core');
const { getModelgenPackage } = require('../utils/getModelgenPackage');
const { validateDartSDK } = require('../utils/validateDartSDK');
const { validateAmplifyFlutterCapableZeroThreeFeatures } = require('../utils/validateAmplifyFlutterCapableZeroThreeFeatures');
const { validateAmplifyFlutterCoreLibraryDependency } = require('../utils/validateAmplifyFlutterCoreLibraryDependency');

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

async function generateModels(context) {
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

  const schemaContent = loadSchema(apiResourcePath);
  const outputPath = path.join(projectRoot, getModelOutputPath(context));
  const schema = parse(schemaContent);
  const projectConfig = context.amplify.getProjectConfig();
  //get modelgen package
  const modelgenPackageMigrationflag = 'codegen.useAppSyncModelgenPlugin';
  const appSyncDataStoreCodeGen = getModelgenPackage(FeatureFlags.getBoolean(modelgenPackageMigrationflag));

  const generateIndexRules = readFeatureFlag('codegen.generateIndexRules');
  const emitAuthProvider = readFeatureFlag('codegen.emitAuthProvider');
  const usePipelinedTransformer = readFeatureFlag('graphQLTransformer.useExperimentalPipelinedTransformer')
  const transformerVersion = readNumericFeatureFlag('graphQLTransformer.transformerVersion');
  const useCustomPrimaryKey = readFeatureFlag('codegen.useCustomPrimaryKey');

  let isTimestampFieldsAdded = readFeatureFlag('codegen.addTimestampFields');
  let enableDartNullSafety = readFeatureFlag('codegen.enableDartNullSafety');
  let enableDartZeroThreeFeatures = false;
  let dartUpdateAmplifyCoreDependency = false;

  if (projectConfig.frontend === 'flutter') {
    const isMinimumDartVersionSatisfied = validateDartSDK(context, projectRoot);
    context.print.warning(`Detected feature flag: “enableDartNullSafety : ${enableDartNullSafety}”`);
    if (isMinimumDartVersionSatisfied && enableDartNullSafety) {
      context.print.warning(
        'Generating Dart Models with null safety. To opt out of null safe models, turn off the “enableDartNullSafety” feature flag. Learn more: https://docs.amplify.aws/lib/project-setup/null-safety/q/platform/flutter',
      );
    } else {
      enableDartNullSafety = false;
      context.print.warning(
        'Generating Dart Models without null safety. To generate null safe data models, turn on the “enableDartNullSafety” feature flag and set your Dart SDK version to “>= 2.12.0”. Learn more: https://docs.amplify.aws/lib/project-setup/null-safety/q/platform/flutter',
      );
    }
    // override isTimestampFieldsAdded to true when using amplify-flutter > 0.3.0 || > 0.3.0-rc.2
    isTimestampFieldsAdded = validateAmplifyFlutterCapableZeroThreeFeatures(projectRoot);
    enableDartZeroThreeFeatures = validateAmplifyFlutterCapableZeroThreeFeatures(projectRoot);
    // This feature is supported only for users using amplify-flutter > 0.4.0 || > 0.4.0-rc.1
    dartUpdateAmplifyCoreDependency = validateAmplifyFlutterCoreLibraryDependency(projectRoot);
  }

  const handleListNullabilityTransparently = readFeatureFlag('codegen.handleListNullabilityTransparently');
  const appsyncLocalConfig = await appSyncDataStoreCodeGen.preset.buildGeneratesSection({
    baseOutputDir: outputPath,
    schema,
    config: {
      target: platformToLanguageMap[projectConfig.frontend] || projectConfig.frontend,
      directives: directiveDefinitions,
      isTimestampFieldsAdded,
      emitAuthProvider,
      generateIndexRules,
      enableDartNullSafety,
      handleListNullabilityTransparently,
      usePipelinedTransformer,
      enableDartZeroThreeFeatures,
      transformerVersion,
      dartUpdateAmplifyCoreDependency,
      useCustomPrimaryKey
    },
  });

  const codeGenPromises = appsyncLocalConfig.map(cfg => {
    return gqlCodeGen.codegen({
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
  });

  const generatedCode = await Promise.all(codeGenPromises);

  appsyncLocalConfig.forEach((cfg, idx) => {
    const outPutPath = cfg.filename;
    fs.ensureFileSync(outPutPath);
    fs.writeFileSync(outPutPath, generatedCode[idx]);
  });

  generateEslintIgnore(context);

  context.print.info(`Successfully generated models. Generated models can be found in ${outputPath}`);
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
