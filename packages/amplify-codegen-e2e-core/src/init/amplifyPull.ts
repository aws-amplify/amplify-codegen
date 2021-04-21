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
    const tableHeaderRegex = /\|\sCategory\s+\|\sResource\sname\s+\|\sOperation\s+\|\sProvider\splugin\s+\|/;
    const tableSeperator = /\|(\s-+\s\|){4}/;

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
      chain.wait('Pre-pull status').wait('Current Environment').wait(tableHeaderRegex).wait(tableSeperator);
    }

    if (settings.override) {
      chain
        .wait('Local changes detected')
        .wait('Pulling changes from the cloud will override your local changes')
        .wait('Are you sure you would like to continue')
        .sendLine('y');
    }

    if (settings.emptyDir) {
      chain.wait(/Successfully pulled backend environment .+ from the cloud\./).wait("Run 'amplify pull' to sync upstream changes.");
    } else {
      chain.wait('Post-pull status').wait('Current Environment').wait(tableHeaderRegex).wait(tableSeperator);
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

export function amplifyPullSandbox(cwd: string, settings: { sandboxId: string; appType: string; framework: string }) {
  return new Promise((resolve, reject) => {
    const args = ['pull', '--sandboxId', settings.sandboxId];

    spawn(getCLIPath(), args, { cwd, stripColors: true })
      .wait('What type of app are you building')
      .sendKeyUp()
      .sendLine(settings.appType)
      .wait('What javascript framework are you using')
      .sendLine(settings.framework)
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
  switch (config.frontendType) {
    case AmplifyFrontend.android:
      chain
        .wait("Choose the type of app that you're building")
        .send('j')
        .sendCarriageReturn()
        .wait('Where is your Res directory')
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.ios:
      chain
        .wait("Choose the type of app that you're building")
        .sendKeyDown(3)
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.flutter:
      chain
        .wait("Choose the type of app that you're building")
        .sendKeyDown(2)
        .sendCarriageReturn()
        .wait('Where do you want to store your configuration file')
        .sendCarriageReturn()
      return;
    case AmplifyFrontend.javascript:
    default:
      chain
        .wait("Choose the type of app that you're building")
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
