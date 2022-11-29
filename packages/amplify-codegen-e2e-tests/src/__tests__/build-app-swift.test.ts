import {
  initProjectWithQuickstart,
  DEFAULT_IOS_CONFIG,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchemaWithText,
  generateModels,
  swiftBuild,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { existsSync, writeFileSync, readdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';

describe('build app - Swift', () => {
  let apiName: string;
  let projectPBXProjCache: Buffer;
  const projectRoot = path.resolve('test-apps/swift');
  const config = DEFAULT_IOS_CONFIG;

  beforeAll(async () => {
    await initProjectWithQuickstart(projectRoot, { ...config });
    apiName = readdirSync(path.join(projectRoot, 'amplify', 'backend', 'api'))[0];
    projectPBXProjCache = readFileSync(path.join(projectRoot, 'swift.xcodeproj', 'project.pbxproj'));
  });

  afterAll(async () => {
    await rmSync(path.join(projectRoot, 'amplify'), { recursive: true, force: true });
  });

  beforeEach(() => {
    writeFileSync(path.join(projectRoot, 'swift.xcodeproj', 'project.pbxproj'), projectPBXProjCache);
  });

  afterEach(async () => {
    await rmSync(path.join(projectRoot, 'amplify', 'generated', 'models'), { recursive: true, force: true });
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    it(`builds with ${schemaName}: ${schema.description}`, async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      console.log(schemaText); // log so that circleci does not timeout
      updateApiSchemaWithText(projectRoot, 'amplifyDatasource', schemaText);
      await generateModels(projectRoot);
      await swiftBuild(projectRoot, { ...config, scheme: 'swift' });
    });
  });

  it('fails build with syntax error', async () => {
    await generateModels(projectRoot);
    await writeFileSync(path.join(projectRoot, 'amplify', 'generated', 'models', 'AmplifyModels.swift'), 'foo\nbar');
    await expect(swiftBuild(projectRoot, { ...config })).rejects.toThrowError();
  });
});
