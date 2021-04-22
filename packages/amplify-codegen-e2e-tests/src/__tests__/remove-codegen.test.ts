import { 
    createNewProjectDir, 
    deleteProjectDir,
    deleteProject,
    initProjectWithProfile,
    addApiWithSchema,
    addCodegen,
    DEFAULT_JS_CONFIG,
    DEFAULT_ANDROID_CONFIG,
    DEFAULT_IOS_CONFIG,
    AmplifyFrontendConfig,
    removeCodegen
  } from "amplify-codegen-e2e-core";
  import { existsSync, readFileSync } from "fs";
  import path from 'path';
  import { isNotEmptyDir, generateSourceCode } from '../utils';
  
  const frontendConfigs: AmplifyFrontendConfig[] = [
    DEFAULT_JS_CONFIG,
    DEFAULT_ANDROID_CONFIG,
    DEFAULT_IOS_CONFIG
  ];
  const schema = 'simple_model.graphql';
  const graphqlConfigFile = '.graphqlconfig.yml';
  
  describe('codegen remove tests', () => {
    let projectRoot: string;
  
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('removeCodegen');
    });
  
    afterEach(async () => {
      const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projectRoot);
      }
      deleteProjectDir(projectRoot);
    });
  
    it(`Do nothing during remove when codegen is not added in JS project`, async () => {
      // init project and add API category
      await initProjectWithProfile(projectRoot, DEFAULT_JS_CONFIG);
      await addApiWithSchema(projectRoot, schema);
      
      // remove command should give expected message
      await expect(removeCodegen(projectRoot, false)).resolves.not.toThrow();
    });

    frontendConfigs.forEach(config => {
      it(`Do nothing during remove when codegen is previouly added in ${config.frontendType} project`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });
        await addApiWithSchema(projectRoot, schema);

        // generate pre-existing user file
        const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
        expect(existsSync(userSourceCodePath)).toBe(true);

        // add codegen
        await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
        expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(true);
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);

        // remove codegen
        await expect(removeCodegen(projectRoot)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // previously generated files should still exist
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // graphql configuration should be updated to remove previous configuration
        expect(readFileSync(path.join(projectRoot, graphqlConfigFile)).toString()).toMatchSnapshot();
      });
    });
  });