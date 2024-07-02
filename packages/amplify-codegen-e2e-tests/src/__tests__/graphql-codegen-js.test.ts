import { createNewProjectDir, DEFAULT_JS_CONFIG } from '@aws-amplify/amplify-codegen-e2e-core';
import { deleteAmplifyProject, testGraphQLCodegen } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('GraphQL codegen tests - JS', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('graphqlCodegenJS');
  });

  afterEach(async () => {
    await deleteAmplifyProject(projectRoot);
  });

  it(`Should generate files in correct place and not delete src files in JS project`, async () => {
    await testGraphQLCodegen(DEFAULT_JS_CONFIG, projectRoot, schema);
  });
});
