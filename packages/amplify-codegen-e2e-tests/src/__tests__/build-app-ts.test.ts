import {
  initProjectWithProfile,
  DEFAULT_JS_CONFIG,
  addApiWithDefaultSchemaAndConflictDetection,
  updateApiSchemaWithText,
  generateModels,
  generateStatementsAndTypes,
  craInstall,
  craBuild,
  addCodegen,
  AmplifyFrontend,
  apiGqlCompile,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync } from 'fs';
import path from 'path';

const schema = 'simple_model.graphql';

// not supported with conflict resolution enabled
const skip = new Set(['v2-cyclic-has-one-dependency', 'v2-cyclic-has-many-dependency']);

describe('build app - JS', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps/ts');
  const config = DEFAULT_JS_CONFIG;

  beforeAll(async () => {
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithDefaultSchemaAndConflictDetection(projectRoot);
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
    await apiGqlCompile(projectRoot);
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
    const testName = `builds with ${schemaName}: ${(schema as any).description}`;
    const testFunction = async () => {
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(schema as any).sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      await apiGqlCompile(projectRoot);
      await generateModels(projectRoot);
      await generateStatementsAndTypes(projectRoot);
      await craBuild(projectRoot, { ...config });
    };
    if (skip.has(schemaName)) {
      it.skip(testName, testFunction);
    } else {
      it(testName, testFunction);
    }
  });

  it('fails build with syntax error in models', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    await apiGqlCompile(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'models', 'index.d.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });

  it('fails build with syntax error in statements', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    await apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'graphql', 'queries.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });

  it('fails build with syntax error in types', async () => {
    const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${(Object.values(schemas)[0] as any).sdl}`;
    updateApiSchemaWithText(projectRoot, apiName, schemaText);
    await apiGqlCompile(projectRoot);
    await generateModels(projectRoot);
    await generateStatementsAndTypes(projectRoot);
    await writeFileSync(path.join(projectRoot, 'src', 'API.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
