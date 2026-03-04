import { createNewProjectDir, DEFAULT_ANDROID_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - Android', () => {
    let projectRoot: string;

    beforeEach(async () => {
        console.log('Android test: Starting beforeEach');
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenAndroid');
        console.log('Android test: Completed beforeEach');
    });

    afterEach(() => {
        console.log('Android test: Starting afterEach');
        deleteProjectDir(projectRoot);
        console.log('Android test: Completed afterEach');
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        console.log('Android test: Starting test - should generate files at desired location');
        await testUninitializedCodegenModels({
            config: DEFAULT_ANDROID_CONFIG,
            projectRoot,
            schemaName,
            outputDir: path.join('app', 'src', 'main', 'guava'),
            shouldSucceed: true,
            expectedFilenames: [
                'AmplifyModelProvider.java',
                'Attration.java',
                'Comment.java',
                'License.java',
                'Person.java',
                'Post.java',
                'Status.java',
                'User.java',
            ],
        });
        console.log('Android test: Completed test - should generate files at desired location');
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        console.log('Android test: Starting test - should not generate files without output dir');
        await testUninitializedCodegenModels({
            config: DEFAULT_ANDROID_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
        console.log('Android test: Completed test - should not generate files without output dir');
    });
});
