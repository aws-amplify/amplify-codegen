const path = require('path');

/**
 * Retrieve the specified model schema path parameter, returning as an absolute path.
 * @param context the CLI invocation context
 * @returns the absolute path to the model schema path
 */
function getModelSchemaPathParam(context) {
  const modelSchemaPathParam = context.parameters?.options?.['model-schema'];
  if ( !modelSchemaPathParam ) {
    return null;
  }
  let projectRoot;
  try {
    context.amplify.getProjectMeta();
    projectRoot = context.amplify.getEnvInfo().projectPath;
  } catch (e) {
    projectRoot = process.cwd();
  }
  return path.isAbsolute(modelSchemaPathParam) ? modelSchemaPathParam : path.join(projectRoot, modelSchemaPathParam);
}

module.exports = getModelSchemaPathParam;
