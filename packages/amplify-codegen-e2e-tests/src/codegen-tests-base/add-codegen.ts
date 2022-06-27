import {
    initProjectWithProfile,
    addApiWithoutSchema,
    updateApiSchema,
    addCodegen,
    AmplifyFrontendConfig,
    createRandomName
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen, testValidGraphQLConfig } from "./test-setup";

export async function testAddCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    const projectName = createRandomName();
    await addApiWithoutSchema(projectRoot, { apiName: projectName });
    await updateApiSchema(projectRoot, projectName, schema);

    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // add codegen succeeds
    await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // GraphQL statements are generated
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
    testValidGraphQLConfig(projectRoot, config);
}
