import { DEFAULT_JS_CONFIG, createNewProjectDir, initProjectWithProfile, createRandomName, addApiWithoutSchema, updateApiSchema, apiGqlCompile, removeCodegen, amplifyConfigureProjectInfo, AmplifyFrontend, DEFAULT_FLUTTER_CONFIG, DEFAULT_IOS_CONFIG, DEFAULT_ANDROID_CONFIG } from "@aws-amplify/amplify-codegen-e2e-core";
import { CodegenMatrixTestProps, deleteAmplifyProject, testAddCodegenMatrix } from "../codegen-tests-base";

const schema = 'simple_model.graphql';

describe('JS codegen matrix test', () => {
  let projectRoot: string;
  let config: any = DEFAULT_JS_CONFIG;

  beforeAll(async () => {
    projectRoot = await createNewProjectDir('addCodegenMatrixJS');
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    const projectName = createRandomName();
    await addApiWithoutSchema(projectRoot, { apiName: projectName });
    await updateApiSchema(projectRoot, projectName, schema);
    await apiGqlCompile(projectRoot);
  });
  beforeEach(async () => {

  });
  afterEach(async () => {
    await removeCodegen(projectRoot);
    await amplifyConfigureProjectInfo({ cwd: projectRoot, frontendType: 'flutter'} )
  });
  afterAll(async () => {
      await deleteAmplifyProject(projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_FLUTTER_CONFIG,
      isStatementGenerated: false,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_ANDROID_CONFIG,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_IOS_CONFIG,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_IOS_CONFIG,
      typeFileName: 'apiType', // directory name
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'angular',
      codegenTarget: 'angular',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'angular',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ionic',
      codegenTarget: 'angular',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ionic',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'javascript',
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('Adding codegen works as expected', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
});