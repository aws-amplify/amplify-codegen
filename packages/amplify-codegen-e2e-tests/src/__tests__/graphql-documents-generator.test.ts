import {
  initProjectWithProfile,
  DEFAULT_JS_CONFIG,
  addApiWithBlankSchema,
  updateApiSchemaWithText,
  craInstall,
  craBuild,
  amplifyPush,
  cypressRun,
  deleteProject
} from '@aws-amplify/amplify-codegen-e2e-core';
import { readdirSync, rmSync } from 'fs';
import { readFileSync } from 'fs-extra';
import path from 'path';

describe('GraphQL documents generator e2e tests', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps', 'docsgen-react-app');
  const config = DEFAULT_JS_CONFIG;

  beforeAll(async () => {
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithBlankSchema(projectRoot);
    await craInstall(projectRoot, { ...config });
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
  });

  afterAll(async () => {
    await deleteProject(projectRoot);
    await rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
  });

  const schemaFileName = 'schema.graphql';
  it('generates valid GraphQL documents for given schema', async () => {
    const schemaPath = path.resolve('test-apps', 'docsgen-react-app', 'public', schemaFileName);
    const schemaText = readFileSync(schemaPath, { encoding: 'utf8'});
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    await amplifyPush(projectRoot);

    // Build and run the cypress e2e tests
    await craBuild(projectRoot, { ...config });
    await cypressRun(projectRoot, { componentsTesting: true });
  });
});
