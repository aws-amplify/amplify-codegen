import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from "@aws-amplify/amplify-codegen-e2e-core";
import { deleteSandbox, initGen2Project, sandboxDeploy } from "../gen2-codegen-tests-base/commands";

describe('GraphQL generator for Gen2 e2e tests', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'graphqlGeneratorGen2';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    await deleteSandbox(projRoot);
    deleteProjectDir(projRoot);
  });

  it('demo', async () => {
    const template = path.resolve(path.join(__dirname, 'backends', 'graphql-generator-gen2'))
    await initGen2Project(projRoot, template);
    await sandboxDeploy(projRoot);
  })
});