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

  it('Flutter - no statements or types', async () => {
    config = {
      ...DEFAULT_FLUTTER_CONFIG,
      isStatementGenerated: false,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('Android - no types', async () => {
    config = {
      ...DEFAULT_ANDROID_CONFIG,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('iOS - single file path as type name', async () => {
    config = {
      ...DEFAULT_IOS_CONFIG,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('iOS - folder as type name', async () => {
    config = {
      ...DEFAULT_IOS_CONFIG,
      typeFileName: 'apiType', // directory name
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - angular - angular', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'angular',
      codegenTarget: 'angular',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - angular - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'angular',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - ionic - angular', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ionic',
      codegenTarget: 'angular',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - ionic - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ionic',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - none - javascript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - none - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - none - flow', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - react - javascript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'javascript',
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - react - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - react - flow', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react',
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - react native - javascript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react-native',
      codegenTarget: 'javascript',
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - react native - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react-native',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - react native - flow', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'react-native',
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - ember - javascript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ember',
      codegenTarget: 'javascript',
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - ember - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ember',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - ember - flow', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'ember',
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });

  it('JavaScript - vue - javascript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'vue',
      codegenTarget: 'javascript',
      isTypeGenerated: false,
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - vue - typescript', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'vue',
      codegenTarget: 'typescript',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
  it('JavaScript - vue - flow', async () => {
    config = {
      ...DEFAULT_JS_CONFIG,
      framework: 'vue',
      codegenTarget: 'flow',
    }
    await testAddCodegenMatrix(config, projectRoot);
  });
});