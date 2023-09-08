const inquirer = require('inquirer');
const { getOutputFileName } = require('@aws-amplify/graphql-types-generator');

const constants = require('../../constants');

async function askGeneratedFileName(name, target) {
  const answers = await inquirer.prompt([
    {
      name: 'generatedFileName',
      type: 'input',
      message: constants.PROMPT_MSG_FILE_NAME,
      default: getOutputFileName(name, target),
    },
  ]);
  return answers.generatedFileName;
}

module.exports = askGeneratedFileName;
