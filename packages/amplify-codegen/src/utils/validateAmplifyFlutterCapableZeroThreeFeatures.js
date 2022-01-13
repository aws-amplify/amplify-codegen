const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const PUBSPEC_LOCK_FILE_NAME = 'pubspec.lock';
const MINIMUM_VERSION_CONSTRAIN = '>= 0.3.0 || >= 0.3.0-rc.2';

function validateAmplifyFlutterCapableZeroThreeFeatures(projectRoot) {
  try {
    const lockFile = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_LOCK_FILE_NAME), 'utf8'));
    // check resolved dependency version written pubspec.lock file
    const { version } = lockFile.packages.amplify_flutter || {};
    // For this util function it check only if the amplify_flutter version is great than the minimum version
    // and it's not concerned with prerelease range, hence including prerelease to ensure
    // 0.4.0-rc.2 > 0.3.0-rc.2 is true
    if (semver.satisfies(version, MINIMUM_VERSION_CONSTRAIN, { includePrerelease: true })) {
      return true;
    }
    return false;
  } catch (e) {
    if (e.stack) {
      console.log(e.stack);
      console.log(e.message);
    }

    console.log('An error occurred while parsing ' + PUBSPEC_LOCK_FILE_NAME + '.');
    return false;
  }
}

module.exports = { validateAmplifyFlutterCapableZeroThreeFeatures, PUBSPEC_LOCK_FILE_NAME, MINIMUM_VERSION_CONSTRAIN };
