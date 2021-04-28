import { createNewProjectDir, DEFAULT_ANDROID_CONFIG } from "amplify-codegen-e2e-core";
import { deleteAmplifyProject, testAddCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen add tests - Android', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('addCodegenAndroid');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Adding codegen works as expected`, async () => {
        await testAddCodegen(DEFAULT_ANDROID_CONFIG, projectRoot, schema);
    });
});