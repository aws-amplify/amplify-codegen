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
    configureCodegen
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
  
  describe('codegen configure tests', () => {
    let projectRoot: string;
  
    beforeEach(async () => {
      projectRoot = await createNewProjectDir('configureCodegen');
    });
  
    afterEach(async () => {
      const metaFilePath = path.join(projectRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projectRoot);
      }
      deleteProjectDir(projectRoot);
    });

    frontendConfigs.forEach(config => {
      it(`Updating codegen configuration works as expected in ${config.frontendType} project`, async () => {
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

        const addedCodegenConfiguration = readFileSync(path.join(projectRoot, graphqlConfigFile)).toString();

        // update codegen configuration
        const settings = { isCodegenConfigured: true, maxStatementDepth: 4, ...config };
        await expect(configureCodegen(projectRoot, settings)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // previously generated files should still exist
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // graphql configuration should be updated to remove previous configuration
        const updatedCodegenConfiguration = readFileSync(path.join(projectRoot, graphqlConfigFile)).toString();
        // the codegen configuration is updated
        expect(addedCodegenConfiguration).not.toMatch(updatedCodegenConfiguration);
        // check if the updated codegen configuration is valid
        expect(updatedCodegenConfiguration).toMatchSnapshot();
      });

      it(`Adding codegen configuration works as expected in ${config.frontendType} project`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });
        await addApiWithSchema(projectRoot, schema);

        // generate pre-existing user file
        const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);
        expect(existsSync(userSourceCodePath)).toBe(true);

        // given that the codegen config file and generated statements don't exist
        expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(false);
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);

        // add default codegen configuration
        await expect(configureCodegen(projectRoot, { ...config })).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // statements should be generated in expected directory
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // graphql configuration should be added
        expect(existsSync(path.join(projectRoot, graphqlConfigFile))).toBe(true);
        // check if the added codegen configuration is valid
        expect(readFileSync(path.join(projectRoot, graphqlConfigFile)).toString()).toMatchSnapshot();
      });
    });
  });