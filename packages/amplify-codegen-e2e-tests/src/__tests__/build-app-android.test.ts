import {
  initProjectWithProfile,
  DEFAULT_ANDROID_CONFIG,
  updateApiSchemaWithText,
  addApiWithDefaultSchemaAndConflictDetection,
  generateModels,
  generateStatementsAndTypes,
  androidBuild,
  acceptLicenses,
  addCodegen,
  AmplifyFrontend,
  apiGqlCompile,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';
import { parse } from 'graphql';

const skip = new Set([
  'v2-primary-key-with-composite-sort-key',
  'custom-@primaryKey-with-sort-fields',
  'v2-cyclic-has-one-dependency',
  'v2-cyclic-has-many-dependency',
]);

describe('build app - Android', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps/android');
  const config = DEFAULT_ANDROID_CONFIG;
  const modelDir = 'app/src/main/java/com/amplifyframework/datastore/generated/model';
  const statementsDir = 'app/src/main/graphql/com/amazonaws/amplify/generated/graphql';

  beforeAll(async () => {
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithDefaultSchemaAndConflictDetection(projectRoot);
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
    await apiGqlCompile(projectRoot);
    await addCodegen(projectRoot, {
      frontendType: AmplifyFrontend.android,
    });
    await acceptLicenses(projectRoot);
  });

  afterAll(async () => {
    rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
    rmSync(path.join(projectRoot, '.graphqlconfig.yml'), { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(path.join(projectRoot, modelDir), { recursive: true, force: true });
    rmSync(path.join(projectRoot, statementsDir), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    const testName = `builds with ${schemaName}: ${schema.description}`;
    const testFunction = async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      await apiGqlCompile(projectRoot);
      await generateModels(projectRoot);
      await generateStatementsAndTypes(projectRoot);
      await androidBuild(projectRoot, { ...config });
      // android uses raw graphql syntax
      parse(readFileSync(path.join(projectRoot, path.join(statementsDir, 'queries.graphql')), 'utf8'));
      parse(readFileSync(path.join(projectRoot, path.join(statementsDir, 'subscriptions.graphql')), 'utf8'));
      parse(readFileSync(path.join(projectRoot, path.join(statementsDir, 'mutations.graphql')), 'utf8'));
    };
    if (skip.has(schemaName)) {
      it.skip(testName, testFunction);
    } else {
      it(testName, testFunction);
    }
  });

  // not supported with conflict resolution enabled
  [
    ['v2-cyclic-has-one-dependency', schemas['v2-cyclic-has-one-dependency']],
    ['v2-cyclic-has-many-dependency', schemas['v2-cyclic-has-many-dependency']],
  ].forEach(([schemaName, schema]) => {
    // @ts-ignore
    it(`builds models with ${schemaName}: ${schema.description}`, async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      await generateModels(projectRoot);
      await androidBuild(projectRoot, { ...config });
    });
  });

  it('fails build with syntax error in models', async () => {
    // @ts-ignore
    updateApiSchemaWithText(projectRoot, apiName, Object.values(schemas)[0].sdl);
    await apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await writeFileSync(path.join(projectRoot, modelDir, 'AmplifyModelProvider.java'), 'foo\nbar');
    await expect(androidBuild(projectRoot, { ...config })).rejects.toThrowError();
  });

  it('fails build with syntax error in statements', async () => {
    // @ts-ignore
    updateApiSchemaWithText(projectRoot, apiName, Object.values(schemas)[0].sdl);
    await apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    writeFileSync(path.join(projectRoot, statementsDir, 'mutations.graphql'), 'foo\nbar');
    expect(() => parse(readFileSync(path.join(projectRoot, statementsDir, 'mutations.graphql'), 'utf8'))).toThrowError();
    await androidBuild(projectRoot, { ...config });
  });
});
