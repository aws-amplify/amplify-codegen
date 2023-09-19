/**
 * Find the project root.
 * @param {!import('@aws-amplify/amplify-cli-core').$TSContext} context the amplify runtime context
 * @returns {!string} the project root, or cwd
 */
const getProjectRoot = (context) => {
  try {
    return context.amplify.getEnvInfo().projectPath;
  } catch (_) {
    return process.cwd();
  }
  };

module.exports = getProjectRoot;
