import { 
  createNewProjectDir,
  DEFAULT_JS_CONFIG
} from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testPushCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('Amplify push with codegen tests - JS', () => {
  let projectRoot: string;
  beforeEach(async () => {
    projectRoot = await createNewProjectDir('pushCodegenJS');
  });

  afterEach(async () => {
    await deleteAmplifyProject(projectRoot); 
  });

  it(`should prompt codegen add/update and not delete user files`, async () => {
    await testPushCodegen(DEFAULT_JS_CONFIG, projectRoot, schema);
  });
});