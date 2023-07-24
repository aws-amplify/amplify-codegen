import {
  initProjectWithQuickstart,
  DEFAULT_ANDROID_CONFIG,
  updateApiSchemaWithText,
  generateModels,
  androidBuild,
  acceptLicenses
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync } from 'fs';
import path from 'path';

const skip = new Set(['v2-primary-key-with-composite-sort-key', 'custom-@primaryKey-with-sort-fields']);

describe('build app - Android', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps/android');
  const config = DEFAULT_ANDROID_CONFIG;
  const modelDir = 'app/src/main/java/com/amplifyframework/datastore/generated/model';

  beforeAll(async () => {
    await initProjectWithQuickstart(projectRoot, { ...config });
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
    await acceptLicenses(projectRoot);
  });

  afterAll(async () => {
    rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(path.join(projectRoot, modelDir), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    const testName = `builds with ${schemaName}: ${schema.description}`;
    const testFunction = async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      await generateModels(projectRoot);
      await androidBuild(projectRoot, { ...config });
    };
    if (skip.has(schemaName)) {
      it.skip(testName, testFunction);
    } else {
      it(testName, testFunction);
    }
  });

  it('fails build with syntax error', async () => {
    // @ts-ignore
    updateApiSchemaWithText(projectRoot, apiName, Object.values(schemas)[0].sdl);
    await generateModels(projectRoot);
    await writeFileSync(path.join(projectRoot, modelDir, 'AmplifyModelProvider.java'), 'foo\nbar');
    await expect(androidBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
