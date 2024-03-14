import { DEFAULT_JS_CONFIG, createNewProjectDir } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testPushAdminModelgen, testPushCodegen } from "../codegen-tests-base";

const schema = 'admin-modelgen.graphql';

describe('Amplify push with codegen tests - admin modelgen', () => {
  let projectRoot: string;
  beforeEach(async () => {
    projectRoot = await createNewProjectDir('pushCodegenAdminModelgen');
  });

  afterEach(async () => {
    await deleteAmplifyProject(projectRoot); 
  });

  it(`should not throw error for executing the admin modelgen step required by studio CMS usage post push`, async () => {
    await testPushAdminModelgen(DEFAULT_JS_CONFIG, projectRoot, schema);
  });
});