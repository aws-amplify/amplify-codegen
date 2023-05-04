const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');

const PUBSPEC_LOCK_FILE_NAME = 'pubspec.lock';

function validateAmplifyFlutterVersion(projectRoot, versionConstraint) {
  try {
    const lockFile = yaml.load(fs.readFileSync(path.join(projectRoot, PUBSPEC_LOCK_FILE_NAME), 'utf8'));
    // check resolved dependency version written pubspec.lock file
    const { version } = lockFile.packages.amplify_flutter || {};
    // For this util function it check only if the amplify_flutter version satisfies the given version constraint
    if (semver.satisfies(version, versionConstraint, { includePrerelease: true })) {
      return true;
    }
    return false;
  } catch (e) {
    if (e.stack) {
      console.log(e.stack);
      console.log(e.message);
    }

    console.log(
      `An error occurred while parsing ${PUBSPEC_LOCK_FILE_NAME}. If you haven't, run \`flutter pub get\` to ensure generating the ${PUBSPEC_LOCK_FILE_NAME} file.`,
    );
    return false;
  }
}

module.exports = { validateAmplifyFlutterVersion, PUBSPEC_LOCK_FILE_NAME };
