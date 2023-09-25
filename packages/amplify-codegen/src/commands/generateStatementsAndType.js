const { join } = require('path');
const { AmplifyCodeGenNoAppSyncAPIAvailableError: NoAppSyncAPIAvailableError } = require('../errors');
const generateTypes = require('./types');
const generateStatements = require('./statements');
const { loadConfig } = require('../codegen-config');
const constants = require('../constants');
const { ensureIntrospectionSchema, getAppSyncAPIDetails, getAppSyncAPIInfoFromProject } = require('../utils');
const path = require('path');
const fs = require('fs-extra');

async function generateStatementsAndTypes(context, forceDownloadSchema, maxDepth) {
  let withoutInit = false;
  // Determine if working in an amplify project
  try {
    context.amplify.getProjectMeta();
  } catch (e) {
    withoutInit = true;
  }

  const config = loadConfig(context, withoutInit);
  const projects = config.getProjects();
  if (!projects.length) {
    throw new NoAppSyncAPIAvailableError(constants.ERROR_CODEGEN_NO_API_CONFIGURED);
  }
  const project = projects[0];
  const schemaPath = ['schema.graphql', 'schema.json'].map(p => path.join(process.cwd(), p)).find(p => fs.existsSync(p));
  if (withoutInit && !project && !schemaPath) {
    throw Error(
      `Please download the schema.graphql or schema.json and place in ${process.cwd()} before adding codegen when not in an amplify project`,
    );
  }

  let apis = [];
  if (!withoutInit) {
    apis = getAppSyncAPIDetails(context);
  } else {
    const api = await getAppSyncAPIInfoFromProject(context, project);
    if (api) {
      apis = [api];
    }
  }
  if (!apis.length && !withoutInit) {
    throw new NoAppSyncAPIAvailableError(constants.ERROR_CODEGEN_NO_API_META);
  }
  const { frontend } = project.amplifyExtension;
  let projectPath = process.cwd();
  if (!withoutInit) {
    ({ projectPath } = context.amplify.getEnvInfo());
  }

  let downloadPromises;
  if (apis.length) {
    downloadPromises = projects.map(
      async cfg =>
        await ensureIntrospectionSchema(context, join(projectPath, cfg.schema), apis[0], cfg.amplifyExtension.region, forceDownloadSchema),
    );
    await Promise.all(downloadPromises);
  }
  await generateStatements(context, false, maxDepth, withoutInit, frontend);
  await generateTypes(context, false, withoutInit, frontend);
}

module.exports = generateStatementsAndTypes;
