const path = require('path');
const Ora = require('ora');

const { loadConfig } = require('../codegen-config');
const constants = require('../constants');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails, readSchemaFromFile } = require('../utils');
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
  let apis = [];
  if (!withoutInit) {
    apis = getAppSyncAPIDetails(context);
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
  if (!projects.length && withoutInit) {
    context.print.info(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
    return;
  }

  for (const cfg of projects) {
    const includeFiles = path.join(projectPath, cfg.includes[0]);
    const opsGenDirectory = cfg.amplifyExtension.docsFilePath
      ? path.join(projectPath, cfg.amplifyExtension.docsFilePath)
      : path.dirname(path.dirname(includeFiles));
    const schemaPath = path.join(projectPath, cfg.schema);
    let region;
    let frontend;
    if (!withoutInit) {
      ({ region } = cfg.amplifyExtension);
      await ensureIntrospectionSchema(context, schemaPath, apis[0], region, forceDownloadSchema);
      frontend = getFrontEndHandler(context);
    } else {
      frontend = decoupleFrontend;
    }
    const language = frontend === 'javascript' ? cfg.amplifyExtension.codeGenTarget : 'graphql';

    const opsGenSpinner = new Ora(constants.INFO_MESSAGE_OPS_GEN);
    opsGenSpinner.start();

    try {
      const schemaData = readSchemaFromFile(schemaPath);
      const relativeTypesPath = cfg.amplifyExtension.generatedFileName
        ? path.relative(opsGenDirectory, cfg.amplifyExtension.generatedFileName)
        : null;
      try {
        generateStatementsHelper({
          schema: schemaData,
          target: language,
          outputDir: opsGenDirectory,
          maxDepth: maxDepth || cfg.amplifyExtension.maxDepth,
          useExternalFragmentForS3Object: language === 'graphql',
          // default typenameIntrospection to true when not set
          typenameIntrospection:
            cfg.amplifyExtension.typenameIntrospection === undefined ? true : !!cfg.amplifyExtension.typenameIntrospection,
          relativeTypesPath,
        });
        opsGenSpinner.succeed(constants.INFO_MESSAGE_OPS_GEN_SUCCESS + path.relative(path.resolve('.'), opsGenDirectory));
      } catch {
        context.print.warning('No GraphQL statements are generated. Check if the introspection schema has GraphQL operations defined.');
      }
    } finally {
      opsGenSpinner.stop();
    }
  }
}

module.exports = generateStatements;
