import { 
  createNewProjectDir, 
  deleteProjectDir,
  deleteProject,
  initJSProjectWithProfile,
  amplifyPush,
  generateModels,
  addApiWithoutSchema,
  updateApiSchema
} from "@aws-amplify/amplify-codegen-e2e-core";
import { addEnvironment, checkoutEnvironment } from "../environment/env";
const schema = 'simple_model.graphql';
const schemaWithError = 'modelgen/model_gen_schema_with_errors.graphql';
const apiName = 'envtest';

describe('env codegen tests', () => {
  let projectRoot: string;
  beforeEach(async () => {
    projectRoot = await createNewProjectDir('envCodegenTest');
  });

  afterEach(async () => {
    await deleteProject(projectRoot);
    deleteProjectDir(projectRoot);
  });

  it('should generate models in different environments', async () => {
    //create amplify project with enva
    await initJSProjectWithProfile(projectRoot, { envName: 'enva' });
    await addApiWithoutSchema(projectRoot, { apiName: apiName });
    await updateApiSchema(projectRoot, apiName, schema);

    await amplifyPush(projectRoot);
    //create new envb
    await addEnvironment(projectRoot, { envName: 'envb' });
    //update schema to a invalid one in envb and generate models
    updateApiSchema(projectRoot, apiName, schemaWithError)
    await expect(generateModels(projectRoot, undefined, { errMessage: 'Unknown type' }));
    //checkout back to enva and generate models
    await checkoutEnvironment(projectRoot, { envName: 'enva', withRestore: true });
    await expect(generateModels(projectRoot)).resolves.not.toThrow();
  });
});