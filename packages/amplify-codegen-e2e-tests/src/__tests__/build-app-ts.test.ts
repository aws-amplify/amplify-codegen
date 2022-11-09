import {
  initProjectWithProfile,
  DEFAULT_JS_CONFIG,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchemaWithText,
  generateModels,
  craInstall,
  craBuild,
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
    await craInstall(projectRoot, { ...config });
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
  });

  afterAll(async () => {
    await rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    it(`builds with ${schemaName}: ${schema.description}`, async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, apiName, schemaText);
      await generateModels(projectRoot);
      await craBuild(projectRoot, { ...config });
    });
  });

  it('fails build with syntax error', async () => {
    await writeFileSync(path.join(projectRoot, 'src', 'models', 'index.d.ts'), 'foo\nbar');
    await expect(craBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
