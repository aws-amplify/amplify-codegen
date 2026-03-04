import { createNewProjectDir, DEFAULT_IOS_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - IOS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        console.log('iOS test: Starting beforeEach');
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenIOS');
        console.log('iOS test: Completed beforeEach');
    });

    afterEach(() => {
        console.log('iOS test: Starting afterEach');
        deleteProjectDir(projectRoot);
        console.log('iOS test: Completed afterEach');
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        console.log('iOS test: Starting test - should generate files at desired location');
        await testUninitializedCodegenModels({
            config: DEFAULT_IOS_CONFIG,
            projectRoot,
            schemaName,
            outputDir: path.join('amplification', 'manufactured', 'models'),
            shouldSucceed: true,
            expectedFilenames: [
                'AmplifyModels.swift',
                'Attration+Schema.swift',
                'Attration.swift',
                'Comment+Schema.swift',
                'Comment.swift',
                'License+Schema.swift',
                'License.swift',
                'Person+Schema.swift',
                'Person.swift',
                'Post+Schema.swift',
                'Post.swift',
                'Status.swift',
                'User+Schema.swift',
                'User.swift',
            ],
        });
        console.log('iOS test: Completed test - should generate files at desired location');
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        console.log('iOS test: Starting test - should not generate files without output dir');
        await testUninitializedCodegenModels({
            config: DEFAULT_IOS_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
        console.log('iOS test: Completed test - should not generate files without output dir');
    });
});
