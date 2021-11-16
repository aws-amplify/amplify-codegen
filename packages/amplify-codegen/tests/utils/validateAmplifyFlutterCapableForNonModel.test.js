const { PUBSPEC_FILE_NAME } = require('../../src/utils/validateDartSDK');
const { validateAmplifyFlutterCapableForNonModel } = require('../../src/utils/validateAmplifyFlutterCapableForNonModel');
const mockFs = require('mock-fs');
const { join } = require('path');
const yaml = require('js-yaml');
const { printer } = require('amplify-prompts');

jest.mock('amplify-prompts', () => ({
  printer: {
    error: jest.fn()
  },
}));

const MOCK_PROJECT_ROOT = 'project';
const MOCK_PUBSPEC_FILE_PATH = join(MOCK_PROJECT_ROOT, PUBSPEC_FILE_NAME);
const mockErrorPrinter = printer.error;

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
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with caret version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '^0.3.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with ranged version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '>=0.3.0 <1.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with prerelease version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '0.3.0-rc.4',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(true);
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
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with caret version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '^0.2.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with ranged version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '>=0.2.0 <1.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with prerelease version', () => {
      const config = {
        dependencies: {
          amplify_flutter: '0.3.0-rc.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
    });
  });

  it('should return false if the sdk version cannot be found', () => {
    const config = {};
    mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
    expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
  });

  describe('when yaml file cannot be correctly loaded', () => {
    let loadSpy;
    beforeAll(() => {
      mockErrorPrinter.mockClear();
      loadSpy = jest.spyOn(yaml, 'load');
      loadSpy.mockImplementation(() => {
        throw Error("Cannot read yaml file.");
      });
    });

    afterAll(() => {
      loadSpy.mockClear();
      mockErrorPrinter.mockClear();
    })

    it('should print error when error is thrown while loading yaml file', () => {
      const config = {};
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });

      expect(validateAmplifyFlutterCapableForNonModel(MOCK_PROJECT_ROOT)).toBe(false);
      expect(mockErrorPrinter).toHaveBeenCalledTimes(3);
    });
  });
});
