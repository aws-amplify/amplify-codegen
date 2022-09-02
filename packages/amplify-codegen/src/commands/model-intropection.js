const generateModels = require('./models');
const getOutputDirParam = require('../utils/getOutputDirParam');

async function generateModelIntrospection(context) {
  await generateModels(context, getOutputDirParam(context, true), true);
}

module.exports = generateModelIntrospection;
