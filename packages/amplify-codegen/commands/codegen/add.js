const codeGen = require('../../src/index');
const constants = require('../../src/constants');

const featureName = 'add';

module.exports = {
  name: featureName,
  run: async context => {
    try {
      const { options = {} } = context.parameters;
      const keys = Object.keys(options);
      // frontend and framework are undocumented, but are read when apiId is also supplied
      const { apiId = null, region, yes, frontend, framework, ...rest } = context.parameters.options;
      const extraOptions = Object.keys(rest);
      console.log(extraOptions);
      if (extraOptions.length) {
        const paramMsg = extraOptions.length > 1 ? 'Invalid parameters ' : 'Invalid parameter ';
        context.print.info(`${paramMsg} ${keys.join(', ')}`);
        context.print.info(constants.INFO_MESSAGE_ADD_ERROR);
        return;
      }
      await codeGen.add(context, apiId, region);
    } catch (ex) {
      context.print.error(ex.message);
    }
  },
};
