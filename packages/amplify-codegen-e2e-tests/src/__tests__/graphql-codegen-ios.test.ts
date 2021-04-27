import { 
    createNewProjectDir,
    DEFAULT_IOS_CONFIG,
  } from "amplify-codegen-e2e-core";
  import { deleteAmplifyProject, testGraphQLCodegen } from '../codegen-tests-base';
  
  const schema = 'simple_model.graphql';
  
  describe('GraphQL codegen tests - iOS', () => {
    let projectRoot: string;
  
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('graphqlCodegenIOS');
    });
  
    afterEach(async () => {
      await deleteAmplifyProject(projectRoot);
    });
    
    it(`Should generate files in correct place and not delete src files in iOS project`, async() => {
        await testGraphQLCodegen(DEFAULT_IOS_CONFIG, projectRoot, schema)
    });
});