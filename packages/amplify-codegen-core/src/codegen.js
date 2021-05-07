const fs = require('fs-extra');
const glob = require('glob-all');
const path = require('path');
const { parse } = require('graphql');
const loadConfig = require('../../amplify-codegen/src/codegen-config');
const constants = require('../../amplify-codegen/src/constants');

const { getTypesGenPluginPackage } = require('./utils/getTypesGenPluginPackage');
const gqlCodeGen = require('@graphql-codegen/core');

const platformToLanguageMap = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
};

async function generateTypesWithPlugin(context, withoutInit = false) {
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
  const projectConfig = context.amplify.getProjectConfig();
  const schemaContent = loadSchema(apiResourcePath);
  const schema = parse(schemaContent);

  // Generated filename:
  const config = loadConfig(context).getProjects();
  if (!config.length) {
    if (!withoutInit) {
      context.print.info(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
      return;
    }
  }
  const { generatedFileName } = config[0].amplifyExtension || {};
  if (!generatedFileName || generatedFileName === '') {
    return;
  }
  const outputPath = path.join(projectRoot, generatedFileName);

  // Absence of this variable doesnt let a call into type generator plugin:
  const directiveDefinitions = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
    resourceDir: apiResourcePath,
  });

  const codegenPlugin = getTypesGenPluginPackage();

  // new
  const includeFiles = config[0].includes;
  if (includeFiles.length === 0) {
    return;
  }
  const excludes = config[0].excludes.map(pattern => `!${pattern}`);
  const queries = glob.sync([...includeFiles, ...excludes], {
    cwd: projectRoot,
    absolute: true,
  });

  const appsyncLocalConfig = await codegenPlugin.preset.buildGeneratesSection({
    baseOutputDir: outputPath,
    schema,
    config: {
      target: platformToLanguageMap[projectConfig.frontend] || projectConfig.frontend,
      directives: directiveDefinitions,
      temp: queries,
    },
  });

  const codeGenPromises = appsyncLocalConfig.map(cfg =>
    gqlCodeGen.codegen({
      ...cfg,
      plugins: [
        {
          appSyncLocalCodeGen: {},
        },
      ],
      pluginMap: {
        appSyncLocalCodeGen: codegenPlugin,
      },
    }),
  );

  const generatedCode = await Promise.all(codeGenPromises);
  context.print.info(`Generated types from plugin generator: ${generatedCode}`);
}

function loadSchema(apiResourcePath) {
  const schemaFilePath = path.join(apiResourcePath, 'schema.graphql');
  const schemaDirectory = path.join(apiResourcePath, 'schema');
  if (fs.pathExistsSync(schemaFilePath)) {
    if (fs.readFileSync(schemaFilePath, 'utf8') == undefined) return ' type SimpleModel { id: ID! status: String } ';
    return fs.readFileSync(schemaFilePath, 'utf8');
  }
  if (fs.pathExistsSync(schemaDirectory) && fs.lstatSync(schemaDirectory).isDirectory()) {
    // search recursively for graphql schema files inside `schema` directory
    const schemas = glob.sync([path.join(schemaDirectory, '**/*.graphql')]);
    return schemas.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  }
  throw new Error('Could not load the schema');
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

module.exports = generateTypesWithPlugin;
