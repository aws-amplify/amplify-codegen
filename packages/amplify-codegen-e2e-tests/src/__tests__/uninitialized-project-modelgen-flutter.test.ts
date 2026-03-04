import { createNewProjectDir, DEFAULT_FLUTTER_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - Flutter', () => {
    let projectRoot: string;

    beforeEach(async () => {
        console.log('Flutter test: Starting beforeEach');
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenFlutter');
        console.log('Flutter test: Completed beforeEach');
    });

    afterEach(() => {
        console.log('Flutter test: Starting afterEach');
        deleteProjectDir(projectRoot);
        console.log('Flutter test: Completed afterEach');
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        console.log('Flutter test: Starting test - should generate files at desired location');
        await testUninitializedCodegenModels({
            config: DEFAULT_FLUTTER_CONFIG,
            projectRoot,
            schemaName,
            outputDir: path.join('lib', 'blueprints'),
            shouldSucceed: true,
            expectedFilenames: [
                'Attration.dart',
                'Comment.dart',
                'License.dart',
                'ModelProvider.dart',
                'Person.dart',
                'Post.dart',
                'Status.dart',
                'User.dart',
            ],
        });
        console.log('Flutter test: Completed test - should generate files at desired location');
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        console.log('Flutter test: Starting test - should not generate files without output dir');
        await testUninitializedCodegenModels({
            config: DEFAULT_FLUTTER_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
        console.log('Flutter test: Completed test - should not generate files without output dir');
    });
});
