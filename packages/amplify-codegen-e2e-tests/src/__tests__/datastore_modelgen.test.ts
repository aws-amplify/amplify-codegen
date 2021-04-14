import {
  deleteProject,
  initJSProjectWithProfile,
  initAndroidProjectWithProfile,
  initIosProjectWithProfile,
  initFlutterProjectWithProfile,
  addApiWithSchemaAndConflictDetection,
  createNewProjectDir,
  deleteProjectDir,
  generateModels
} from 'amplify-codegen-e2e-core';
import path from 'path';
import { existsSync, writeFileSync, readdirSync } from 'fs';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';
const frontendTypes = ['js', 'android', 'ios', 'flutter']
const defaultSrcDirPath = {
  js: 'src',
  android: 'app/src/main/res',
  ios: '.',
  flutter: 'lib'
};
const defaultModelgenDirPath = {
  js: 'src/models',
  android: 'app/src/main/java',
  ios: 'amplify/generated/models',
  flutter: 'lib/models'
}
const userFileData = 'This is a pre-existing file.';

function isNotEmptyDir(dirPath: string) : boolean {
  return existsSync(dirPath) && readdirSync(dirPath).length > 0;
}

async function initProjectWithProfile(cwd: string, settings: Object, frontend: string) : Promise<void> {
  switch (frontend) {
    case 'js':
      return initJSProjectWithProfile(cwd, settings);
    case 'android':
      return initAndroidProjectWithProfile(cwd, settings);
    case 'ios':
      return initIosProjectWithProfile(cwd,settings);
    case 'flutter':
      return initFlutterProjectWithProfile(cwd,settings);
    default:
      throw Error(`${frontend} is an invalid frontend type`);
  }
}

describe('Datastore modelgen tests', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('datastoreModelgen');
  });

  afterEach(async () => {
    const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projectRoot);
    }
    deleteProjectDir(projectRoot);
  });

  frontendTypes.forEach(frontend => {
    it(`should generate files at desired location and do not delete src files in ${frontend} project`, async () => {
      const srcDir = defaultSrcDirPath[frontend];
      const modelgenOutputDir = defaultModelgenDirPath[frontend];
      //initialize amplify project
      await initProjectWithProfile(projectRoot, { srcDir }, frontend)
      //enable datastore
      await addApiWithSchemaAndConflictDetection(projectRoot, schema);
      //generate pre existing user file
      const userSourceCodePath = path.join(projectRoot, srcDir, 'sample.txt');
      writeFileSync(userSourceCodePath, userFileData);
      //generate models
      await expect(generateModels(projectRoot)).resolves.not.toThrow();
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(isNotEmptyDir(path.join(projectRoot, modelgenOutputDir))).toBeTruthy();
    });
  });
});
