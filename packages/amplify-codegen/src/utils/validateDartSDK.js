const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const pubspecFile = 'pubspec.yaml';

function validateDartSDK(context, projectRoot) {
  try {
    const config = yaml.load(fs.readFileSync(path.join(projectRoot, pubspecFile), 'utf8'));
    const version = semver.minVersion(config.environment.sdk);
    if (semver.satisfies(version, '>= 2.12.0')) {
      context.print.warning(
        '\nDetect dart SDK satisfies the minimum version of 2.12.0. Null safety feature will be applied in new projects while old projects need to switch the feature flag value manually.',
      );
      return true;
    }
    context.print.warning('\nDetect dart SDK does not satisfy the minimum version of 2.12.0. Null safety feature will be disabled.');
    return false;
  } catch (e) {
    context.print.warning('\nCannot find dart sdk version. Null safety feature will be disabled.');
    return false;
  }
}

module.exports = validateDartSDK;
