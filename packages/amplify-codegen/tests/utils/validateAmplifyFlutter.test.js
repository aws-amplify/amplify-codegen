const { validateDartSDK, PUBSPEC_FILE_NAME } = require('../../src/utils/validateDartSDK');
const { validateAmplifyFlutter } = require('../../src/utils/validateAmplifyFlutter');
const mockFs = require('mock-fs');
const { join } = require('path');
const yaml = require('js-yaml');

const MOCK_PROJECT_ROOT = 'project';
const MOCK_PUBSPEC_FILE_PATH = join(MOCK_PROJECT_ROOT, PUBSPEC_FILE_NAME);

describe('Validate amplify flutter version tests', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('should return true if the minimum version is greater and equal to 0.3.0', () => {
    it('with fixed version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '0.3.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with caret version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '^0.3.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with ranged version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '>=0.3.0 <1.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(true);
    });
  });

  describe('should return false if the minimum version is less than 0.3.0', () => {
    it('with fixed version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '0.2.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with caret version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '^0.2.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with ranged version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '>=0.2.0 <1.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(false);
    });
  });

  it('should return false if the sdk version cannot be found', () => {
    const config = {};
    mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
    expect(validateAmplifyFlutter(MOCK_PROJECT_ROOT)).toBe(false);
  });
});
