import { DEFAULT_JS_CONFIG, craInstall, craBuild, cypressRun, isWindows } from '@aws-amplify/amplify-codegen-e2e-core';
import path from 'path';

describe('GraphQL documents generator e2e tests', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps', 'graphql-generator-app');
  const config = DEFAULT_JS_CONFIG;

  beforeAll(async () => {
    await craInstall(projectRoot, { ...config });
  });

  // skip cypress test on windows
  (isWindows() ? it.skip : it)('graphql generator does not crash in browser', async () => {
    // Build and run the cypress e2e tests
    await craBuild(projectRoot, { ...config });
    await cypressRun(projectRoot, { componentsTesting: true });
  });
});
