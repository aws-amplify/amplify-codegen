import {  createNewProjectDir, DEFAULT_JS_CONFIG, AmplifyFrontend, generateStatementsAndTypes } from '@aws-amplify/amplify-codegen-e2e-core';
import path from 'path';
import { deleteAmplifyProject, testAddCodegenUninitialized } from '../codegen-tests-base';
import { rmSync } from "fs-extra";

describe('codegen add tests - JS', () => {
    let projectRoot: string;
    const javascriptConfig = DEFAULT_JS_CONFIG;
    const typescriptConfig = {
        ...DEFAULT_JS_CONFIG,
        frontendType: AmplifyFrontend.typescript,
    };

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('uninitializedProjectCodegenJS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`graphql sdl file`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: javascriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.js', 'queries.js', 'subscriptions.js'],
        });
    });

    it(`region is ignored if schema file is provided`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: javascriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.js', 'queries.js', 'subscriptions.js'],
            additionalParams: ['--region', 'us-fake-1'],
        });
    });

    it(`json sdl file`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: javascriptConfig,
            sdlFilename: 'schema.json',
            expectedFilenames: ['mutations.js', 'queries.js', 'subscriptions.js'],
        });
    });

    it(`typescript`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: typescriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.ts', 'queries.ts', 'subscriptions.ts'],
        });
    });

    it(`drop and regenerate`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: typescriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.ts', 'queries.ts', 'subscriptions.ts'],
            dropAndRunCodegen: true,
        });
    });

    it(`drop and regenerate statements`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: typescriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.ts', 'queries.ts', 'subscriptions.ts'],
            dropAndRunCodegenStatements: true,
        });
    });

    it(`drop and regenerate types`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: typescriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.ts', 'queries.ts', 'subscriptions.ts'],
            dropAndRunCodegenStatements: true,
            dropAndRunCodegenTypes: true,
        });
    });

    it(`throws a sane warning on missing graphqlconfig file`, async () => {
        // Add codegen
        await testAddCodegenUninitialized({
            projectRoot,
            config: javascriptConfig,
            sdlFilename: 'schema.graphql',
            expectedFilenames: ['mutations.js', 'queries.js', 'subscriptions.js'],
        });

        // Remove .graphqlconfig.yml file
        rmSync(path.join(projectRoot, '.graphqlconfig.yml'));

        // Run and expect failure message
        await generateStatementsAndTypes(projectRoot, 'code generation is not configured');
    });

    it(`throws a sane warning on missing sdl schema and no api id specified`, async () => {
        await testAddCodegenUninitialized({
            projectRoot,
            config: javascriptConfig,
            expectedFilenames: ['mutations.js', 'queries.js', 'subscriptions.js'],
            initialFailureMessage: 'Provide an AppSync API ID with --apiId or manually download schema.graphql or schema.json'
        });
    });
});
