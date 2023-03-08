import {
    initProjectWithProfile,
    addApiWithoutSchema,
    updateApiSchema,
    createRandomName,
    addCodegen,
    removeCodegen,
    AmplifyFrontendConfig
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync, readFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen, getGraphQLConfigFilePath } from "./test-setup";
import { load } from 'js-yaml';

export async function testRemoveCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    const projectName = createRandomName();
    await addApiWithoutSchema(projectRoot, { apiName: projectName });
    await updateApiSchema(projectRoot, projectName, schema);

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
    const generatedConfig = load(readFileSync(getGraphQLConfigFilePath(projectRoot)).toString());
    expect(Object.keys(generatedConfig['projects']).length).toEqual(0);
}
