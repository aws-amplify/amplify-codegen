import {
  deleteProject,
  addApiWithSchemaAndConflictDetection,
  createNewProjectDir,
  deleteProjectDir,
  generateModels,
  AmplifyFrontendConfig,
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  DEFAULT_FLUTTER_CONFIG,
  initProjectWithProfile
} from 'amplify-codegen-e2e-core';
import path from 'path';
import { existsSync } from 'fs';
import { isNotEmptyDir, generateSourceCode } from '../utils';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';
const frontendConfigs: AmplifyFrontendConfig[] = [
  DEFAULT_JS_CONFIG,
  DEFAULT_ANDROID_CONFIG,
  DEFAULT_IOS_CONFIG,
  DEFAULT_FLUTTER_CONFIG
];

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

  frontendConfigs.forEach(config => {
    it(`should generate files at desired location and not delete src files in ${config.frontendType} project`, async () => {
      //initialize amplify project
      await initProjectWithProfile(projectRoot, { ...config })
      //enable datastore
      await addApiWithSchemaAndConflictDetection(projectRoot, schema);
      //generate pre existing user file
      const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
      //generate models
      await expect(generateModels(projectRoot)).resolves.not.toThrow();
      expect(existsSync(userSourceCodePath)).toBeTruthy();
      expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBeTruthy();
    });
  });
});
