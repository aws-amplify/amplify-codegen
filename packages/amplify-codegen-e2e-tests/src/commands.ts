import * as path from 'path';
import { copySync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import { getScriptRunnerPath, nspawn as spawn, npmInstall, getCommandPath } from '@aws-amplify/amplify-codegen-e2e-core';
import { spawnSync, execSync } from 'child_process';

/**
 * Retrieve the path to the `npx` executable for interacting with the amplify gen2 cli.
 * @returns the local `npx` executable path.
 */
const getNpxPath = (): string => (process.platform === 'win32' ? getScriptRunnerPath().replace('node.exe', 'npx.cmd') : 'npx');

const codegenPackagesInGen2 = [
  '@aws-amplify/graphql-generator',
  '@aws-amplify/graphql-types-generator'
];
const apiPackagesInGen2 = [
  '@aws-amplify/data-construct'
];

type CodegenPackage = 'GraphqlGenerator' | 'TypeGen';

const codegenPackageDirectoryMap: Record<CodegenPackage, string> = {
  GraphqlGenerator: path.join(__dirname, '..', '..', 'graphql-generator'),
  TypeGen: path.join(__dirname, '..', '..', 'graphql-types-generator'),
}

/**
 * Copy the backend snapshot into the generated app location.
 */
const copyTemplateDirectory = (projectPath: string, templatePath: string): void => {
  const binDir = path.join(projectPath, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(projectPath)}.ts`), { overwrite: true });
};

/**
 * Initialize a Amplify Gen2 project in the cwd using a reference backend `app.ts` file, and optional cdkVersion specified.
 * @param cwd the directory to initialize the CDK project in
 * @param templatePath path to the project to overwrite the cdk sample code with
 * @param props additional properties to configure the test app setup.
 * @returns a promise which resolves to the stack name
 */
export const initGen2Project = async (cwd: string, props: Gen2DeployProps = {}): Promise<string> => {
  const commandOptions = {
    cwd,
    stripColors: true,
  };
  const npmPath = getCommandPath('npm')
  // const commandOptions = {
  //   cwd,
  //   env: process.env,
  //   stdio: 'inherit'
  // }
  // spawnSync('npm', ['create', 'amplify@latest', '-y'], commandOptions as any);
  await spawn(npmPath, ['create', 'amplify@latest', '-y'], commandOptions).runAsync();

  const ampx = spawnSync(getNpxPath(), ['which', 'ampx'], { cwd, env: process.env, stdio: 'pipe' }).stdout.toString().trim()
  console.log(ampx)

  overrideWithLocalCodegenPackages(cwd);

  // spawnSync('npm', ['install'], commandOptions as any);
  await spawn(npmPath, ['install'], commandOptions).runAsync();

  // Get root level packages info
  // spawnSync('npm', ['list'], commandOptions as any)
  await spawn(npmPath, ['list'], commandOptions).runAsync();
  // Get codegen packages info
  // spawnSync('npm', ['list', ...codegenPackagesInGen2], commandOptions as any)
  await spawn(npmPath, ['list', ...codegenPackagesInGen2], commandOptions).runAsync();
  // Get API packages info
  // spawnSync('npm', ['list', ...apiPackagesInGen2], commandOptions as any)
  await spawn(npmPath, ['list', ...apiPackagesInGen2], commandOptions).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

export type Gen2DeployProps = {
  timeoutMs?: number;
};

const overrideWithLocalCodegenPackages = (cwd: string): void => {
  const packageJsonObj = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  packageJsonObj.overrides = {
    '@aws-amplify/graphql-generator': codegenPackageDirectoryMap['GraphqlGenerator'],
    '@aws-amplify/graphql-types-generator': codegenPackageDirectoryMap['TypeGen'],
  };
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(packageJsonObj));
}

export const sandboxDeploy = async (cwd: string, props: Gen2DeployProps = {}) => {
  const noOutputTimeout = props?.timeoutMs ?? 10 * 60 * 1000;
  const commandOptions = {
    cwd,
    stripColors: true,
    noOutputTimeout,
  };
  // Run sandbox deployment
  const ampx = spawnSync(getNpxPath(), ['which', 'ampx'], { cwd, env: process.env, stdio: 'pipe' }).stdout.toString().trim()
  // const ampx = execSync('npx which ampx')
  //   .toString()
  //   .trim();;
  console.log(ampx)
  await
    spawn(ampx, ['sandbox'], commandOptions)
      .wait('Watching for file changes...')
      .sendCtrlC()
      .wait('Would you like to delete all the resources in your sandbox environment')
      .sendLine('N')
      .runAsync();
}

export const deleteSandbox = async (cwd: string) => {
  const commandOptions = {
    cwd,
    stripColors: true,
  };
  await
    spawn(getNpxPath(), ['ampx', 'sandbox', 'delete'], commandOptions)
      .wait('Are you sure you want to delete all the resources in your sandbox environment')
      .sendLine('Y')
      .runAsync();
}