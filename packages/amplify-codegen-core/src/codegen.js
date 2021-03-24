const glob = require('glob-all');
const path = require('path');
const Ora = require('ora');
const { parse } = require('graphql');
const loadConfig = require('../../amplify-codegen/src/codegen-config');

const { getTypesGenPluginPackage } = require('./utils/getTypesGenPluginPackage');
const { loadSchema } = require('./utils/loadSchema');
const { validateSchema } = require('./utils/loadSchema');
const gqlCodeGen = require('@graphql-codegen/core');

const platformToLanguageMap = {
  android: 'java',
  ios: 'swift',
  flutter: 'dart',
  javascript: 'javascript',
};

async function generateTypesWithPlugin(context) {
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
  const { generatedFileName } = config[0].amplifyExtension || {};
  const outputPath = path.join(projectRoot, generatedFileName);

  // Absence of this variable doesnt let a call into type generator plugin:
  const directiveDefinitions = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'getTransformerDirectives', {
    resourceDir: apiResourcePath,
  });

  const codegenPlugin = getTypesGenPluginPackage();

  const appsyncLocalConfig = await codegenPlugin.preset.buildGeneratesSection({
    baseOutputDir: outputPath,
    schema,
    config: {
      target: platformToLanguageMap[projectConfig.frontend] || projectConfig.frontend,
      directives: directiveDefinitions,
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
        appSyncLocalCodeGen: codegenPlugin,
      },
    });
  });

  const generatedCode = await Promise.all(codeGenPromises);
}

module.exports = generateTypesWithPlugin;
