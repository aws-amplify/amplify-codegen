const codeGen = require('../../src');
const { exitOnNextTick } = require('@aws-amplify/amplify-cli-core');
const featureName = 'model-introspection';

module.exports = {
  name: featureName,
  run: async context => {
    try {
      await codeGen.generateModelIntrospection(context);
    } catch (ex) {
      context.print.info(ex.message);
      console.log(ex.stack);
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};
