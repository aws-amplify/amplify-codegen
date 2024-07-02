import {
  initProjectWithProfile,
  addApiWithoutSchema,
  updateApiSchema,
  createRandomName,
  amplifyPushWithCodegenAdd,
  AmplifyFrontendConfig,
  amplifyPushWithCodegenUpdate,
  updateAPIWithResolutionStrategyWithModels,
  getProjectMeta,
  getDeploymentBucketObject,
  amplifyPush,
} from '@aws-amplify/amplify-codegen-e2e-core';
import { existsSync } from 'fs';
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { testSetupBeforeAddCodegen } from './test-setup';

export async function testPushCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
  // init project and add API category
  await initProjectWithProfile(projectRoot, { ...config });
  const projectName = createRandomName();
  await addApiWithoutSchema(projectRoot, { apiName: projectName });
  await updateApiSchema(projectRoot, projectName, schema);

  const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

  // add codegen succeeds
  await amplifyPushWithCodegenAdd(projectRoot, { ...config });

  // pre-existing file should still exist
  expect(existsSync(userSourceCodePath)).toBe(true);

  // GraphQL statements are generated
  expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);

  //enable datastore
  await updateAPIWithResolutionStrategyWithModels(projectRoot, {});
  //push with codegen update
  await amplifyPushWithCodegenUpdate(projectRoot);
  expect(existsSync(userSourceCodePath)).toBe(true);
  expect(isNotEmptyDir(path.join(projectRoot, config.modelgenDir))).toBe(true);
}

export async function testPushAdminModelgen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
  // init project and add API category
  await initProjectWithProfile(projectRoot, { ...config, disableAmplifyAppCreation: false });
  const { DeploymentBucketName: bucketName, Region: region, AmplifyAppId: appId } = getProjectMeta(projectRoot).providers.awscloudformation;

  expect(bucketName).toBeDefined();
  expect(region).toBeDefined();
  expect(appId).toBeDefined();

  const projectName = createRandomName();
  await addApiWithoutSchema(projectRoot, { apiName: projectName });
  await updateApiSchema(projectRoot, projectName, schema);
  // add codegen succeeds
  await amplifyPush(projectRoot);

  /**
   * Source code from
   * https://github.com/aws-amplify/amplify-cli/blob/1da5de70c57b15a76f02c92364af4889d1585229/packages/amplify-provider-awscloudformation/src/admin-modelgen.ts#L85-L93
   */
  const s3ApiModelsPrefix = `models/${projectName}/`;
  const cmsArtifactLocalToS3Keys = [
    `${s3ApiModelsPrefix}schema.graphql`,
    `${s3ApiModelsPrefix}schema.js`,
    `${s3ApiModelsPrefix}modelIntrospection.json`,
  ];
  // expect CMS assets to be present in S3
  cmsArtifactLocalToS3Keys.forEach(async (key) => {
    await expect(getDeploymentBucketObject(projectRoot, key)).resolves.not.toThrow();
  });
}
