const { validateAmplifyFlutterVersion } = require('./validateAmplifyFlutterVersion');

const MINIMUM_VERSION_CONSTRAINT = '>= 0.3.0 || >= 0.3.0-rc.2';

function validateAmplifyFlutterCapableZeroThreeFeatures(projectRoot) {
  return validateAmplifyFlutterVersion(projectRoot, MINIMUM_VERSION_CONSTRAINT);
}

module.exports = { validateAmplifyFlutterCapableZeroThreeFeatures };
