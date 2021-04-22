import { 
  createNewProjectDir, 
  deleteProjectDir,
  deleteProject,
  initProjectWithProfile,
  addApiWithSchema,
  generateStatementsAndTypes,
  addCodegen,
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  AmplifyFrontendConfig,
} from "amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';

const frontendConfigs: AmplifyFrontendConfig[] = [
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG
];
const schema = 'simple_model.graphql';
const graphqlConfigFile = '.graphqlconfig.yml';

describe('GraphQL codegen tests', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('graphqlCodegen');
  });

  afterEach(async () => {
    const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projectRoot);
    }
    deleteProjectDir(projectRoot);
  });

  frontendConfigs.forEach(config => {
    it(`Should generate files in correct place and not delete src files in ${config.frontendType} project`, async () => {
      await initProjectWithProfile(projectRoot, { ...config });
      await addApiWithSchema(projectRoot, schema);
      //generate pre existing user file
      const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
      //execute codegen add command
      await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
      expect(existsSync(userSourceCodePath)).toBe(true);
      expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(true);
      expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
      //execute codegen command
      await expect(generateStatementsAndTypes(projectRoot)).resolves.not.toThrow();
      expect(existsSync(userSourceCodePath)).toBe(true);
      expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
    });
  });
});