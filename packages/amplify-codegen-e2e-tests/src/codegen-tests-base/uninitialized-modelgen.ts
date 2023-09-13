import { generateModelsWithOptions, AmplifyFrontendConfig, AmplifyFrontend, getSchemaPath } from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { isNotEmptyDir, generateSourceCode } from '../utils';
import { createPubspecLockFile } from './datastore-modelgen';
import path from 'path';

export type TestUninitializedCodegenModelsProps = {
    config: AmplifyFrontendConfig;
    projectRoot: string;
    schemaName: string;
    shouldSucceed: boolean;
    outputDir?: string;
    featureFlags?: Record<string, any>;
    expectedFilenames?: Array<string>;
};

export const testUninitializedCodegenModels = async ({
    config,
    projectRoot,
    schemaName,
    outputDir,
    shouldSucceed,
    featureFlags,
    expectedFilenames,
}: TestUninitializedCodegenModelsProps): Promise<void> => {
    // generate pre existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

    // Write Schema File to Schema Path
    const schemaPath = getSchemaPath(schemaName);
    const schema = readFileSync(schemaPath).toString();
    const modelSchemaPath = path.join(config.srcDir, 'schema.graphql');
    writeFileSync(path.join(projectRoot, modelSchemaPath), schema);

    // For flutter frontend, we need to have a pubspec lock file with supported dart version
    if (config?.frontendType === AmplifyFrontend.flutter) {
        createPubspecLockFile(projectRoot);
    }

    // generate models
    try {
        await generateModelsWithOptions(projectRoot, {
            '--target': config.frontendType,
            '--model-schema': modelSchemaPath,
            '--output-dir': outputDir,
            ...(featureFlags ? Object.entries(featureFlags).map(([ffName, ffVal]) => [`--feature-flag:${ffName}`, ffVal]).flat() : []),
        });
    } catch (_) {
        // This is temporarily expected to throw, since the post-modelgen hook in amplify cli fails, even though modelgen succeeds.
    }

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);

    // datastore models are generated at correct location
    const partialDirToCheck = outputDir
        ? path.join(projectRoot, outputDir)
        : path.join(projectRoot, config.modelgenDir);
    const dirToCheck = config.frontendType === AmplifyFrontend.android
        ? path.join(partialDirToCheck, 'com', 'amplifyframework', 'datastore', 'generated', 'model')
        : partialDirToCheck;

    expect(isNotEmptyDir(dirToCheck)).toBe(shouldSucceed);

    if (expectedFilenames) {
        const foundFiles = new Set(readdirSync(dirToCheck));
        console.log(`Comparing written files: ${JSON.stringify(Array.from(foundFiles))} to expected files: ${JSON.stringify(expectedFilenames)}`);
        expectedFilenames.forEach((expectedFilename) => expect(foundFiles.has(expectedFilename)).toBe(true));
    }
};
