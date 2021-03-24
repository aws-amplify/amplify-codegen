const path = require('path');
const constants = require('./constants');
const add = require('./commands/add');

const pluginName = 'codegen';

async function executeAmplifyCommand(context) {
  let commandPath = path.normalize(path.join(__dirname, '../commands'));
  commandPath = path.join(commandPath, pluginName, context.input.command);
  const commandModule = require(commandPath);
  await commandModule.run(context);
}

async function handleAmplifyEvent(context, args) {
  context.print.info(`${pluginName} handleAmplifyEvent to be implemented`);
  context.print.info(`Received event args ${args}`);
}

/**
 * Entry point for headless commands
 * @param {any} context The amplify context object
 * @param {string} headlessPayload The serialized payload from the platform
 */
async function executeAmplifyHeadlessCommand(context, headlessPayload) {
  switch (context.input.command) {
    case 'add':
      await context.amplify.constructExeInfo(context);
      context.exeInfo.inputParams[constants.Label] = JSON.parse(headlessPayload);
      await add(context);
      break;
    default:
      context.print.error(`Headless mode for ${context.input.command} codegen is not implemented yet`);
  }
};

module.exports = {
  executeAmplifyCommand,
  executeAmplifyHeadlessCommand,
  handleAmplifyEvent,
};
