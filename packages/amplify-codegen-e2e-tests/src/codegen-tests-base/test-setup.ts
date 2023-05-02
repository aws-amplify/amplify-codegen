import {
  deleteProjectDir,
  deleteProject,
  AmplifyFrontendConfig,
  getAdminApp,
  constructGraphQLConfig,
} from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { generateSourceCode } from '../utils';
import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { SandboxApp } from '../types/SandboxApp';
import { load } from 'js-yaml';

export const REGION = 'us-east-1';

export function getGraphQLConfigFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.graphqlconfig.yml');
}

export async function deleteAmplifyProject(projectRoot: string) {
  const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
  if (existsSync(metaFilePath)) {
    await deleteProject(projectRoot);
  }
  deleteProjectDir(projectRoot);
}

export function testSetupBeforeAddCodegen(projectRoot: string, config: AmplifyFrontendConfig): string {
  // generate pre-existing user file
  const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

  // verify that the pre-existing file exists and codegen output directory is empty
  expect(existsSync(userSourceCodePath)).toBe(true);
  expect(existsSync(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);

  return userSourceCodePath;
}

export async function testValidGraphQLConfig(
  projectRoot: string,
  config: AmplifyFrontendConfig,
  maxDepth?: number,
  isConfigured: boolean = false,
  region: string = process.env.CLI_REGION || REGION,
) {
  // graphql codegen configuration should exist
  expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);

  const generatedConfig = load(readFileSync(getGraphQLConfigFilePath(projectRoot)).toString());
  Object.keys(generatedConfig['projects']).forEach(projectName => {
    const projectConfig = generatedConfig['projects'][projectName];
    const expectedProjectConfig = constructGraphQLConfig(projectName, config, maxDepth, region, isConfigured);
    // check if the graphql codegen configuration is valid
    expect(projectConfig).toEqual(expectedProjectConfig);
  });
}

export async function testSetupAdminApp(schemaBody: any = {}): Promise<string> {
  const sandBoxAppString = await getAdminApp(schemaBody);
  expect(sandBoxAppString).toBeDefined();

  const sandboxApp = JSONUtilities.parse<SandboxApp>(sandBoxAppString);
  expect(sandboxApp.schema).toEqual(schemaBody.schema);

  const sandboxId = sandboxApp.backendManagerAppId;
  expect(sandboxId).toBeDefined();
  return sandboxId;
}
