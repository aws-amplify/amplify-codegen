const glob = require('glob-all');
const path = require('path');
const Ora = require('ora');
const fs = require('fs-extra');

const constants = require('../constants');
const { loadConfig } = require('../codegen-config');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails } = require('../utils');
const { generateTypes: generateTypesHelper } = require('@aws-amplify/graphql-generator');
const { extractDocumentFromJavascript } = require('@aws-amplify/graphql-types-generator');

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
        const target = cfg.amplifyExtension.codeGenTarget;

        const excludes = cfg.excludes.map(pattern => `!${pattern}`);
        const queries = glob
          .sync([...includeFiles, ...excludes], {
            cwd: projectPath,
            absolute: true,
          })
          .map(queryFilePath => {
            const fileContents = fs.readFileSync(queryFilePath, 'utf8');
            if (
              queryFilePath.endsWith('.jsx') ||
              queryFilePath.endsWith('.js') ||
              queryFilePath.endsWith('.tsx') ||
              queryFilePath.endsWith('.ts')
            ) {
              return extractDocumentFromJavascript(fileContents, '');
            }
            return fileContents;
          })
          .join('\n');

        const schemaPath = path.join(projectPath, cfg.schema);

        const outputPath = path.join(projectPath, generatedFileName);
        let region;
        if (!withoutInit) {
          ({ region } = cfg.amplifyExtension);
          await ensureIntrospectionSchema(context, schemaPath, apis[0], region, forceDownloadSchema);
        }
        const codeGenSpinner = new Ora(constants.INFO_MESSAGE_CODEGEN_GENERATE_STARTED);
        codeGenSpinner.start();
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const introspection = path.extname(schemaPath) === '.json';

        try {
          const output = await generateTypesHelper({
            schema,
            queries,
            target,
            introspection,
          });
          const outputs = Object.entries(output);

          if (outputs.length === 1) {
            const [[, contents]] = outputs;
            fs.outputFileSync(path.resolve(path.join(projectPath, outputPath)), contents);
          } else {
            outputs.forEach(([filepath, contents]) => {
              fs.outputFileSync(path.resolve(path.join(projectPath, outputPath, filepath)), contents);
            });
          }
          codeGenSpinner.succeed(
            `${constants.INFO_MESSAGE_CODEGEN_GENERATE_SUCCESS} ${path.relative(
              path.resolve('.'),
              path.join(projectPath, generatedFileName),
            )}`,
          );
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
