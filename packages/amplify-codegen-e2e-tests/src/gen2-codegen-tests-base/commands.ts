import * as path from 'path';
import { copySync, readFileSync, writeFileSync } from 'fs-extra';
import { getScriptRunnerPath, nspawn as spawn, getCommandPath } from '@aws-amplify/amplify-codegen-e2e-core';
import { spawnSync } from 'child_process';

/**
 * Retrieve the path to the `npx` executable for interacting with the amplify gen2 cli.
 * @returns the local `npx` executable path.
 */
const getNpxPath = (): string => {
  console.log(`DEBUG: process.platform is: ${process.platform}`);
  if (process.platform === 'win32') {
    const scriptRunnerPath = getScriptRunnerPath();
    console.log(`DEBUG: getScriptRunnerPath() returned: ${scriptRunnerPath}`);
    const npxPath = scriptRunnerPath.replace('node.exe', 'npx.cmd');
    console.log(`DEBUG: Resolved npxPath for Windows: ${npxPath}`);
    return npxPath;
  } else {
    console.log(`DEBUG: Non-Windows platform; using 'npx'`);
    return 'npx';
  }
};

/**
 * Retrieve the path to the `ampx` executable for interacting with the amplify gen2 cli.
 * @param cwd current working directory
 * @returns the local `ampx` executable path
 */
const getAmpxPath = (cwd: string): string => {
  // Retrieve the path to npx
  const npxPath = getNpxPath();
  console.log(`DEBUG: Resolved npx path: ${npxPath}`);

  // Execute the command to find 'ampx'
  const spawnResult = spawnSync(npxPath, ['which', 'ampx'], { cwd, env: process.env, stdio: 'pipe' });

  // Log the entire result of spawnSync for inspection
  console.log('DEBUG: spawnSync result:', spawnResult);

  if (spawnResult.error) {
    console.error('DEBUG: spawnSync encountered an error:', spawnResult.error);
  }

  // Log stderr if available
  if (spawnResult.stderr) {
    console.error('DEBUG: spawnSync stderr:', spawnResult.stderr.toString());
  }

  // Ensure stdout exists before converting to string
  const stdout = spawnResult.stdout;
  if (!stdout) {
    console.error('DEBUG: No stdout received from spawnSync.');
    return '';
  }

  const result = stdout.toString().trim();
  console.log(`DEBUG: Parsed output: "${result}"`);
  return result;
};

const codegenPackagesInGen2 = [
  '@aws-amplify/graphql-generator',
  '@aws-amplify/graphql-types-generator'
];
const apiPackagesInGen2 = [
  '@aws-amplify/data-construct'
];

type CodegenPackage = 'GraphqlGenerator' | 'TypeGen';

const codegenPackageDirectoryMap: Record<CodegenPackage, string> = {
  GraphqlGenerator: path.join(__dirname, '..', '..', '..', 'graphql-generator'),
  TypeGen: path.join(__dirname, '..', '..', '..', 'graphql-types-generator'),
};

/**
 * Copy the backend data snapshot into the generated app location.
 */
const copyTemplateDirectory = (projectPath: string, templatePath: string): void => {
  const amplifyDataDir = path.join(projectPath, 'amplify', 'data');
  copySync(templatePath, amplifyDataDir, { overwrite: true });
};

/**
 * Initialize a Amplify Gen2 project in the cwd using a reference backend `app.ts` file, and optional cdkVersion specified.
 * @param cwd the directory to initialize the CDK project in
 * @param templatePath path to the project to overwrite the cdk sample code with
 * @param props additional properties to configure the test app setup.
 * @returns a promise which resolves to the stack name
 */
export const initGen2Project = async (cwd: string, templatePath: string, props: Gen2DeployProps = {}): Promise<string> => {
  const commandOptions = {
    cwd,
    stripColors: true,
  };
  const npmPath = getCommandPath('npm')
  await spawn(npmPath, ['create', 'amplify@latest', '-y'], commandOptions).runAsync();

  overrideWithLocalCodegenPackages(cwd);

  await spawn(npmPath, ['install'], commandOptions).runAsync();

  // Get root level packages info
  await spawn(npmPath, ['list'], commandOptions).runAsync();
  // Get codegen packages info
  await spawn(npmPath, ['list', ...codegenPackagesInGen2], commandOptions).runAsync();
  // Get API packages info
  await spawn(npmPath, ['list', ...apiPackagesInGen2], commandOptions).runAsync();

  copyTemplateDirectory(cwd, templatePath);

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
};

export const sandboxDeploy = async (cwd: string, props: Gen2DeployProps = {}): Promise<void> => {
  const noOutputTimeout = props?.timeoutMs ?? 10 * 60 * 1000;
  const commandOptions = {
    cwd,
    stripColors: true,
    noOutputTimeout,
  };

  // Run sandbox deployment

  /**
   * For sandbox deployment, the nested ampx binary is retrieved instead of using npx
   * On windows, the Ctrl-C signal is not returned correctly from npx binary, whose code is 1 and will fail nexpect check
   * Therefore, the ampx binary is used for sandbox deployment instead of npx
   */
  const ampxCli = getAmpxPath(cwd)
  await
    spawn(ampxCli, ['sandbox'], commandOptions)
      .wait('Watching for file changes...')
      .sendCtrlC()
      .runAsync();
};

export const deleteSandbox = async (cwd: string): Promise<void> => {
  await
    spawn(getNpxPath(), ['ampx', 'sandbox', 'delete'], { cwd, stripColors: true })
      .wait('Are you sure you want to delete all the resources in your sandbox environment')
      .sendLine('Y')
      .runAsync();
};

/**
 * Commands for ampx generate
 */
export type ClientCodegenConfigBase = {
  format: string
  outDir: string
}

export type IntrospectionCodegenConfig = ClientCodegenConfigBase & {
  format: 'introspection'
}
export type ModelgenConfig = ClientCodegenConfigBase & {
  format: 'modelgen'
  modelTarget: string
}
export type GraphqlCodegenConfig = ClientCodegenConfigBase & {
  format: 'graphql-codegen'
  typeTarget: string
  statementTarget: string
}
export type ClientCodegenConfig = IntrospectionCodegenConfig | ModelgenConfig | GraphqlCodegenConfig

const getClientCodegenParams = (props: ClientCodegenConfig): string[] => {
  const params = [ '--out', props.outDir, '--format', props.format ]
  switch (props.format) {
    case 'modelgen':
      return [ ...params, '--model-target', props.modelTarget];
    case 'graphql-codegen':
      return [ ...params, '--type-target', props.typeTarget, '--statement-target', props.statementTarget]
    case 'introspection':
    default:
      return params;
  }
};

export const generateGraphqlClientCode = async (cwd: string, props: ClientCodegenConfig): Promise<void> => {
  await
    spawn(
      getNpxPath(),
      ['ampx', 'generate', 'graphql-client-code', ...getClientCodegenParams(props)],
      { cwd, stripColors: true },
    ).runAsync();
};

export const generateForms = async (cwd: string, props: any = {}): Promise<void> => {
  await
    spawn(
      getNpxPath(),
      ['ampx', 'generate', 'forms'],
      { cwd, stripColors: true },
    ).runAsync();
};

export const generateOutputs = async (cwd: string, props: any = {}): Promise<void> => {
  await
    spawn(
      getNpxPath(),
      ['ampx', 'generate', 'outputs'],
      { cwd, stripColors: true },
    ).runAsync();
};
