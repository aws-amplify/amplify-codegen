const codeGen = require('../../src');
const { exitOnNextTick } = require('@aws-amplify/amplify-cli-core');
const getOutputDirParam = require('../../src/utils/getOutputDirParam');

const featureName = 'models';

module.exports = {
  name: featureName,
  run: async context => {
    try {
      await codeGen.generateModels(context, { overrideOutputDir: getOutputDirParam(context, false) });
    } catch (ex) {
      context.print.info(ex.message);
      console.log(ex.stack);
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};
