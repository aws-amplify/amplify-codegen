import { createNewProjectDir, DEFAULT_IOS_CONFIG, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { testUninitializedCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schemaName = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Uninitialized Project Modelgen tests - IOS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('uninitializedProjectModelgenIOS');
    });

    afterEach(() => deleteProjectDir(projectRoot));

    it(`should generate files at desired location and not delete src files`, async () => {
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
    });

    it(`should not generate files at desired location and not delete src files if no output dir is specified`, async () => {
        await testUninitializedCodegenModels({
            config: DEFAULT_IOS_CONFIG,
            projectRoot,
            schemaName,
            shouldSucceed: false,
        });
    });
});
