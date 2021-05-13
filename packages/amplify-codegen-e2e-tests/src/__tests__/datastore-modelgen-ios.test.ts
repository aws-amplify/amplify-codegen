import { createNewProjectDir, DEFAULT_IOS_CONFIG } from "amplify-codegen-e2e-core";
import { deleteAmplifyProject, testCodegenModels } from '../codegen-tests-base';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Datastore Modelgen tests - iOS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('datastoreModelgenIOS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`should generate files at desired location and not delete src files`, async () => {
        await testCodegenModels(DEFAULT_IOS_CONFIG, projectRoot, schema);
    });
});