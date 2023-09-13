import { AmplifyFrontend, createNewProjectDir, DEFAULT_JS_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - JS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenJS');
    });

    afterEach(() => deleteProjectDir(projectRoot));

    it(`should generate files at desired location and not delete src files`, async () => {
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
    });

    it(`should generate files at desired location and not delete src files for typescript variant`, async () => {
        await testUninitializedCodegenModels({
            config: {
                ...DEFAULT_JS_CONFIG,
                frontendType: AmplifyFrontend.typescript,
            },
            projectRoot,
            schemaName,
            outputDir: path.join('src', 'backmodels'),
            shouldSucceed: true,
            expectedFilenames: [
                'index.ts',
                'schema.ts',
            ],
        });
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        await testUninitializedCodegenModels({
            config: DEFAULT_JS_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
    });
});
