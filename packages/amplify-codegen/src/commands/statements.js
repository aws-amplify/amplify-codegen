const path = require('path');
const fs = require('fs-extra');
const Ora = require('ora');

const loadConfig = require('../codegen-config');
const constants = require('../constants');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails, loadSchema, isSDLSchema } = require('../utils');
const { generateGraphQLDocuments } = require('@aws-amplify/graphql-docs-generator');

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
      fs.ensureDirSync(opsGenDirectory);
      const schemaData = loadSchema(schemaPath);
      const generatedOps = generateGraphQLDocuments(schemaData, {
        maxDepth: maxDepth || cfg.amplifyExtension.maxDepth,
        // default typenameIntrospection to true when not set
        typenameIntrospection:
          cfg.amplifyExtension.typenameIntrospection === undefined ? true : !!cfg.amplifyExtension.typenameIntrospection,
      });
      await writeGeneratedStatements(language, generatedOps, opsGenDirectory, true);
      opsGenSpinner.succeed(constants.INFO_MESSAGE_OPS_GEN_SUCCESS + path.relative(path.resolve('.'), opsGenDirectory));
    } finally {
      opsGenSpinner.stop();
    }
  }
}

async function writeGeneratedStatements(language, generatedStatements, outputPath, separateFiles) {
  const fileExtension = FILE_EXTENSION_MAP[language];
  if(!generatedStatements) {
    return;
  }
  if (separateFiles) {
    ['queries', 'mutations', 'subscriptions', 'fragments'].forEach(op => {
      const ops = generatedStatements[op];
      if (ops.length) {
        fs.writeFileSync(path.resolve(path.join(outputPath, `${op}.${fileExtension}`)), ops);
      }
    });
  } else {
    const ops = [
      ...generatedStatements.queries,
      ...generatedStatements.mutations,
      ...generatedStatements.subscriptions,
      ...generatedStatements.fragments
    ].join();
    if (ops.length) {
      fs.writeFileSync(path.resolve(outputPath), ops);
    }
  }
}

const FILE_EXTENSION_MAP = {
  javascript: 'js',
  graphql: 'graphql',
  flow: 'js',
  typescript: 'ts',
  angular: 'graphql',
}

module.exports = generateStatements;
