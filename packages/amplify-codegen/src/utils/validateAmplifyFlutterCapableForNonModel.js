const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const { printer } = require('amplify-prompts');

const { PUBSPEC_FILE_NAME } = require('./validateDartSDK');

function validateAmplifyFlutterCapableForNonModel(projectRoot) {
  try {
    const config = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_FILE_NAME), 'utf8'));
    //check dependency version
    const version = semver.minVersion(config.dependencies.amplify_flutter);
    if (semver.satisfies(version, '>= 0.3.0 || >= 0.3.0-rc.2')) {
      return true;
    }
    return false;
  } catch (e) {
    if (e.stack) {
      printer.error(e.stack);
      printer.error(e.message);
    }

    printer.error('An error occurred while parsing ' + PUBSPEC_FILE_NAME + '.');
    return false;
  }
}

module.exports = { validateAmplifyFlutterCapableForNonModel };
