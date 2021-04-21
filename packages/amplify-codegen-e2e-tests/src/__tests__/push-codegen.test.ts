import { 
  createNewProjectDir, 
  deleteProjectDir,
  deleteProject,
  initProjectWithProfile,
  addApiWithSchema,
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  AmplifyFrontendConfig,
  amplifyPushWithCodegenAdd,
  amplifyPushWithCodegenUpdate,
  apiUpdateToggleDataStore
} from "amplify-codegen-e2e-core";
import { isNotEmptyDir, generateSourceCode } from '../utils';
import { existsSync } from "fs";
import path from 'path';

const schema = 'simple_model.graphql';
const graphqlConfigFile = '.graphqlconfig.yml';
const frontendConfigs: AmplifyFrontendConfig[] = [
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG
];

describe('Amplify push with codegen tests', () => {
  let projectRoot: string;
  beforeEach(async () => {
    projectRoot = await createNewProjectDir('pushCodegen');
  });

  afterEach(async () => {
    const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projectRoot);
    }
    deleteProjectDir(projectRoot);
  });

  frontendConfigs.forEach(config => {
    it(`should prompt codegen add/update and not delete user files in ${config.frontendType} project`, async () => {
      await initProjectWithProfile(projectRoot, {...config});
      await addApiWithSchema(projectRoot, schema);
      //generate pre existing user file
      const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
      //push with codegen add
      await amplifyPushWithCodegenAdd(projectRoot, { ...config });
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBeTruthy();
      expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBeTruthy();
      //enable datastore
      await apiUpdateToggleDataStore(projectRoot);
      //push with codegen update
      await amplifyPushWithCodegenUpdate(projectRoot);
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBeTruthy();
    });
  });

});