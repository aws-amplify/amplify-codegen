import {
    initProjectWithProfile,
    addApiWithBlankSchemaAndConflictDetection,
    generateModels,
    AmplifyFrontendConfig,
    createRandomName,
    updateApiSchema
} from "amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';

export async function testCodegenModels(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });

    //enable datastore
    const projectName = createRandomName();
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    await updateApiSchema(projectRoot, projectName, schema);

    //generate pre existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

    //generate models
    await expect(generateModels(projectRoot)).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // datastore models are generated at correct location
    expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBe(true);
}