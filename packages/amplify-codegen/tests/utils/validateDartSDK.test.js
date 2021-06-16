const { validateDartSDK, PUBSPEC_FILE_NAME } = require('../../src/utils/validateDartSDK');
const mockFs = require('mock-fs');
const { join } = require('path');
const yaml = require('js-yaml');

const MOCK_PROJECT_ROOT = 'project';
const MOCK_PUBSPEC_FILE_PATH = join(MOCK_PROJECT_ROOT, PUBSPEC_FILE_NAME);
const MOCK_CONTEXT = {
  print: {
    warning: jest.fn(),
  },
};

describe('Validate Dart SDK version tests', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('should return true if the minimum version is greater and equal to 2.12.0', () => {
    it('with fixed version', () => {
      const config = {
        environment: {
          sdk: '2.12.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with caret version', () => {
      const config = {
        environment: {
          sdk: '^2.12.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(true);
    });
    it('with ranged version', () => {
      const config = {
        environment: {
          sdk: '>=2.12.0 <3.0.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(true);
    });
  });

  describe('should return false if the minimum version is less than 2.12.0', () => {
    it('with fixed version', () => {
      const config = {
        environment: {
          sdk: '2.0.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with caret version', () => {
      const config = {
        environment: {
          sdk: '^2.0.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(false);
    });
    it('with ranged version', () => {
      const config = {
        environment: {
          sdk: '>=2.0.0 <3.0.0',
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
      expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(false);
    });
  });

  it('should return true if the sdk version cannot be found', () => {
    const config = {};
    mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(config) });
    expect(validateDartSDK(MOCK_CONTEXT, MOCK_PROJECT_ROOT)).toBe(true);
  });
});
