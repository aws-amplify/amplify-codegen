const {
  validateAmplifyFlutterCapableZeroThreeFeatures
} = require('../../src/utils/validateAmplifyFlutterCapableZeroThreeFeatures');
const { PUBSPEC_LOCK_FILE_NAME } = require('../../src/utils/validateAmplifyFlutterVersion');
const mockFs = require('mock-fs');
const { join } = require('path');
const yaml = require('js-yaml');

const MOCK_PROJECT_ROOT = 'project';
const MOCK_PUBSPEC_FILE_PATH = join(MOCK_PROJECT_ROOT, PUBSPEC_LOCK_FILE_NAME);
const MINIMUM_VERSION_CONSTRAINT = '>= 0.3.0 || >= 0.3.0-rc.2';
global.console = {log: jest.fn()}
const mockErrorPrinter = console.log;

describe('Validate amplify flutter version tests', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe(`should return true if the resolved version meets the version constrain: ${MINIMUM_VERSION_CONSTRAINT}`, () => {
    ['0.3.0', '0.3.1', '1.0.0', '0.3.0-rc.2', '0.4.0', '0.4.0-rc.2'].forEach(version => {
      test(`when the resolved version is ${version}`, () => {
        const lockFile = {
        packages: {
          amplify_flutter: {
            version,
          },
        },
      };
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(lockFile) });
      expect(validateAmplifyFlutterCapableZeroThreeFeatures(MOCK_PROJECT_ROOT)).toBe(true);
      })
    });
  });

  describe(`should return false if the resolved version does NOT meet the version constrain: ${MINIMUM_VERSION_CONSTRAINT}`, () => {
    ['0.2.0', '0.2.9', '0.3.0-rc.1'].forEach(version => {
      test(`when the resolved version is ${version}`, () => {
        const lockFile = {
          packages: {
            amplify_flutter: {
              version,
            },
          },
        };
        mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(lockFile) });
        expect(validateAmplifyFlutterCapableZeroThreeFeatures(MOCK_PROJECT_ROOT)).toBe(false);
      });
    });
  });

  it('should return false if the sdk version cannot be found', () => {
    const lockFile = {};
    mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(lockFile) });
    expect(validateAmplifyFlutterCapableZeroThreeFeatures(MOCK_PROJECT_ROOT)).toBe(false);
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
      const lockFile = {};
      mockFs({ [MOCK_PUBSPEC_FILE_PATH]: yaml.dump(lockFile) });

      expect(validateAmplifyFlutterCapableZeroThreeFeatures(MOCK_PROJECT_ROOT)).toBe(false);
      expect(mockErrorPrinter).toHaveBeenCalledTimes(3);
    });
  });
});
