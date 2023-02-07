const generateTypes = require('./commands/types');
const generateStatements = require('./commands/statements');
const generate = require('./commands/generateStatementsAndType');
const add = require('./commands/add');
const remove = require('./commands/remove');
const configure = require('./commands/configure');
const generateModels = require('./commands/models');
const { generateModelIntrospection, getModelIntrospection } = require('./commands/model-intropection');
const { isCodegenConfigured, switchToSDLSchema } = require('./utils');
const prePushAddGraphQLCodegenHook = require('./callbacks/prePushAddCallback');
const prePushUpdateGraphQLCodegenHook = require('./callbacks/prePushUpdateCallback');
const postPushGraphQLCodegenHook = require('./callbacks/postPushCallback');
const { executeAmplifyCommand, executeAmplifyHeadlessCommand, handleAmplifyEvent } = require('./amplify-plugin-index');

module.exports = {
  configure,
  generate,
  generateTypes,
  generateStatements,
  add,
  remove,
  prePushAddGraphQLCodegenHook,
  prePushUpdateGraphQLCodegenHook,
  postPushGraphQLCodegenHook,
  isCodegenConfigured,
  switchToSDLSchema,
  executeAmplifyCommand,
  executeAmplifyHeadlessCommand,
  handleAmplifyEvent,
  generateModels,
  generateModelIntrospection,
  getModelIntrospection,
};
