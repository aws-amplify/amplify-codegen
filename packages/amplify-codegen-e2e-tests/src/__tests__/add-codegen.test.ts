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
  
  describe('codegen add tests', () => {
    let projectRoot: string;
  
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('addCodegen');
    });
  
    afterEach(async () => {
      const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projectRoot);
      }
      deleteProjectDir(projectRoot);
    });

    it(`Adding codegen without API gives appropriate message in JS project`, async () => {
        const config = DEFAULT_JS_CONFIG;
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });

        // generate pre-existing user file
        const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
        // given that the pre-existing file exists
        expect(existsSync(userSourceCodePath)).toBe(true);

        // add codegen without API gives appropriate message
        const settings = { isAPINotAdded: true, ...config };
        await expect(addCodegen(projectRoot, settings)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // GraphQL statements are not generated
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);
        // graphql configuration should not be added
        expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(false);
    });

    it(`Adding codegen twice gives appropriate message in JS project`, async () => {
        const config = DEFAULT_JS_CONFIG;
        const pathToConfigFile = path.join(projectRoot, graphqlConfigFile);

        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });
        await addApiWithSchema(projectRoot, schema);

        // generate pre-existing user file
        const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
        // given that the pre-existing file exists
        expect(existsSync(userSourceCodePath)).toBe(true);

        // adding codegen succeeds and generates a config file
        await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
        expect(existsSync(pathToConfigFile)).toBe(true);
        
        // adding codegen again gives appropriate message
        const settings = { isCodegenAdded: true, ...config }; 
        await expect(addCodegen(projectRoot, settings)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // previously generated files should still exist
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // check if the added codegen configuration is valid
        expect(readFileSync(pathToConfigFile).toString()).toMatchSnapshot();
    });

    frontendConfigs.forEach(config => {
      it(`Adding codegen works as expected in ${config.frontendType} project`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });
        await addApiWithSchema(projectRoot, schema);

        // generate pre-existing user file
        const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
        // given that the pre-existing file exists and codegen output directory is empty
        expect(existsSync(userSourceCodePath)).toBe(true);
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);

        // add codegen succeeds
        await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // GraphQL statements are generated
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // graphql configuration should be added
        expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(true);
        // check if the added codegen configuration is valid
        expect(readFileSync(path.join(projectRoot, graphqlConfigFile)).toString()).toMatchSnapshot();
      });
    });
  });