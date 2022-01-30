const { validateAmplifyFlutterVersion } = require('./validateAmplifyFlutterVersion');

const MINIMUM_VERSION_CONSTRAINT = '>= 0.4.0 || >= 0.4.0-rc.2';

function validateAmplifyFlutterCoreLibraryDependency(projectRoot) {
  return validateAmplifyFlutterVersion(projectRoot, MINIMUM_VERSION_CONSTRAINT);
}

module.exports = { validateAmplifyFlutterCoreLibraryDependency };
