const AmplifyCodeGenConfig = require('../../src/codegen-config/AmplifyCodeGenConfig');

const { loadConfig, getCodegenConfig } = require('../../src/codegen-config');

jest.mock('../../src/codegen-config/AmplifyCodeGenConfig');
const MOCK_PROJECT_ROOT = 'mockpath';
const MOCK_CONTEXT = {
  amplify: {
    getEnvInfo: jest.fn().mockReturnValue({ projectPath: MOCK_PROJECT_ROOT })
  }
};

describe('codegen-config', () => {
  it('is singleton', () => {
    loadConfig(MOCK_CONTEXT);
    expect(AmplifyCodeGenConfig).toHaveBeenCalledWith(MOCK_PROJECT_ROOT);
    loadConfig(MOCK_CONTEXT);
    expect(AmplifyCodeGenConfig).toHaveBeenCalledTimes(1);
  });
});
