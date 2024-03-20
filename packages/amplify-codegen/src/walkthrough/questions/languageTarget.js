const inquirer = require('inquirer');

const constants = require('../../constants');
const { AmplifyCodeGenNotSupportedError } = require('../../errors');
const { getFrontEndHandler, getFrontEndFramework } = require('../../utils');

const frontEndToTargetMappings = {
  ios: ['swift'],
  javascript: ['javascript', 'typescript', 'flow'],
  angular: ['angular', 'typescript'],
};

async function askCodeGenTargetLanguage(context, target, withoutInit = false, decoupleFrontend = '', decoupleFramework = '') {
  let frontend = decoupleFrontend;
  if (!withoutInit) {
    frontend = getFrontEndHandler(context);
  }

  //flutter only supports modelgen but the amplify graphql codegen
  if (frontend === 'flutter') {
    throw new AmplifyCodeGenNotSupportedError(constants.ERROR_FLUTTER_CODEGEN_NOT_SUPPORTED);
  }

  const isAngular =
    frontend === 'javascript' && getFrontEndFramework(context, withoutInit, decoupleFrontend, decoupleFramework) === 'angular';
  const isIonic = frontend === 'javascript' && getFrontEndFramework(context, withoutInit, decoupleFrontend, decoupleFramework) === 'ionic';
  const targetLanguage = isAngular || isIonic ? 'angular' : frontend;
  const targetMapping = frontEndToTargetMappings[targetLanguage];
  if (!targetMapping || !targetMapping.length) {
    throw new AmplifyCodeGenNotSupportedError(`${frontend} ${constants.ERROR_CODEGEN_TARGET_NOT_SUPPORTED}`);
  }

  if (targetMapping.length === 1) {
    return targetMapping[0];
  }

  const answer = await inquirer.prompt([
    {
      name: 'target',
      type: 'list',
      message: constants.PROMPT_MSG_CODEGEN_TARGET,
      choices: targetMapping,
      default: target || null,
    },
  ]);

  /**
   * Angular v6 codegen is default for new projects
   * This will not break the existing angular v5 users as the codegen is executed based on .graphqlconfig.yml
   * whose content will not be modified unless a re-run of `amplify codegen configure` for existing projects
   * The v5 target is still available in new projects by manually editing the .graphqlconfig.yml file
   * to change the `codeGenTarget` to `angular` instead of `angularv6`
   */

  if (answer.target === 'angular') {
    return 'angularv6';
  }

  return answer.target;
}

module.exports = askCodeGenTargetLanguage;
