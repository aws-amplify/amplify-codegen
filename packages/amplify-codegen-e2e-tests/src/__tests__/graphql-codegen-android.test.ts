import { 
    createNewProjectDir,
    DEFAULT_ANDROID_CONFIG,
  } from "@aws-amplify/amplify-codegen-e2e-core";
  import { deleteAmplifyProject, testGraphQLCodegen } from '../codegen-tests-base';
  
  const schema = 'simple_model.graphql';
  
  describe('GraphQL codegen tests - Android', () => {
    let projectRoot: string;
  
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('graphqlCodegenAndroid');
    });
  
    afterEach(async () => {
      await deleteAmplifyProject(projectRoot);
    });
    
    it(`Should generate files in correct place and not delete src files in Android project`, async() => {
        await testGraphQLCodegen(DEFAULT_ANDROID_CONFIG, projectRoot, schema)
    });
});