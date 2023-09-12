const path = require('path');

/**
 * Retrieve the output directory parameter from the command line. Throws on invalid value,
 *   or if isRequired is set and the flag isn't in the options. Returns null on optional and not defined.
 * @param context the CLI invocation context
 * @param isRequired whether or not the flag is required
 * @returns the absolute path to the output directory
 */
function getOutputDirParam(context, isRequired) {
  const outputDirParam = context.parameters?.options?.['output-dir'];
  if ( isRequired && !outputDirParam ) {
    throw new Error('Expected --output-dir flag to be set');
  }
  if ( !outputDirParam ) {
    return null;
  }
  let projectRoot;
  try {
    projectRoot = context.amplify.getEnvInfo().projectPath;
  } catch (e) {
    projectRoot = process.cwd();
  }
  return path.isAbsolute(outputDirParam) ? outputDirParam : path.join(projectRoot, outputDirParam);
}

module.exports = getOutputDirParam;
