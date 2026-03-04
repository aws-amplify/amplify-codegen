import { createNewProjectDir, DEFAULT_TS_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - JS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        console.log('TS test: Starting beforeEach');
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenTS');
        console.log('TS test: Completed beforeEach');
    });

    afterEach(() => {
        console.log('TS test: Starting afterEach');
        deleteProjectDir(projectRoot);
        console.log('TS test: Completed afterEach');
    });

    it(`should generate files at desired location and not delete src files for typescript variant`, async () => {
        console.log('TS test: Starting test - should generate files at desired location');
        await testUninitializedCodegenModels({
            config: DEFAULT_TS_CONFIG,
            projectRoot,
            schemaName,
            outputDir: path.join('src', 'backmodels'),
            shouldSucceed: true,
            expectedFilenames: [
                'index.ts',
                'schema.ts',
            ],
        });
        console.log('TS test: Completed test - should generate files at desired location');
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        console.log('TS test: Starting test - should not generate files without output dir');
        await testUninitializedCodegenModels({
            config: DEFAULT_TS_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
        console.log('TS test: Completed test - should not generate files without output dir');
    });
});
