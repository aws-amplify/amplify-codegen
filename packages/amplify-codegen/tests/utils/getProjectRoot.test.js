const getProjectRoot = require('../../src/utils/getProjectRoot');
const path = require('path');
const process = require('process');

const PROJECT_PATH = path.join(__dirname, 'project');

describe('getProjectRoot', () => {
  it('returns project path from context when it returns', () => {
    expect(getProjectRoot(({
      amplify: {
        getEnvInfo: () => ({ projectPath: PROJECT_PATH }),
      },
    }))).toEqual(PROJECT_PATH);
  });

  it('returns os.cwd when context throws', () => {
    expect(getProjectRoot(({
      amplify: {
        getEnvInfo: () => {
          throw new Error();
        },
      },
    }))).toEqual(process.cwd());
  });
});
