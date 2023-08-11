const glob = require('glob-all');
const path = require('path');
const Ora = require('ora');
const fs = require('fs-extra');

const constants = require('../constants');
const { loadConfig } = require('../codegen-config');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails } = require('../utils');
const { generateTypes: generateTypesHelper } = require('@aws-amplify/graphql-generator');

async function generateTypes(context, forceDownloadSchema, withoutInit = false, decoupleFrontend = '') {
  let frontend = decoupleFrontend;
  try {
    context.amplify.getProjectMeta();
  } catch (e) {
    withoutInit = true;
  }
  if (!withoutInit) {
    frontend = getFrontEndHandler(context);
  }
  if (frontend !== 'android') {
    const config = loadConfig(context, withoutInit);
    const projects = config.getProjects();
    let apis = [];
    if (!withoutInit) {
      apis = getAppSyncAPIDetails(context);
    }
    if (!projects.length || !apis.length) {
      if (!withoutInit) {
        context.print.info(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
        return;
      }
    }

    let projectPath = process.cwd();
    if (!withoutInit) {
      ({ projectPath } = context.amplify.getEnvInfo());
    }

    try {
      projects.forEach(async cfg => {
        const { generatedFileName } = cfg.amplifyExtension || {};
        const includeFiles = cfg.includes;
        if (!generatedFileName || generatedFileName === '' || includeFiles.length === 0) {
          return;
        }

        const excludes = cfg.excludes.map(pattern => `!${pattern}`);
        const queries = glob
          .sync([...includeFiles, ...excludes], {
            cwd: projectPath,
            absolute: true,
          })
          .map(queryFilePath => fs.readFileSync(queryFilePath));
        const schemaPath = path.join(projectPath, cfg.schema);
        const target = cfg.amplifyExtension.codeGenTarget;

        const outputPath = path.join(projectPath, generatedFileName);
        let region;
        if (!withoutInit) {
          ({ region } = cfg.amplifyExtension);
          await ensureIntrospectionSchema(context, schemaPath, apis[0], region, forceDownloadSchema);
        }
        const codeGenSpinner = new Ora(constants.INFO_MESSAGE_CODEGEN_GENERATE_STARTED);
        codeGenSpinner.start();
        const schema = fs.readFileSync(schemaPath);
        try {
          const output = generateTypesHelper({
            schema,
            // TODO: read queries from file
            queries,
            target,
          });
          // TODO: write files
          codeGenSpinner.succeed(`${constants.INFO_MESSAGE_CODEGEN_GENERATE_SUCCESS} ${path.relative(path.resolve('.'), outputPath)}`);
        } catch (err) {
          codeGenSpinner.fail(err.message);
        }
      });
    } catch (err) {
      throw Error(err.message);
    }
  }
}

module.exports = generateTypes;
