import {
    initProjectWithProfile,
    addApiWithSchema,
    addCodegen,
    removeCodegen,
    AmplifyFrontendConfig
} from "amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen, testValidGraphQLConfig, getGraphQLConfigFilePath } from "./test-setup";

export async function testRemoveCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithSchema(projectRoot, schema);

    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // add codegen succeeds
    await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();

    // remove codegen
    await expect(removeCodegen(projectRoot)).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // previously generated files should still exist
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
    // graphql configuration should be updated to remove previous configuration
    testValidGraphQLConfig(projectRoot);
}