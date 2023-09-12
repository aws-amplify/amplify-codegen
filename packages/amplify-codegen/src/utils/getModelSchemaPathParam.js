const path = require('path');

const modelSchemaParamKey = 'model-schema';
/**
 * Retrieve the specified model schema path parameter, returning as an absolute path.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the CLI invocation context
 * @returns {string | null} the absolute path to the model schema path
 */
const getModelSchemaPathParam = (context) => {
  const modelSchemaPathParam = context.parameters?.options?.[modelSchemaParamKey];
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
};

/**
 * Retrieve whether or not a model schema path param was specified during invocation.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the CLI invocation context
 * @returns {!boolean} whether or not a model schema path param is specified via the CLI
 */
const hasModelSchemaPathParam = (context) => context?.parameters?.options
  && Object.keys(context.parameters.options).find((optionKey) => optionKey === modelSchemaParamKey) !== undefined;

module.exports = {
  getModelSchemaPathParam,
  hasModelSchemaPathParam,
};
