const codeGen = require('../../src');
const { exitOnNextTick } = require('amplify-cli-core');
var path = require('path');

module.exports = {
  name: 'introspection',
  run: async context => {
    try {
      // Verify override path flag is provided
      const outputFileParam = context.input.options ? context.input.options['output-file'] : null;
      if (!outputFileParam) {
        throw new Error('Expected --output-file flag to be set for introspection command.');
      }

      const outputFilePath = path.isAbsolute(outputFileParam) ? outputFileParam : path.join(context.amplify.getEnvInfo().projectPath, outputFileParam);
      await codeGen.generateModels(context, { generateIntrospectionSchema: true, outputFilePath });
    } catch (ex) {
      context.print.info(ex.message);
      console.log(ex.stack);
      await context.usageData.emitError(ex);
      exitOnNextTick(1);
    }
  },
};
