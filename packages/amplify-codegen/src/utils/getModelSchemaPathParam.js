const path = require('path');
const getProjectRoot = require('./getProjectRoot');

/**
 * Retrieve the specified model schema path parameter, returning as an absolute path.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the CLI invocation context
 * @returns {string | null} the absolute path to the model schema path
 */
const getModelSchemaPathParam = (context) => {
  const modelSchemaPathParam = context.parameters?.options?.['model-schema'];
  if ( !modelSchemaPathParam ) {
    return null;
  }
  return path.isAbsolute(modelSchemaPathParam) ? modelSchemaPathParam : path.join(getProjectRoot(context), modelSchemaPathParam);
};

/**
 * Retrieve whether or not a model schema path param was specified during invocation.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the CLI invocation context
 * @returns {!boolean} whether or not a model schema path param is specified via the CLI
 */
const hasModelSchemaPathParam = (context) => getModelSchemaPathParam(context) !== null;

module.exports = {
  getModelSchemaPathParam,
  hasModelSchemaPathParam,
};
