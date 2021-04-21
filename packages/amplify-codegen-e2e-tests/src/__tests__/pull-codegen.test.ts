import { 
  createNewProjectDir, 
  deleteProjectDir,
  deleteProject,
  initJSProjectWithProfile,
  addApiWithSchemaAndConflictDetection,
  amplifyPush,
  amplifyPull,
  getAppId
} from "amplify-codegen-e2e-core";
import { existsSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';

const schema = 'simple_model.graphql';
const envName = 'pulltest';

describe('Amplify pull with codegen tests', () => {
  let projectRoot: string;
  let appId: string;
  beforeAll(async () => {
    projectRoot = await createNewProjectDir('pullCodegen');
    await initJSProjectWithProfile(projectRoot, { envName, disableAmplifyAppCreation: false });
    await addApiWithSchemaAndConflictDetection(projectRoot, schema);
    await amplifyPush(projectRoot);
    appId = getAppId(projectRoot);
  });

  afterAll(async () => {
    const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projectRoot);
    }
    deleteProjectDir(projectRoot);
  });

  it('should generate models and do not delete user src files by amplify pull in original project', async () => {
    //generate pre existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, 'src');
    //amplify pull in original project
    await amplifyPull(projectRoot, {});
    expect(existsSync(userSourceCodePath)).toBeTruthy();
    expect(isNotEmptyDir(path.join(projectRoot, 'src/models'))).toBeTruthy();
  });

  describe('amplify pull in a new folder', () => {
    let emptyProjectRoot: string
    beforeEach(async () => {
      emptyProjectRoot= await createNewProjectDir('pullCodegenEmpty');
    });
    afterEach(async () => {
      deleteProjectDir(emptyProjectRoot);
    });

    it('should generate models and do not delete user files by amplify pull in an empty folder', async () => {
      //generate pre existing user file
      const userSourceCodePath = generateSourceCode(emptyProjectRoot, 'src');
      //amplify pull in a new project
      await amplifyPull(emptyProjectRoot, {emptyDir: true, appId});
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(isNotEmptyDir(path.join(emptyProjectRoot, 'src/models'))).toBeTruthy();
    });
  });

});