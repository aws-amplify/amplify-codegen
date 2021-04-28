import { 
    createNewProjectDir, 
    DEFAULT_JS_CONFIG, 
    removeCodegen,
    initProjectWithProfile,
    addApiWithSchema
} from "amplify-codegen-e2e-core";
import { deleteAmplifyProject, testRemoveCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen remove tests - JS', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('removeCodegenJS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Give appropriate message during remove when codegen is not added in JS project`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, DEFAULT_JS_CONFIG);
        await addApiWithSchema(projectRoot, schema);
        
        // remove command should give expected message
        await expect(removeCodegen(projectRoot, false)).resolves.not.toThrow();
    });

    it(`Does not delete files during codegen remove`, async () => {
        await testRemoveCodegen(DEFAULT_JS_CONFIG, projectRoot, schema);
    });
});