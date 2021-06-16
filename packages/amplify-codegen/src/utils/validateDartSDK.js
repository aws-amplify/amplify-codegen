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
      context.print.warning(
        '\nDetected dart SDK satisfies the minimum version of 2.12.0. Null safety feature will be applied depending on feature flag value(default enabled for new projects and disabled for old ones).',
      );
      return true;
    }
    context.print.warning('\nDetected dart SDK does not satisfy the minimum version of 2.12.0. Null safety feature will be disabled.');
    return false;
  } catch (e) {
    context.print.warning(
      '\nCannot find dart sdk version. Null safety feature will be applied depending on feature flag value(default enabled for new projects and disabled for old ones).',
    );
    return true;
  }
}

module.exports = { PUBSPEC_FILE_NAME, validateDartSDK };
