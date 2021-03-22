const glob = require('glob-all');
const path = require('path');
const Ora = require('ora');
const { parse } = require('graphql');

const { getTypesGenPluginPackage } = require('./utils/getTypesGenPluginPackage');
const { loadSchema } = require('./utils/loadSchema');


const platformToLanguageMap = {
    android: 'java',
    ios: 'swift',
    flutter: 'dart',
    javascript: 'javascript',
  };

async function generateTypesWithPlugin(context) {

    const projectConfig = context.amplify.getProjectConfig();
    const schemaContent = loadSchema(apiResourcePath);
    const schema = parse(schemaContent);

    const codegenPlugin = getTypesGenPluginPackage();

    const appsyncLocalConfig = await codegenPlugin.preset.buildGeneratesSection({
        // baseOutputDir: outputPath,
        schema,
        config: {
          target: platformToLanguageMap[projectConfig.frontend] || projectConfig.frontend
        //   directives: directiveDefinitions,
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