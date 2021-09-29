const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const PUBSPEC_FILE_NAME = require('./validateDartSDK');

function validateAmplifyFlutter(context, projectRoot) {
  try {
    const config = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_FILE_NAME), 'utf8'));
    const version = semver.minVersion(config.dependencies.amplify_flutter);
    if (semver.satisfies(version, '>= 0.3.0')) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = { PUBSPEC_FILE_NAME, validateAmplifyFlutter };
