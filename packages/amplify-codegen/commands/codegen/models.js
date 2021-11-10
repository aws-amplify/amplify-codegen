const codeGen = require('../../src');
const { exitOnNextTick } = require('amplify-cli-core');
const featureName = 'models';

module.exports = {
  name: featureName,
  run: async context => {
    try {
      await codeGen.generateModels(context);
    } catch (ex) {
      if(ex.message) {
        context.print.error(ex.message);
      }
      else {
        console.log(ex.stack);
      }
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};
