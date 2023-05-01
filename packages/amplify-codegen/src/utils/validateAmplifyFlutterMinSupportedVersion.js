const { validateAmplifyFlutterVersion } = require('./validateAmplifyFlutterVersion');

const MINIMUM_SUPPORTED_VERSION_CONSTRAINT = '>=0.6.0';

function validateAmplifyFlutterMinSupportedVersion(projectRoot) {
  return validateAmplifyFlutterVersion(projectRoot, MINIMUM_SUPPORTED_VERSION_CONSTRAINT);
}

module.exports = { validateAmplifyFlutterMinSupportedVersion, MINIMUM_SUPPORTED_VERSION_CONSTRAINT };