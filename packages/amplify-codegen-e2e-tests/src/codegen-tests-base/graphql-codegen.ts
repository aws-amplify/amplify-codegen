import { 
    initProjectWithProfile,
    addApiWithSchema,
    addCodegen,
    AmplifyFrontendConfig,
    generateStatementsAndTypes
} from "amplify-codegen-e2e-core";
import { existsSync, readFileSync } from "fs";
import path from 'path';
import { isNotEmptyDir, generateSourceCode } from '../utils';

export async function testGraphQLCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    await addApiWithSchema(projectRoot, schema);

    // generate pre-existing user file
    const userSourceCodePath = generateSourceCode(projectRoot, config.srcDir);

    // Add codegen
    await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
    
    // Execute GraphQL codegen
    await expect(generateStatementsAndTypes(projectRoot)).resolves.not.toThrow();
    
    // check if the pre-existing user file still exists
    expect(existsSync(userSourceCodePath)).toBe(true);
    // check if the statements are generated
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
}
