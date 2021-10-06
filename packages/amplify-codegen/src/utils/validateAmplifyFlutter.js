const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const { PUBSPEC_FILE_NAME } = require('./validateDartSDK');

function validateAmplifyFlutter(projectRoot) {
  try {
    const config = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_FILE_NAME), 'utf8'));
    //path exists for local testing
    if (config.dependencies.amplify_flutter.path) {
      return true;
    }
    //check dependency version
    const version = semver.minVersion(config.dependencies.amplify_flutter);
    if (semver.satisfies(version, '>= 0.3.0 || >= 0.3.0-rc.2')) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = { validateAmplifyFlutter };
