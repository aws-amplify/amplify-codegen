import {
    initProjectWithProfile,
    addApiWithoutSchema,
    updateApiSchema,
    addCodegen,
    AmplifyFrontendConfig,
    createRandomName,
    addCodegenNonAmplifyJS,
    addCodegenNonAmplifyTS,
    AmplifyFrontend,
    generateStatementsAndTypes,
    generateStatements,
    generateTypes,
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { getGraphQLConfigFilePath, testSetupBeforeAddCodegen, testValidGraphQLConfig } from "./test-setup";

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

export type TestAddCodegenUninitializedProps = {
    config: AmplifyFrontendConfig;
    projectRoot: string;
    sdlFilename?: string;
    expectedFilenames: Array<string>;
    dropAndRunCodegen?: boolean;
    dropAndRunCodegenStatements?: boolean;
    dropAndRunCodegenTypes?: boolean;
    initialFailureMessage?: string;
};

const assertTypeFileExists = (projectRoot: string): void => {
    expect(existsSync(path.join(projectRoot, 'src', 'API.ts'))).toBe(true)
};

export async function testAddCodegenUninitialized({
    config,
    projectRoot,
    sdlFilename,
    expectedFilenames,
    dropAndRunCodegen,
    dropAndRunCodegenStatements,
    dropAndRunCodegenTypes,
    initialFailureMessage,
}: TestAddCodegenUninitializedProps) {
    // Setup the non-amplify project with schema and pre-existing files
    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // Write SDL Schema
    if (sdlFilename) {
        const sdlSchema = readFileSync(path.join(__dirname, '..', '..', 'schemas', 'sdl', sdlFilename), 'utf-8');
        writeFileSync(path.join(projectRoot, sdlFilename), sdlSchema);
    }

    // add codegen without init
    switch (config.frontendType) {
        case AmplifyFrontend.javascript:
            await addCodegenNonAmplifyJS(projectRoot, initialFailureMessage);
            break;
        case AmplifyFrontend.typescript:
            await addCodegenNonAmplifyTS(projectRoot, initialFailureMessage);
            break;
        default:
            throw new Error(`Received unexpected frontendType ${config.frontendType}`);
    }

    // return if we expected the add command to fail
    if (initialFailureMessage) {
        return;
    }

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // GraphQL statements are generated
    const generatedStatementFiles = new Set(readdirSync(path.join(projectRoot, config.graphqlCodegenDir)));
    console.log(`Comparing written files: ${JSON.stringify(Array.from(generatedStatementFiles))} to expected files: ${JSON.stringify(expectedFilenames)}`);
    expectedFilenames.forEach((expectedFilename) => expect(generatedStatementFiles.has(expectedFilename)).toBe(true));
    // graphql configuration should be added
    expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);
    if (config.frontendType === AmplifyFrontend.typescript) {
        assertTypeFileExists(projectRoot)
    }

    if (dropAndRunCodegen || dropAndRunCodegenStatements || dropAndRunCodegenTypes) {
        rmSync(path.join(projectRoot, config.graphqlCodegenDir), { recursive: true });
        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // Graphql statements are deleted
        expect(existsSync(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);
    }

    if (dropAndRunCodegen) {
        await generateStatementsAndTypes(projectRoot);

        // GraphQL statements are regenerated
        const regeneratedStatementFiles = new Set(readdirSync(path.join(projectRoot, config.graphqlCodegenDir)));
        console.log(`Comparing written files: ${JSON.stringify(Array.from(regeneratedStatementFiles))} to expected files: ${JSON.stringify(expectedFilenames)}`);
        expectedFilenames.forEach((expectedFilename) => expect(regeneratedStatementFiles.has(expectedFilename)).toBe(true));

        if (config.frontendType === AmplifyFrontend.typescript) {
            assertTypeFileExists(projectRoot)
        }
    }

    if (dropAndRunCodegenStatements) {
        await generateStatements(projectRoot);

        // GraphQL statements are regenerated
        const regeneratedStatementFiles = new Set(readdirSync(path.join(projectRoot, config.graphqlCodegenDir)));
        console.log(`Comparing written files: ${JSON.stringify(Array.from(regeneratedStatementFiles))} to expected files: ${JSON.stringify(expectedFilenames)}`);
        expectedFilenames.forEach((expectedFilename) => expect(regeneratedStatementFiles.has(expectedFilename)).toBe(true));
    }

    if (dropAndRunCodegenTypes) {
        await generateTypes(projectRoot);

        if (config.frontendType === AmplifyFrontend.typescript) {
            assertTypeFileExists(projectRoot)
        }
    }
}
