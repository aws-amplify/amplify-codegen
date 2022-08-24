const codeGen = require('../../src');
const { exitOnNextTick } = require('amplify-cli-core');
const featureName = 'model-introspection';
const path = require('path');

module.exports = {
  name: featureName,
  run: async context => {
    try {
      // Verify override path flag is provided
      const outputDirParam = context.parameters.options ? context.parameters.options['output-dir'] : null;
      if ( !outputDirParam ) {
        throw new Error('Expected --output-dir flag to be set for model introspection command.');
      }
      const outputDirPath = path.isAbsolute(outputDirParam) ? outputDirParam : path.join(context.amplify.getEnvInfo().projectPath, outputDirParam);
      await codeGen.generateModels(context, outputDirPath, true);
    } catch (ex) {
      context.print.info(ex.message);
      console.log(ex.stack);
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};