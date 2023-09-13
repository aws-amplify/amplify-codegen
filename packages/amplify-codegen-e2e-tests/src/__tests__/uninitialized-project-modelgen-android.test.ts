import { createNewProjectDir, DEFAULT_ANDROID_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - Android', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenAndroid');
    });

    afterEach(() => deleteProjectDir(projectRoot));

    it(`should generate files at desired location and not delete src files`, async () => {
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
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        await testUninitializedCodegenModels({
            config: DEFAULT_ANDROID_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
    });
});
