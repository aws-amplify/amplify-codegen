import { DEFAULT_JS_CONFIG, createNewProjectDir } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteAmplifyProject, testPushCodegen } from "../codegen-tests-base";

const schema = 'admin-modelgen.graphql';

describe('Amplify push with codegen tests - admin modelgen', () => {
  let projectRoot: string;
  beforeEach(async () => {
    projectRoot = await createNewProjectDir('pushCodegenAdminModelgen');
  });

  afterEach(async () => {
    await deleteAmplifyProject(projectRoot); 
  });

  it(`should not throw error for executing the modelgen commands (datastore modelgen & model-introspection) post push`, async () => {
    await testPushCodegen(DEFAULT_JS_CONFIG, projectRoot, schema);
  });
});