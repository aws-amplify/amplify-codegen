import { getCLIPath, KEY_DOWN_ARROW, nspawn as spawn } from '..';
import { AmplifyFrontend } from '../utils';

const pushTimeoutMS = 1000 * 60 * 2; // 2 minutes;

export function amplifyPush(cwd: string, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendLine('n')
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function amplifyPushForce(cwd: string, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push', '--force'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function amplifyPushWithoutCodegen(cwd: string, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendCarriageReturn()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function amplifyPushUpdate(cwd: string, waitForText?: RegExp, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait(waitForText || /.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function amplifyPushAuth(cwd: string, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

// this function expects a single layer's content to be modified
export function amplifyPushLayer(
  cwd: string,
  usePreviousPermissions: boolean = true,
  testingWithLatestCodebase: boolean = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait('Content changes in Lambda layer')
      .wait('Note: You need to run "amplify update function" to configure your functions with the latest layer version.')
      .wait('What permissions do you want to grant to this new layer version?');

    if (usePreviousPermissions) {
      chain.sendCarriageReturn();
    } else {
      chain.send(KEY_DOWN_ARROW).sendCarriageReturn();
    }

    chain.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

export function amplifyPushWithCodegenAdd(cwd: string, settings: any = {}, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS });
    chain
      .wait('Are you sure you want to continue?')
      .sendCarriageReturn()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendLine('y');
    if (settings.frontendType === AmplifyFrontend.javascript) {
      chain.wait('Choose the code generation language target').sendCarriageReturn();
    }
    chain
      .wait('Enter the file name pattern of graphql queries, mutations and subscriptions')
      .sendCarriageReturn()
      .wait('Do you want to generate/update all possible GraphQL operations')
      .sendLine('y')
      .wait('Enter maximum statement depth [increase from default if your schema is deeply')
      .sendCarriageReturn();
    if (settings.frontendType === AmplifyFrontend.ios) {
      chain.wait('Enter the file name for the generated code').sendCarriageReturn();
    }
    chain.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

export function amplifyPushWithCodegenUpdate(cwd: string, settings: any = {}, testingWithLatestCodebase: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS });
    chain
      .wait('Are you sure you want to continue?')
      .sendCarriageReturn()
      .wait('Do you want to update code for your updated GraphQL API')
      .sendLine('y')
      .wait('Do you want to generate GraphQL statements (queries, mutations and subscription) based on your schema types?')
      .sendCarriageReturn()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
