import { createNewProjectDir, DEFAULT_ANDROID_CONFIG } from "amplify-codegen-e2e-core";
import { deleteAmplifyProject, testConfigureCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen configure tests - Android', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('configureCodegenAndroid');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Updating codegen configuration works as expected`, async () => {
        await testConfigureCodegen(DEFAULT_ANDROID_CONFIG, projectRoot, schema);
    });
});