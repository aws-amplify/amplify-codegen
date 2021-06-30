const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const PUBSPEC_FILE_NAME = 'pubspec.yaml';

function validateDartSDK(context, projectRoot) {
  try {
    const config = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_FILE_NAME), 'utf8'));
    const version = semver.minVersion(config.environment.sdk);
    if (semver.satisfies(version, '>= 2.12.0')) {
      context.print.warning('\nDetected Dart SDK version 2.12.0 or above');
      return true;
    }
    context.print.warning('\nDetected Dart SDK version below 2.12.0');
    return false;
  } catch (e) {
    context.print.warning('\nCould not detect Dart SDK version, defaulting to 2.12.0');
    return true;
  }
}

module.exports = { PUBSPEC_FILE_NAME, validateDartSDK };
