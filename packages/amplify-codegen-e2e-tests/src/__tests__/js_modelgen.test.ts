import {
    deleteProject,
    initJSProjectWithProfile,
    addApiWithSchema,
    createNewProjectDir,
    deleteProjectDir,
    generateModels
  } from 'amplify-codegen-e2e-core';
  import path from 'path';
  import { existsSync } from 'fs';
  import _ from 'lodash';
  
  describe('Codegen commands work with Angular JS projects', () => {
    let projectRoot: string;
    const schema = 'simple_model.graphql';
    const envName = 'devtest';
    
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('angular-js-sample');
      const projectSettings = { name: 'simplemodel', envName, framework: 'angular'};
      await initJSProjectWithProfile(projectRoot, projectSettings);
      await addApiWithSchema(projectRoot, schema);
    });
  
    afterEach(async () => {
      const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projectRoot);
      }
      deleteProjectDir(projectRoot);
    });

    // it('amplify init, add api and push flow still works', async () => {
    //   const meta = getProjectMeta(projectRoot);
    //   const region = meta.providers.awscloudformation.Region;
    //   const { output } = meta.api.simplemodel;
    //   const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    //   const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, region);
  
    //   expect(GraphQLAPIIdOutput).toBeDefined();
    //   expect(GraphQLAPIEndpointOutput).toBeDefined();
    //   expect(GraphQLAPIKeyOutput).toBeDefined();
  
    //   expect(graphqlApi).toBeDefined();
    //   expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
    //   const tableName = `AmplifyDataStore-${graphqlApi.apiId}-${envName}`;
    //   const error = { message: null };
    //   try {
    //     const table = await getDDBTable(tableName, region);
    //     expect(table).toBeUndefined();
    //   } catch (ex) {
    //     Object.assign(error, ex);
    //   }
    //   expect(error).toBeDefined();
    //   expect(error.message).toContain(`${tableName} not found`);
    // });

    // it('adding codegen to the project works as expected', async() => {

    // });

    // it('updating the codegen configuration works as expected', async() => {

    // });

    it('codegen models generates files at desired location', async () => {
      const generatedModelsFolder = '';
      // await generateModels(projectRoot);
      // verify the folder is not present intially
      await expect(generateModels(projectRoot)).resolves.not.toThrow();
      // test if the folder is created and has the desired files
    });
  
    // it('codegen models does not modify pre-existing source files in apps', async () => {
    //   // create a pre-existing source file
    //   await expect(generateModels(projectRoot)).rejects.toThrowError();
    //   // verify that the pre-existing source file is still present with same content
    // });
  });
  