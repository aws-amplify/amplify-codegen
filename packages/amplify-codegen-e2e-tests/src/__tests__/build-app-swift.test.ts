import {
  initProjectWithProfile,
  DEFAULT_IOS_CONFIG,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchemaWithText,
  generateModels,
  swiftInstall,
  swiftBuild,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync } from 'fs';
import path from 'path';

describe('build app - Swift', () => {
  let apiName: string;
  const projectRoot = path.resolve('test-apps/swift');
  const config = DEFAULT_IOS_CONFIG;

  beforeAll(async () => {
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithBlankSchemaAndConflictDetection(projectRoot);
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
  });

  afterAll(async () => {
    await rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
  });

  afterEach(async () => {
    await rmSync(path.join(projectRoot, 'amplify', 'generated', 'models'), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    it(`builds with ${schemaName}: ${schema.description}`, async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      updateApiSchemaWithText(projectRoot, 'amplifyDatasource', schemaText);
      await generateModels(projectRoot);
      await swiftBuild(projectRoot, { ...config, scheme: 'swift' });
    });
  });

  it('fails build with syntax error', async () => {
    await writeFileSync(path.join(projectRoot, 'src', 'models', 'index.d.ts'), 'foo\nbar');
    await expect(swiftBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
