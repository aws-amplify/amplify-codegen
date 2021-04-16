import { AmplifyFrontend } from 'amplify-cli-core';
import { getCLIPath, nspawn as spawn } from '..';

export function generateModels(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['codegen', 'models'], { cwd, stripColors: true })
    .run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

export function generateStatementsAndTypes(cwd: string) : Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['codegen'], { cwd, stripColors: true })
    .run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    })
  });
}

export function addCodegen(cwd: string, settings: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const run = spawn(getCLIPath(), ['codegen', 'add'], { cwd, stripColors: true });
    if (settings.frontendType === AmplifyFrontend.javascript) {
      run.wait('Choose the code generation language target').sendCarriageReturn();
    }
    run
      .wait('Enter the file name pattern of graphql queries, mutations and subscriptions')
      .sendCarriageReturn()
      .wait('Do you want to generate/update all possible GraphQL operations')
      .sendLine('y')
      .wait('Enter maximum statement depth [increase from default if your schema is deeply')
      .sendCarriageReturn();
    if (settings.frontendType === AmplifyFrontend.ios) {
      run
        .wait('Enter the file name for the generated code')
        .sendCarriageReturn()
        .wait('Do you want to generate code for your newly created GraphQL API')
        .sendCarriageReturn();
    }
    run.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}