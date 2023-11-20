import {
  initProjectWithProfile,
  DEFAULT_JS_CONFIG,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchemaWithText,
  generateModels,
  generateStatementsAndTypes,
  craInstall,
  craBuild,
  addCodegen,
  AmplifyFrontend,
  amplifyPush,
  apiGqlCompile,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync } from 'fs';
import path from 'path';

const schema = 'simple_model.graphql';

describe('build app - JS', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps/ts');
  const config = DEFAULT_JS_CONFIG;

  beforeAll(async () => {
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schemas[0].sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    await amplifyPush(projectRoot);
    await addCodegen(projectRoot, {
      frontendType: AmplifyFrontend.javascript,
    });
    await craInstall(projectRoot, { ...config });
  });

  afterAll(async () => {
    await rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
    rmSync(path.join(projectRoot, '.graphqlconfig.yml'), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    it(`builds with ${schemaName}: ${schema.description}`, async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      apiGqlCompile(projectRoot);
      await generateModels(projectRoot);
      await generateStatementsAndTypes(projectRoot);
      await craBuild(projectRoot, { ...config });
    });
  });

  it('fails build with syntax error in models', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    apiGqlCompile(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'models', 'index.d.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });

  it('fails build with syntax error in statements', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'graphql', 'queries.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });

  it('fails build with syntax error in types', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'API.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
