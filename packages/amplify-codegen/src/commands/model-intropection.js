const generateModels = require('./models');
const path = require('path');

async function generateModelIntrospection(context) {
  // Verify override path flag is provided
  const outputDirParam = context.parameters.options ? context.parameters.options['output-dir'] : null;
  if ( !outputDirParam || typeof(outputDirParam) !== 'string' ) {
    throw new Error('Expected --output-dir flag with value to be set for model introspection command.');
  }
  const outputDirPath = path.isAbsolute(outputDirParam) ? outputDirParam : path.join(context.amplify.getEnvInfo().projectPath, outputDirParam);
  await generateModels(context, outputDirPath, true);
}

module.exports = generateModelIntrospection;