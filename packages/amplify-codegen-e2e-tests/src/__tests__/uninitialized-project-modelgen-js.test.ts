import { createNewProjectDir, DEFAULT_JS_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - JS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        console.log('JS test: Starting beforeEach');
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenJS');
        console.log('JS test: Completed beforeEach');
    });

    afterEach(() => {
        console.log('JS test: Starting afterEach');
        deleteProjectDir(projectRoot);
        console.log('JS test: Completed afterEach');
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        console.log('JS test: Starting test - should generate files at desired location');
        await testUninitializedCodegenModels({
            config: DEFAULT_JS_CONFIG,
            projectRoot,
            schemaName,
            outputDir: path.join('src', 'backmodels'),
            shouldSucceed: true,
            expectedFilenames: [
                'index.d.ts',
                'index.js',
                'schema.d.ts',
                'schema.js',
            ],
        });
        console.log('JS test: Completed test - should generate files at desired location');
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        console.log('JS test: Starting test - should not generate files without output dir');
        await testUninitializedCodegenModels({
            config: DEFAULT_JS_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
        console.log('JS test: Completed test - should not generate files without output dir');
    });
});
