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
  AmplifyFrontendConfig
} from "amplify-codegen-e2e-core";
import { existsSync, writeFileSync, readdirSync } from "fs";
import path from 'path';

const frontendConfigs: AmplifyFrontendConfig[] = [
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG
];
const userFileData = 'This is a pre-existing file.';

function isNotEmptyDir(dirPath: string) : boolean {
  return existsSync(dirPath) && readdirSync(dirPath).length > 0;
}

describe('GraphQL codegen tests', () => {
  let projectRoot: string;
  const schema = 'simple_model.graphql';
  const graphqlConfigFile = '.graphqlconfig.yml';

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
      const userSourceCodePath = path.join(projectRoot, config.srcDir, 'sample.txt');
      writeFileSync(userSourceCodePath, userFileData);
      //execute codegen commands
      await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
      expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBeTruthy();
      await expect(generateStatementsAndTypes(projectRoot)).resolves.not.toThrow();
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBeTruthy();
    });
  });
});