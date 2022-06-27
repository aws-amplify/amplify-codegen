import { createNewProjectDir, DEFAULT_JS_CONFIG } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testConfigureCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen configure tests - JS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('configureCodegenJS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Updating codegen configuration works as expected`, async () => {
        await testConfigureCodegen(DEFAULT_JS_CONFIG, projectRoot, schema);
    });
});