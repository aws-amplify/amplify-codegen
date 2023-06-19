import { 
    createNewProjectDir,
    initProjectWithProfile,
    addCodegen,
    DEFAULT_JS_CONFIG,
    createRandomName,
    addApiWithoutSchema,
    updateApiSchema,
    addCodegenNonAmplifyJS
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync, writeFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { deleteAmplifyProject, testAddCodegen, testSetupBeforeAddCodegen, 
getGraphQLConfigFilePath, testValidGraphQLConfig } from '../codegen-tests-base';

const schema = 'simple_model.graphql';

describe('codegen add tests - JS', () => {
    let projectRoot: string;
    const config = DEFAULT_JS_CONFIG;

    beforeEach(async () => {
        projectRoot = await createNewProjectDir('addCodegenJS');
    });

    afterEach(async () => {
        await deleteAmplifyProject(projectRoot);
    });

    it(`Adding codegen without API gives appropriate message`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });

        const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

        // add codegen without API gives appropriate message
        const settings = { isAPINotAdded: true, ...config };
        await expect(addCodegen(projectRoot, settings)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // GraphQL statements are not generated
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);
        // graphql configuration should not be added
        expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(false);
    });

    it(`Adding codegen twice gives appropriate message`, async () => {
        // init project and add API category
        await initProjectWithProfile(projectRoot, { ...config });
        const projectName = createRandomName();
        await addApiWithoutSchema(projectRoot, { apiName: projectName });
        await updateApiSchema(projectRoot, projectName, schema);

        const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

        // adding codegen succeeds and generates a config file
        await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
        expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);
        
        // adding codegen again gives appropriate message
        const settings = { isCodegenAdded: true, ...config }; 
        await expect(addCodegen(projectRoot, settings)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // previously generated files should still exist
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        testValidGraphQLConfig(projectRoot, config);
    });

    it(`Adding codegen works as expected`, async () => {
        await testAddCodegen(config, projectRoot, schema);
    });

    it(`Adding codegen outside of Amplify project`, async () => {
        // init project and add API category
        const testSchema = `
        type Query {
            echo: String
        }

        type Mutation {
            mymutation: String
        }

        type Subscription {
            mysub: String
        }          
        `;

        // Setup the non-amplify project with schema and pre-existing files
        const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);
        const schemaPath = path.join(projectRoot, 'schema.graphql');
        writeFileSync(schemaPath, testSchema);

        // add codegen without init
        await expect(addCodegenNonAmplifyJS(projectRoot)).resolves.not.toThrow();

        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // GraphQL statements are generated
        expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
        // graphql configuration should be added
        expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);
    });
});