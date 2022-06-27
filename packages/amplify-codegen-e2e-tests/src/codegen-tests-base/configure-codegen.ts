import {
    initProjectWithProfile,
    addApiWithoutSchema,
    addCodegen,
    updateApiSchema,
    configureCodegen,
    AmplifyFrontendConfig,
    createRandomName
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync, readFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen, testValidGraphQLConfig, getGraphQLConfigFilePath } from "./test-setup";

export async function testConfigureCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    const projectName = createRandomName();
    await addApiWithoutSchema(projectRoot, { apiName: projectName });
    await updateApiSchema(projectRoot, projectName, schema);

    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // add codegen succeeds
    await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();

    const addedCodegenConfiguration = readFileSync(getGraphQLConfigFilePath(projectRoot)).toString();

    // update codegen configuration
    const settings = { isCodegenConfigured: true, maxStatementDepth: 4, ...config };
    await expect(configureCodegen(projectRoot, settings)).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // previously generated files should still exist
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);

    // graphql configuration should be updated to with MaxStatementDepth=4
    testValidGraphQLConfig(projectRoot, config, 4, true);
    const updatedCodegenConfiguration = readFileSync(getGraphQLConfigFilePath(projectRoot)).toString();
    // the codegen configuration is updated
    expect(addedCodegenConfiguration).not.toMatch(updatedCodegenConfiguration);
}