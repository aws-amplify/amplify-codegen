const { getModelSchemaPathParam, hasModelSchemaPathParam } = require('../../src/utils/getModelSchemaPathParam');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, 'project');

const createContextWithOptions = (options) => ({
  amplify: {
    getEnvInfo: () => ({
      projectPath: PROJECT_PATH
    }),
  },
  ...(options ? { parameters: { options } } : {})
});

describe('getModelSchemaPathParam', () => {
  it('should return null when no flag is set', () => {
    expect(getModelSchemaPathParam(createContextWithOptions(null))).toBeNull();
  });

  it('should return for relative path', () => {
    const context = createContextWithOptions({ 'model-schema': path.join('src', 'models') });
    expect(getModelSchemaPathParam(context)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
  });

  it('should return for absolute path', () => {
    const context = createContextWithOptions({ 'model-schema': path.join(PROJECT_PATH, 'src', 'models') });
    expect(getModelSchemaPathParam(context)).toEqual(path.join(PROJECT_PATH, 'src', 'models'));
  });
});

describe('hasModelSchemaPathParam', () => {
  it('returns true when a path is set', () => {
    expect(hasModelSchemaPathParam(createContextWithOptions({ 'model-schema': 'path' }))).toEqual(true);
  });

  it('returns false when no path is set', () => {
    expect(hasModelSchemaPathParam(createContextWithOptions(null))).toEqual(false);
  });
});
