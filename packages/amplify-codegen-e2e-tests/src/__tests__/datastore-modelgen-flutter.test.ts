import { createNewProjectDir, DEFAULT_FLUTTER_CONFIG } from '@aws-amplify/amplify-codegen-e2e-core';
import { deleteAmplifyProject, testCodegenModels } from '../codegen-tests-base';
import * as path from 'path';

const schema = 'modelgen/model_gen_schema_with_aws_scalars.graphql';

describe('Datastore Modelgen tests - Flutter', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('datastoreModelgenFlutter');
  });

  afterEach(async () => {
    await deleteAmplifyProject(projectRoot);
  });

  it(`should generate files at desired location and not delete src files`, async () => {
    await testCodegenModels(DEFAULT_FLUTTER_CONFIG, projectRoot, schema);
  });

  it(`should generate files at overridden location`, async () => {
    await testCodegenModels(DEFAULT_FLUTTER_CONFIG, projectRoot, schema, path.join('lib', 'blueprints'));
  });
});
