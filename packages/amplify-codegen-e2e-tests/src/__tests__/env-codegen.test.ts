import { 
  createNewProjectDir, 
  deleteProjectDir,
  deleteProject,
  addApiWithSchema,
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  AmplifyFrontendConfig,
  amplifyPushWithCodegenAdd,
  amplifyPushWithCodegenUpdate,
  apiUpdateToggleDataStore,
  initJSProjectWithProfile,
  amplifyPush,
  generateModels,
  updateApiSchema
} from "amplify-codegen-e2e-core";
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
    await initJSProjectWithProfile(projectRoot, { envName: 'enva' });
    await addApiWithSchema(projectRoot, schema, { apiName });
    await amplifyPush(projectRoot);
    await addEnvironment(projectRoot, { envName: 'envb' });
    updateApiSchema(projectRoot, apiName, schemaWithError)
    await expect(generateModels(projectRoot)).rejects.toThrowError();
    await checkoutEnvironment(projectRoot, { envName: 'enva', withRestore: true });
    await expect(generateModels(projectRoot)).resolves.not.toThrow();
  });
});