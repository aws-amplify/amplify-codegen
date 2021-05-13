import { createNewProjectDir, DEFAULT_IOS_CONFIG } from "amplify-codegen-e2e-core";
import { deleteAmplifyProject, testRemoveCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen remove tests - iOS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('removeCodegenIOS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Does not delete files during codegen remove`, async () => {
        await testRemoveCodegen(DEFAULT_IOS_CONFIG, projectRoot, schema);
    });
});