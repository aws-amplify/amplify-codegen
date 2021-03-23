const codeGen = require('./codegen');
const { exitOnNextTick } = require('amplify-cli-core');
const featureName = 'types';

module.exports = {
  name: featureName,
  run: async context => {
    try {
      await codeGen(context);
    } catch (ex) {
      context.print.info(ex.message);
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};
