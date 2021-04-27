import { 
    deleteProjectDir,
    deleteProject,
    AmplifyFrontendConfig,
    getAdminApp
} from "amplify-codegen-e2e-core";
import { existsSync, readFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';
import { JSONUtilities } from 'amplify-cli-core';
import { SandboxApp } from '../types/SandboxApp';

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
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);
    
    return userSourceCodePath;
}

export async function testValidGraphQLConfig(projectRoot: string) {
    // graphql codegen configuration should exist
    expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);
    
    // check if the graphql codegen configuration is valid
    expect(readFileSync(getGraphQLConfigFilePath(projectRoot)).toString()).toMatchSnapshot();
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

