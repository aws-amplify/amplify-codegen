import {
  createNewProjectDir,
  deleteProjectDir,
  deleteProject,
  initJSProjectWithProfile,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchema,
  createRandomName,
  amplifyPush,
  amplifyPull,
  getAppId,
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  DEFAULT_FLUTTER_CONFIG,
  AmplifyFrontendConfig,
  getAdminApp,
  amplifyPullSandbox,
  getProjectSchema,
  AmplifyFrontend,
} from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync } from 'fs';
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';
import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { SandboxApp } from '../types/SandboxApp';
import { createPubspecLockFile } from '../codegen-tests-base';

const schema = 'simple_model.graphql';
const envName = 'pulltest';
const frontendConfigs: AmplifyFrontendConfig[] = [DEFAULT_JS_CONFIG, DEFAULT_ANDROID_CONFIG, DEFAULT_IOS_CONFIG, DEFAULT_FLUTTER_CONFIG];

describe('Amplify pull in amplify app with codegen tests', () => {
  let projectRoot: string;
  let appId: string;
  beforeAll(async () => {
    const name = createRandomName();
    projectRoot = await createNewProjectDir('pullCodegen');
    await initJSProjectWithProfile(projectRoot, { name, envName, disableAmplifyAppCreation: false });
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    await updateApiSchema(projectRoot, name, schema);
    await amplifyPush(projectRoot);
    appId = getAppId(projectRoot);
    expect(appId).toBeDefined();
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
    const userSourceCodePath = generateSourceCode(projectRoot, DEFAULT_JS_CONFIG.srcDir);
    //amplify pull in original project
    await amplifyPull(projectRoot, {});
    expect(existsSync(userSourceCodePath)).toBe(true);
    expect(isNotEmptyDir(path.join(projectRoot, DEFAULT_JS_CONFIG.modelgenDir))).toBe(true);
  });

  describe('amplify pull in a new folder', () => {
    let emptyProjectRoot: string;
    beforeEach(async () => {
      emptyProjectRoot = await createNewProjectDir('pullCodegenEmpty');
    });
    afterEach(async () => {
      deleteProjectDir(emptyProjectRoot);
    });

    frontendConfigs.forEach(config => {
      it(`should generate models and do not delete user files by amplify pull in an empty folder of ${config.frontendType} app`, async () => {
        //generate pre existing user file
        const userSourceCodePath = generateSourceCode(emptyProjectRoot, config.srcDir);
        // Flutter projects need min dart version to be met for modelgen to succeed.
        if (config?.frontendType === AmplifyFrontend.flutter) {
          createPubspecLockFile(emptyProjectRoot);
        };
        //amplify pull in a new project
        await amplifyPull(emptyProjectRoot, { emptyDir: true, appId, frontendConfig: config });
        expect(existsSync(userSourceCodePath)).toBe(true);
        expect(isNotEmptyDir(path.join(emptyProjectRoot, config.modelgenDir))).toBe(true);
      });
    });
  });
});

describe('Amplify pull in sandbox app with codegen tests', () => {
  let projectRoot: string;
  let sandboxId: string;
  const schemaBody = {
    schema:
      '    type Todo @model @auth(rules: [{allow: public}]) {        id: ID!        name: String!        description: String    }    ',
    shareable: 'true',
  };
  beforeAll(async () => {
    const sandBoxAppString = await getAdminApp(schemaBody);
    expect(sandBoxAppString).toBeDefined();
    const sandboxApp = JSONUtilities.parse<SandboxApp>(sandBoxAppString);
    expect(sandboxApp.schema).toEqual(schemaBody.schema);
    sandboxId = sandboxApp.backendManagerAppId;
    expect(sandboxId).toBeDefined();
  });

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('sandboxPull');
  });

  afterEach(async () => {
    deleteProjectDir(projectRoot);
  });

  frontendConfigs.forEach(config => {
    it(`should pull sandbox, download schema and generate models without deleting user files in ${config.frontendType} project`, async () => {
      //generate pre existing user file
      const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
      // Flutter projects need min dart version to be met for modelgen to succeed.
      if (config?.frontendType === AmplifyFrontend.flutter) {
        createPubspecLockFile(projectRoot);
      };
      //pull sandbox app
      await amplifyPullSandbox(projectRoot, {
        appType: config.frontendType,
        sandboxId,
      });
      //schema should match with sandbox
      const projectSchema = getProjectSchema(projectRoot, 'amplifyDatasource');
      expect(projectSchema).toEqual(schemaBody.schema);
      //models should be generated and no user files get deleted
      expect(existsSync(userSourceCodePath)).toBe(true);
      expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBe(true);
    });
  });
});
