import {
    initProjectWithProfile,
    addApiWithBlankSchemaAndConflictDetection,
    updateApiSchema,
    createRandomName,
    generateModels,
    AmplifyFrontendConfig,
    AmplifyFrontend
} from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync, writeFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';
const yaml = require('js-yaml');

export async function testCodegenModels(config: AmplifyFrontendConfig, projectRoot: string, schema: string, outputDir?: string) {
    const name = createRandomName();

    // init project and add API category
    await initProjectWithProfile(projectRoot, { name, ...config });

    //enable datastore
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    await updateApiSchema(projectRoot, name, schema);

    //generate pre existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

    // For flutter frontend, we need to have a pubspec lock file with supported dart version
    if (config?.frontendType === AmplifyFrontend.flutter) {
        createPubspecLockFile(projectRoot);
    }

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

export const createPubspecLockFile = (projectRoot: string) => {
    const lockFile = {
        packages: {
          amplify_flutter: {
            version: '2.0.0'
          },
        },
    };
    const pubspecPath = path.join(projectRoot, 'pubspec.lock');
    if (!existsSync(pubspecPath)) {
        writeFileSync(pubspecPath, yaml.dump(lockFile));
    }
};
