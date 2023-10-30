import { getCLIPath, nspawn as spawn } from '..';
import { AmplifyFrontend, AmplifyFrontendConfig, ExecutionContext, DEFAULT_JS_CONFIG } from '../utils';

export function amplifyPull(
  cwd: string,
  settings: {
    override?: boolean;
    emptyDir?: boolean;
    appId?: string;
    withRestore?: boolean;
    frontendConfig?: AmplifyFrontendConfig
  },
): Promise<void> {
  if (!settings.frontendConfig) {
    settings.frontendConfig = DEFAULT_JS_CONFIG;
  }
  return new Promise((resolve, reject) => {
    const args = ['pull'];

    if (settings.appId) {
      args.push('--appId', settings.appId);
    }

    if (settings.withRestore) {
      args.push('--restore');
    }

    const chain = spawn(getCLIPath(), args, { cwd, stripColors: true });

    if (settings.emptyDir) {
      chain
        .wait('Select the authentication method you want to use:')
        .sendCarriageReturn()
        .wait('Please choose the profile you want to use')
        .sendCarriageReturn()
        .wait('Choose your default editor:')
        .sendCarriageReturn();
      initializeFrontend(chain, settings.frontendConfig);
      chain
        .wait('Do you plan on modifying this backend?')
        .sendLine('y');
    } else {
      chain.wait('Pre-pull status').wait('Current Environment');
    }

    if (settings.override) {
      chain
        .wait('Local changes detected')
        .wait('Pulling changes from the cloud will override your local changes')
        .wait('Are you sure you would like to continue')
        .sendLine('y');
    }

    if (settings.emptyDir) {
      chain.wait(/Successfully pulled backend environment .+ from the cloud\./).wait("Run 'amplify pull' to sync future upstream changes.");
    } else {
      chain.wait('Post-pull status').wait('Current Environment');
    }

    chain.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        console.error(err);
        reject(err);
      }
    });
  });
}

export function amplifyPullSandbox(cwd: string, settings: { sandboxId: string; appType: AmplifyFrontend; }) {
  return new Promise((resolve, reject) => {
    const args = ['pull', '--sandboxId', settings.sandboxId];

    const chain = spawn(getCLIPath(), args, { cwd, stripColors: true })
      .wait('What type of app are you building');
    switch (settings.appType) {
      case AmplifyFrontend.javascript:
        chain
          .sendCarriageReturn()
          .wait('What javascript framework are you using')
          .sendCarriageReturn();
        break;
      case AmplifyFrontend.android:
        chain
          .sendKeyDown()
          .sendCarriageReturn();
        break;
      case AmplifyFrontend.ios:
        chain
          .sendKeyDown(2)
          .sendCarriageReturn();
        break;
      case AmplifyFrontend.flutter:
        chain
          .sendKeyDown(3)
          .sendCarriageReturn();
        break;
      default:
        throw Error(`${settings.appType} is not a supported frontend in sandbox app.`)
    }
    chain
      .wait('Successfully generated models.')
      .run((err: Error) => {
        if (!err) {
          resolve({});
        } else {
          reject(err);
        }
      });
  });
}

function initializeFrontend(chain: ExecutionContext, config: AmplifyFrontendConfig) : void {
  chain.wait("Choose the type of app that you're building");
  switch (config.frontendType) {
    case AmplifyFrontend.android:
      chain
        .sendLine('android')
        .wait('Where is your Res directory')
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.ios:
      chain
        .sendKeyDown(3)
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.flutter:
      chain
        .sendKeyDown(2)
        .sendCarriageReturn()
        .wait('Where do you want to store your configuration file')
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.javascript:
    default:
      chain
        .sendCarriageReturn()
        .wait('What javascript framework are you using')
        .sendCarriageReturn()
        .wait('Source Directory Path:')
        .sendCarriageReturn()
        .wait('Distribution Directory Path:')
        .sendCarriageReturn()
        .wait('Build Command:')
        .sendCarriageReturn()
        .wait('Start Command:')
        .sendCarriageReturn();
      return;
  }
}
