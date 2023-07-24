const AmplifyCodeGenConfig = require('./AmplifyCodeGenConfig');
const fs = require('fs-extra');
const path = require('path');

let config = null;

function loadConfig(context, withoutInit = false) {
  if (!config) {
    const projectPath = withoutInit ? undefined : context.amplify.getEnvInfo().projectPath;
    config = new AmplifyCodeGenConfig(projectPath);
  }
  return config;
}

function getCodegenConfig(projectPath) {
  if (!projectPath) {
    throw new Error('Invalid projectPath provided to get codegen configuration');
  }

  if (!fs.existsSync(projectPath)) {
    throw new Error(`Provided projectPath for getting the codegen configuration does not exist: ${projectPath}`);
  }

  if (!fs.existsSync(path.join(projectPath, AmplifyCodeGenConfig.configFileName))) {
    throw new Error(`Cannot find the codegen configuration file at provided projectPath: ${projectPath}`);
  }

  const codegenConfig = new AmplifyCodeGenConfig(projectPath);
  if (!codegenConfig) {
    throw new Error(`Fetched codegen configuration is empty: ${codegenConfig}`);
  }

  const projects = codegenConfig.getProjects();
  if (!projects.length > 0) {
    throw new Error(`No projects were found in fetched codegen configuration: ${codegenConfig}`);
  }

  const cfg = projects[0];
  const includeFiles = cfg.includes[0];

  const opsGenDirectory = cfg.amplifyExtension.docsFilePath
    ? cfg.amplifyExtension.docsFilePath
    : path.dirname(path.dirname(includeFiles));

  const { generatedFileName } = cfg.amplifyExtension || {};
  const { maxDepth } = cfg.amplifyExtension || {};

  return {
    getGeneratedQueriesPath: function() {
      return path.join(opsGenDirectory, 'queries');
    },
    getGeneratedMutationsPath: function() {
      return path.join(opsGenDirectory, 'mutations');
    },
    getGeneratedSubscriptionsPath: function() {
      return path.join(opsGenDirectory, 'subscriptions');
    },
    getGeneratedFragmentsPath: function() {
      return path.join(opsGenDirectory, 'fragments');
    },
    getGeneratedTypesPath: function() {
      if (!generatedFileName || generatedFileName === '') {
        return;
      }
      return path.normalize(generatedFileName);
    },
    getQueryMaxDepth: function() {
      if (!maxDepth || !Number(maxDepth)) {
        return;
      }
      return Number(maxDepth);
    }
  }
}

module.exports = { loadConfig, getCodegenConfig };
