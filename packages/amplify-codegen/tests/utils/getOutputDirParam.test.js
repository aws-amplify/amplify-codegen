const getOutputDirParam = require('../../src/utils/getOutputDirParam');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, 'project');

describe('getOutputDirParam', () => {
  const createContextWithOptions = (options) => ({
    amplify: {
      getEnvInfo: () => ({
        projectPath: PROJECT_PATH
      }),
    },
    ...(options ? { parameters: { options } } : {})
  });

  it('should throw on missing flag when required is set', () => {
    const context = createContextWithOptions(null);
    expect(() => getOutputDirParam(context, true)).toThrowErrorMatchingInlineSnapshot('"Expected --output-dir flag to be set"');
  });

  it('should not throw on missing flag when required is not set', () => {
    const context = createContextWithOptions(null);
    expect(() => getOutputDirParam(context, false)).not.toThrowError();
  });

  it('should return for relative path set independent of whether is required', () => {
    const context = createContextWithOptions({ 'output-dir': path.join('src', 'models') });
    expect(getOutputDirParam(context, true)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
    expect(getOutputDirParam(context, false)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
  });

  it('should return for absolute path set independent of whether is required', () => {
    const context = createContextWithOptions({ 'output-dir': path.join(PROJECT_PATH, 'src', 'models') });
    expect(getOutputDirParam(context, true)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
    expect(getOutputDirParam(context, false)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
  });
});
