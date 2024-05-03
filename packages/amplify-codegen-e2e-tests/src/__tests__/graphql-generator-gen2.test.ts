import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteSandbox, generateForms, generateGraphqlClientCode, generateOutputs, initGen2Project, sandboxDeploy } from "../gen2-codegen-tests-base/commands";

describe('GraphQL generator for Gen2 e2e tests', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeAll(async () => {
    projFolderName = 'graphqlGeneratorGen2';
    projRoot = await createNewProjectDir(projFolderName);
    const template = path.resolve(path.join(__dirname, 'backends', 'graphql-generator-gen2'))
    await initGen2Project(projRoot, template);
    await sandboxDeploy(projRoot);
  });

  afterAll(async () => {
    await deleteSandbox(projRoot);
    deleteProjectDir(projRoot);
  });

  it('should not throw error when generating outputs', async () => {
    await expect(generateOutputs(projRoot)).resolves.not.toThrow();
  });

  it('should not throw error when generating forms', async () => {
    await expect(generateForms(projRoot)).resolves.not.toThrow();
  });

  it('should not throw error when generating GraphQL client code', async () => {
    await expect(generateGraphqlClientCode(projRoot, { outDir: 'codegen', format: 'introspection'})).resolves.not.toThrow();
  });
});