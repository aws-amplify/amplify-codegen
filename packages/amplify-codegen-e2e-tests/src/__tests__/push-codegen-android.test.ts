import { 
    createNewProjectDir,
    DEFAULT_ANDROID_CONFIG
} from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testPushCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('Amplify push with codegen tests - Android', () => {
    let projectRoot: string;
    beforeEach(async () => {
        projectRoot = await createNewProjectDir('pushCodegenAndroid');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot); 
    });

    it(`should prompt codegen add/update and not delete user files`, async () => {
        await testPushCodegen(DEFAULT_ANDROID_CONFIG, projectRoot, schema);
    });
});