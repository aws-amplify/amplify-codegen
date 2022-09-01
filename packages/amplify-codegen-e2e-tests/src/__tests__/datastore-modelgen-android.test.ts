import { createNewProjectDir, DEFAULT_ANDROID_CONFIG } from '@aws-amplify/amplify-codegen-e2e-core';
import { deleteAmplifyProject, testCodegenModels } from '../codegen-tests-base';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Datastore Modelgen tests - Android', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('datastoreModelgenAndroid');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        await testCodegenModels(DEFAULT_ANDROID_CONFIG, projectRoot, schema);
    });

    it('Should generate files at overridden output path', async () => {
        await testCodegenModels(DEFAULT_ANDROID_CONFIG, projectRoot, schema, 'app/src/main/guava');
    });
});
