const add = require('../../commands/codegen/add');
const codeGen = require('../../src/index');

jest.mock('../../src/index');

describe('cli - add', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('feature name', () => {
    expect(add.name).toEqual('add');
  });

  describe('run', () => {
    test('executes codegen add', async () => {
      const context = {
        parameters: {},
      };
      await add.run(context);
      expect(codeGen.add).toHaveBeenCalledWith(context, null, undefined);
    });

    test('catches error in codegen add', async () => {
      const error = jest.fn();
      const context = {
        parameters: {},
        print: {
          error,
        },
      };

      const codegenError = new Error('failed to read file');
      codeGen.add.mockRejectedValueOnce(codegenError);
      await add.run(context);
      expect(error).toHaveBeenCalledWith(codegenError.message);
    });

    test('passes apiId', async () => {
      const apiId = 'apiid';
      const context = {
        parameters: {
          options: {
            apiId,
          },
        },
      };
      await add.run(context);
      expect(codeGen.add).toHaveBeenCalledWith(context, apiId, undefined);
    });

    test('passes region', async () => {
      const region = 'region';
      const context = {
        parameters: {
          options: {
            region,
          },
        },
      };
      await add.run(context);
      expect(codeGen.add).toHaveBeenCalledWith(context, null, region);
    });

    test('throws error on invalid arg', async () => {
      const badArg = 'badArg';
      const info = jest.fn();
      const context = {
        parameters: {
          options: {
            badArg,
          },
        },
        print: {
          info,
        },
      };
      await add.run(context);
      expect(info).toHaveBeenCalledWith('Invalid parameter badArg');

      expect(info).toHaveBeenCalledWith(
        'amplify codegen add takes only apiId and region as parameters. \n$ amplify codegen add [--apiId <API_ID>] [--region <region>]',
      );
    });

    test('throws error on invalid args', async () => {
      const badArgOne = 'badArgOne';
      const badArgTwo = 'badArgTwo';
      const info = jest.fn();
      const context = {
        parameters: {
          options: {
            badArgOne,
            badArgTwo,
          },
        },
        print: {
          info,
        },
      };
      await add.run(context);
      expect(info).toHaveBeenCalledWith('Invalid parameters badArgOne, badArgTwo');

      expect(info).toHaveBeenCalledWith(
        'amplify codegen add takes only apiId and region as parameters. \n$ amplify codegen add [--apiId <API_ID>] [--region <region>]',
      );
    });

    test('allows undocummented frontend and framework', async () => {
      const frontend = 'frontend';
      const framework = 'framework';
      const info = jest.fn();
      const context = {
        parameters: {
          options: {
            frontend,
            framework,
          },
        },
        print: {
          info,
        },
      };
      await add.run(context);
      expect(info).not.toHaveBeenCalled();
    });

    test('ignores yes arg', async () => {
      const yes = true;
      const info = jest.fn();
      const context = {
        parameters: {
          options: {
            yes,
          },
        },
        print: {
          info,
        },
      };
      await add.run(context);
    });
  });
});
