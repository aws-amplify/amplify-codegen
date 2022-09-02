import {
    initProjectWithProfile,
    addApiWithBlankSchemaAndConflictDetection,
    updateApiSchema,
    createRandomName,
    generateModels,
    AmplifyFrontendConfig
} from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';

export async function testCodegenModels(config: AmplifyFrontendConfig, projectRoot: string, schema: string, outputDir?: string) {
    const name = createRandomName();

    // init project and add API category
    await initProjectWithProfile(projectRoot, { name, ...config });

    //enable datastore
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    await updateApiSchema(projectRoot, name, schema);

    //generate pre existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

    //generate models
    await expect(generateModels(projectRoot, outputDir)).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // datastore models are generated at correct location
    const dirToCheck = outputDir
        ? path.join(projectRoot, outputDir)
        : path.join(projectRoot, config.modelgenDir);
    expect(isNotEmptyDir(dirToCheck)).toBe(true);
}
