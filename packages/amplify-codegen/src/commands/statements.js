const path = require('path');
const fs = require('fs-extra');
const Ora = require('ora');

const { loadConfig } = require('../codegen-config');
const constants = require('../constants');
const {
  ensureIntrospectionSchema,
  getFrontEndHandler,
  getAppSyncAPIDetails,
  readSchemaFromFile,
  getAppSyncAPIInfoFromProject,
} = require('../utils');
const { generateGraphQLDocuments } = require('@aws-amplify/graphql-docs-generator');
const { generateStatements: generateStatementsHelper } = require('@aws-amplify/graphql-generator');

async function generateStatements(context, forceDownloadSchema, maxDepth, withoutInit = false, decoupleFrontend = '') {
  try {
    context.amplify.getProjectMeta();
  } catch (e) {
    withoutInit = true;
  }
  const config = loadConfig(context, withoutInit);
  const projects = config.getProjects();
  if (!projects.length && withoutInit) {
    context.print.info(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
    return;
  }
  let apis = [];
  if (!withoutInit) {
    apis = getAppSyncAPIDetails(context);
  } else {
    const api = await getAppSyncAPIInfoFromProject(context, projects[0]);
    if (api) {
      apis = [api];
    }
  }
  let projectPath = process.cwd();
  if (!withoutInit) {
    ({ projectPath } = context.amplify.getEnvInfo());
  }
  if (!projects.length || !apis.length) {
    if (!withoutInit) {
      context.print.info(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
      return;
    }
  }

  for (const cfg of projects) {
    const includeFiles = path.join(projectPath, cfg.includes[0]);
    const opsGenDirectory = cfg.amplifyExtension.docsFilePath
      ? path.join(projectPath, cfg.amplifyExtension.docsFilePath)
      : path.dirname(path.dirname(includeFiles));
    const schemaPath = path.join(projectPath, cfg.schema);
    if (apis.length) {
      const { region } = cfg.amplifyExtension;
      await ensureIntrospectionSchema(context, schemaPath, apis[0], region, forceDownloadSchema);
    }
    const frontend = withoutInit ? cfg.amplifyExtension.frontend : getFrontEndHandler(context);
    const language = frontend === 'javascript' ? cfg.amplifyExtension.codeGenTarget : 'graphql';

    const opsGenSpinner = new Ora(constants.INFO_MESSAGE_OPS_GEN);
    opsGenSpinner.start();

    try {
      const schemaData = readSchemaFromFile(schemaPath);
      const relativeTypesPath = cfg.amplifyExtension.generatedFileName
        ? path.relative(opsGenDirectory, cfg.amplifyExtension.generatedFileName)
        : null;
      const generatedOps = generateStatementsHelper({
        schema: schemaData,
        target: language,
        maxDepth: maxDepth || cfg.amplifyExtension.maxDepth,
        useExternalFragmentForS3Object: language === 'graphql',
        // default typenameIntrospection to true when not set
        typenameIntrospection:
          cfg.amplifyExtension.typenameIntrospection === undefined ? true : !!cfg.amplifyExtension.typenameIntrospection,
        relativeTypesPath,
      });
      if (!generatedOps) {
        context.print.warning('No GraphQL statements are generated. Check if the introspection schema has GraphQL operations defined.');
      } else {
        await writeGeneratedDocuments(language, generatedOps, opsGenDirectory);
        opsGenSpinner.succeed(constants.INFO_MESSAGE_OPS_GEN_SUCCESS + path.relative(path.resolve('.'), opsGenDirectory));
      }
    } finally {
      opsGenSpinner.stop();
    }
  }
}

function writeGeneratedDocuments(language, generatedStatements, outputPath) {
  Object.entries(generatedStatements).forEach(([filepath, contents]) => {
    fs.outputFileSync(path.resolve(path.join(outputPath, filepath)), contents);
  });
}

module.exports = generateStatements;
