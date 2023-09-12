const path = require('path');
const getProjectRoot = require('./getProjectRoot');

/**
 * Retrieve the output directory parameter from the command line. Throws on invalid value,
 *   or if isRequired is set and the flag isn't in the options. Returns null on optional and not defined.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the CLI invocation context
 * @param {!boolean} isRequired whether or not the flag is required
 * @returns {!string} the absolute path to the output directory
 */
function getOutputDirParam(context, isRequired) {
  const outputDirParam = context.parameters?.options?.['output-dir'];
  if ( isRequired && !outputDirParam ) {
    throw new Error('Expected --output-dir flag to be set');
  }
  if ( !outputDirParam ) {
    return null;
  }
  return path.isAbsolute(outputDirParam) ? outputDirParam : path.join(getProjectRoot(context), outputDirParam);
}

module.exports = getOutputDirParam;
