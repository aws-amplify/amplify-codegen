import {
    initProjectWithProfile,
    addApiWithSchema,
    amplifyPushWithCodegenAdd,
    AmplifyFrontendConfig,
    apiUpdateToggleDataStore,
    amplifyPushWithCodegenUpdate
} from "amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen, testValidGraphQLConfig } from "./test-setup";

export async function testPushCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithSchema(projectRoot, schema);

    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // add codegen succeeds
    await amplifyPushWithCodegenAdd(projectRoot, { ...config });

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);

    // GraphQL statements are generated
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
    testValidGraphQLConfig(projectRoot);

    //enable datastore
    await apiUpdateToggleDataStore(projectRoot);
    //push with codegen update
    await amplifyPushWithCodegenUpdate(projectRoot);
    expect(existsSync(userSourceCodePath)).toBe(true);
    expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBe(true);
}
