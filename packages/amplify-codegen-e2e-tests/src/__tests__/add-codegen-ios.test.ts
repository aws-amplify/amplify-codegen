import { createNewProjectDir, DEFAULT_IOS_CONFIG } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testAddCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen add tests - iOS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('addCodegenIOS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Adding codegen works as expected`, async () => {
        await testAddCodegen(DEFAULT_IOS_CONFIG, projectRoot, schema);
    });
});