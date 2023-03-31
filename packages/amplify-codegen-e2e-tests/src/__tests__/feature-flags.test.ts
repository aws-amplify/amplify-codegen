import * as fs from 'fs-extra';
import { initJSProjectWithProfile, createNewProjectDir, deleteProject, deleteProjectDir } from '@aws-amplify/amplify-codegen-e2e-core';
import { pathManager } from '@aws-amplify/amplify-cli-core';

const codegenFeatureFlags = {
  handlelistnullabilitytransparently: true,
  addtimestampfields: true,
  useappsyncmodelgenplugin: true,
  usedocsgeneratorplugin: true,
  usetypesgeneratorplugin: true,
  cleangeneratedmodelsdirectory: true,
  retaincasestyle: true,
  generateindexrules: true,
  emitauthprovider: true,
  enabledartnullsafety: true,
  generatemodelsforlazyloadandcustomselectionset: false,
};

describe('codegen related feature flags - new project', () => {
  let projRoot: string;

  beforeEach(async () => {
    // Given: a new project is created
    // When: amplify is initialized in the new project
    projRoot = await createNewProjectDir('feature-flags');
    await initJSProjectWithProfile(projRoot, {});
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('correct values are set for codegen feature flags in a new project', async () => {
    // Then: the codegen related feature flags are correctly set
    const cliJSONFilePath = pathManager.getCLIJSONFilePath(projRoot);
    expect(fs.existsSync(cliJSONFilePath)).toBe(true);
    expect(fs.readJSONSync(cliJSONFilePath).features.codegen).toEqual(codegenFeatureFlags);
  });
});
