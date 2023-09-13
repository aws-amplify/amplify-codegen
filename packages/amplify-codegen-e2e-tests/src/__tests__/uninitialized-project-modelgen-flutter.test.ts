import { createNewProjectDir, DEFAULT_FLUTTER_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - Flutter', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenFlutter');
    });

    afterEach(() => deleteProjectDir(projectRoot));

    it(`should generate files at desired location and not delete src files`, async () => {
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
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        await testUninitializedCodegenModels({
            config: DEFAULT_FLUTTER_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
    });
});
