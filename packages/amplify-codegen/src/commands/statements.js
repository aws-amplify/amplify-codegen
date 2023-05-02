const path = require('path');
const fs = require('fs-extra');
const Ora = require('ora');

const loadConfig = require('../codegen-config');
const constants = require('../constants');
const { ensureIntrospectionSchema, getFrontEndHandler, getAppSyncAPIDetails, readSchemaFromFile, GraphQLStatementsFormatter } = require('../utils');
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
    if (!Object.keys(FILE_EXTENSION_MAP).includes(language)) {
      throw new Error(`Language ${language} not supported`);
    }

    const opsGenSpinner = new Ora(constants.INFO_MESSAGE_OPS_GEN);
    opsGenSpinner.start();

    try {
      fs.ensureDirSync(opsGenDirectory);
      const schemaData = readSchemaFromFile(schemaPath);
      const generatedOps = generateGraphQLDocuments(schemaData, {
        maxDepth: maxDepth || cfg.amplifyExtension.maxDepth,
        useExternalFragmentForS3Object: (language === 'graphql'),
        // default typenameIntrospection to true when not set
        typenameIntrospection:
          cfg.amplifyExtension.typenameIntrospection === undefined ? true : !!cfg.amplifyExtension.typenameIntrospection,
      });
      if(!generatedOps) {
        context.print.warning('No GraphQL statements are generated. Check if the introspection schema has GraphQL operations defined.');
      }
      else {
        await writeGeneratedDocuments(language, generatedOps, opsGenDirectory);
        opsGenSpinner.succeed(constants.INFO_MESSAGE_OPS_GEN_SUCCESS + path.relative(path.resolve('.'), opsGenDirectory));
      }
    } finally {
      opsGenSpinner.stop();
    }
  }
}

async function writeGeneratedDocuments(language, generatedStatements, outputPath) {
  const fileExtension = FILE_EXTENSION_MAP[language];

  ['queries', 'mutations', 'subscriptions'].forEach(op => {
    const ops = generatedStatements[op];
    if (ops && ops.size) {
      const formattedStatements = (new GraphQLStatementsFormatter(language)).format(ops);
      const outputFile = path.resolve(path.join(outputPath, `${op}.${fileExtension}`));
      fs.writeFileSync(outputFile, formattedStatements);
    }
  });

  if (fileExtension === 'graphql') {
    // External Fragments are rendered only for GraphQL targets
    const fragments = generatedStatements['fragments'];
    if (fragments.size) {
      const formattedStatements = (new GraphQLStatementsFormatter(language)).format(fragments);
      const outputFile = path.resolve(path.join(outputPath, `fragments.${fileExtension}`));
      fs.writeFileSync(outputFile, formattedStatements);
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
