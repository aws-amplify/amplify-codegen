import {
  initProjectWithQuickstart,
  DEFAULT_IOS_CONFIG,
  updateApiSchemaWithText,
  generateModels,
} from '@aws-amplify/amplify-codegen-e2e-core';
const { schemas } = require('@aws-amplify/graphql-schema-test-library');
import { writeFileSync, readdirSync, readFileSync } from 'fs';
import path from 'path';

const skip = new Set([
  'v2-recursive-has-one-dependency',
  'v2-cyclic-has-one-dependency',
  '@hasOne-with-@belongsTo-with-implicit-parameters',
  '@hasOne-with-@belongsTo-with-explicit-parameters',
]);

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

  afterEach(async () => {
    writeFileSync(path.join(projectRoot, 'swift.xcodeproj', 'project.pbxproj'), projectPBXProjCache);
  });

  Object.entries(schemas).forEach(([schemaName, schema]) => {
    // @ts-ignore
    const testName = `builds with ${schemaName}: ${schema.description}`;
    const schemaFolderName = schemaName.replace(/[^a-zA-Z0-9]/g, '');
    const outputDir = path.join(projectRoot, 'amplify', 'generated', 'models', schemaFolderName);
    const testFunction = async () => {
      // @ts-ignore
      const schemaText = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
      console.log(schemaText); // log so that ci does not timeout
      updateApiSchemaWithText(projectRoot, 'amplifyDatasource', schemaText);
      await generateModels(projectRoot, outputDir);
    };
    if (skip.has(schemaName)) {
      it.skip(testName, testFunction);
    } else {
      it(testName, testFunction);
    }
  });
});
