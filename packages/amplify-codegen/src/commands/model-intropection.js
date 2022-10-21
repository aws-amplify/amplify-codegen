const generateModels = require('./models');
const getOutputDirParam = require('../utils/getOutputDirParam');

/**
 * Generate the model introspection file for the input schema, and write to disk based on
 * the output-dir flag passed in by the customer.
 */
async function generateModelIntrospection(context) {
  await generateModels(context, {
    overrideOutputDir: getOutputDirParam(context, true),
    isIntrospection: true,
  });
}

/**
 * Compute the model introspection schema and return in-memory.
 * @param context the CLI context, necessary for file locations and feature flags.
 * @returns the latest version of the model introspection schema shape.
 */
async function getModelIntrospection(context) {
  const generatedCode = await generateModels(context, {
    overrideOutputDir: '.', // Needed to get output working, not used, since writeToDisk is disabled.
    isIntrospection: true,
    writeToDisk: false,
  });

  if (generatedCode.length !== 1) {
    throw new Error('Expected a single output to be generated for model introspection.');
  }

  return JSON.parse(generatedCode[0]);
}

module.exports = {
  generateModelIntrospection,
  getModelIntrospection,
};
