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

  // temporary until references schema has been released
  const enum TransformerVersion {
    v1 = 1 << 0,
    v2 = 1 << 1,
    all = ~0,
  }

  const enum TransformerPlatform {
    none = 0,
    api = 1 << 0,
    dataStore = 1 << 1,
    js = 1 << 2,
    jsDataStore = 1 << 3,
    ios = 1 << 4,
    iosDataStore = 1 << 5,
    android = 1 << 6,
    androidDataStore = 1 << 7,
    flutter = 1 << 8,
    flutterDataStore = 1 << 9,
    studio = 1 << 10,
    all = ~0,
  }

  Object.entries([
    ...schemas,
    [
      'references-on-hasOne-and-hasMany',
      {
        description: '@hasOne and @hasMany using references',
        transformerVersion: TransformerVersion.v2,
        supportedPlatforms: TransformerPlatform.all,
        sdl: `
      type Primary @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
        id: ID! @primaryKey
        relatedMany: [RelatedMany] @hasMany(references: "primaryId")
        relatedOne: RelatedOne @hasOne(references: "primaryId")
      }

      type RelatedMany @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
        id: ID! @primaryKey
        primaryId: ID!
        primary: Primary @belongsTo(references: "primaryId")
      }

      type RelatedOne @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
        id: ID! @primaryKey
        primaryId: ID!
        primary: Primary @belongsTo(references: "primaryId")
      }
    `,
      },
    ],
  ]).forEach(([schemaName, schema]) => {
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
