import { AmplifyFrontend } from '../utils';
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

// CLI workflow to add codegen to Amplify project
export function addCodegen(cwd: string, settings: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['codegen', 'add'], { cwd, stripColors: true });
    if (settings.isAPINotAdded) {
      chain.wait("There are no GraphQL APIs available.");
      chain.wait("Add by running $amplify api add");
    }
    else if (settings.isCodegenAdded) {
      chain.wait("Codegen support only one GraphQL API per project");
    }
    else {
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
        chain
          .wait('Enter the file name for the generated code')
          .sendCarriageReturn()
          .wait('Do you want to generate code for your newly created GraphQL API')
          .sendCarriageReturn();
      }
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

// CLI workflow to remove the configured codegen from the project
export function removeCodegen(cwd: string, isCodegenAdded: boolean = true): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['codegen', 'remove'], { cwd, stripColors: true });
    if (!isCodegenAdded) {
      chain.wait("Codegen is not configured");
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

// CLI workflow to configure codegen
export function configureCodegen(cwd: string, settings: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['codegen', 'configure'], { cwd, stripColors: true });
    if (settings.frontendType === AmplifyFrontend.javascript) {
      chain.wait('Choose the code generation language target').sendCarriageReturn();
    }
    chain
      .wait('Enter the file name pattern of graphql queries, mutations and subscriptions')
      .sendCarriageReturn()

    if (!settings.isCodegenConfigured) {
      chain
        .wait('Do you want to generate/update all possible GraphQL operations')
        .sendLine('y')
    }
    else if (settings.frontendType === AmplifyFrontend.ios) {
      chain
        .wait('Enter the file name for the generated code')
        .sendCarriageReturn()
    }

    chain
      .wait('Enter maximum statement depth [increase from default if your schema is deeply')
    settings.maxStatementDepth ? chain.sendLine(settings.maxStatementDepth) : chain.sendCarriageReturn();

    if (settings.frontendType === AmplifyFrontend.ios && !settings.isCodegenConfigured) {
      chain
        .wait('Enter the file name for the generated code')
        .sendCarriageReturn()
        .wait('Do you want to generate code for your newly created GraphQL API')
        .sendCarriageReturn();
    }

    if (settings.isCodegenConfigured) {
      chain.wait("Codegen configured. Remember to run \"amplify codegen\" to generate your types and statements.");
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

