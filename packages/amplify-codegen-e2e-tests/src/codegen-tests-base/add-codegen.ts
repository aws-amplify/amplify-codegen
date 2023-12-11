import {
    initProjectWithProfile,
    addApiWithoutSchema,
    updateApiSchema,
    addCodegen,
    AmplifyFrontendConfig,
    createRandomName,
    addCodegenNonAmplifyJS,
    addCodegenNonAmplifyTS,
    AmplifyFrontend,
    generateStatementsAndTypes,
    generateStatements,
    generateTypes,
    amplifyConfigureProjectInfo,
    deleteProjectDir,
    DEFAULT_JS_CONFIG,
} from "@aws-amplify/amplify-codegen-e2e-core";
import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync, lstatSync } from "fs";
import path from 'path';
import { isNotEmptyDir } from '../utils';
import { getGraphQLConfigFilePath, testSetupBeforeAddCodegen, testValidGraphQLConfig } from "./test-setup";

export type CodegenMatrixTestProps = AmplifyFrontendConfig & {
  params?: string[];
  isAPINotAdded?: boolean;
  isCodegenAdded?: boolean;
  frontendType?: AmplifyFrontend;
  framework?: string;
  isStatementGenerated?: boolean;
  statementNamePattern?: string;
  maxDepth?: number;
  isTypeGenerated?: boolean;
  typeFileName?: string;
}

const defaultConfig: CodegenMatrixTestProps = {
  ...DEFAULT_JS_CONFIG,
  params: [],
  isAPINotAdded: false,
  isCodegenAdded: false,
  isStatementGenerated: true,
  statementNamePattern: '\r', // default value
  maxDepth: 2, // default value
  isTypeGenerated: true,
  typeFileName: '\r', // default value
}

/**
 * Extract type file path given the test props. When the carriage return is detected, the default path will be returned
 * @param props codegen matrix test props
 * @param projectRoot project root
 * @returns type file path
 */
const getTypeFilePath = (props: CodegenMatrixTestProps, projectRoot: string): string | undefined => {
  if (props.typeFileName) {
    if (props.typeFileName === '\r') {
      if (props.frontendType === AmplifyFrontend.ios) {
        return path.join(projectRoot, 'API.swift')
      } else if (props.frontendType === AmplifyFrontend.javascript) {
        switch (props.codegenTarget) {
          case 'flow':
            return path.join(projectRoot, 'src', 'API.js');
          case 'angular':
            return path.join(projectRoot, 'src', 'app', 'API.service.ts');
          case 'typescript':
            return path.join(projectRoot, 'src', 'API.ts');
          default:
            return undefined;
        }
      }
    }
    return path.join(projectRoot, props.typeFileName);
  }
  return undefined;
}

/**
 * Check if the type file(s) is generated at the given file path(single file or directory)
 * @param filePath type file path
 * @returns is type file generated or not
 */
const isTypeFileGeneratedAtPath = (filePath: string | undefined): boolean => {
  if (filePath) {
    if (existsSync(filePath)) {
      // if path is directory, check if files are generated within
      if (lstatSync(filePath).isDirectory()) {
        return readdirSync(filePath).length > 0;
      }
      // path is a single file
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Util function for testing codegen matrix
 * @param props codegen matrix test properties
 * @param projectRoot project root
 */
export async function testAddCodegenMatrix(props: CodegenMatrixTestProps, projectRoot: string): Promise<void> {
  const config: CodegenMatrixTestProps = { ...defaultConfig, ...props }
  if (config.graphqlCodegenDir) {
    deleteProjectDir(path.join(projectRoot, config.graphqlCodegenDir));
  }
  if (config.srcDir !== '.') {
    deleteProjectDir(path.join(projectRoot, config.srcDir));
  }
  const typeFilePath = getTypeFilePath(config, projectRoot);
  if (typeFilePath && existsSync(typeFilePath)) {
    rmSync(typeFilePath);
  }
  if (config.framework === 'angular') {
    // Mock angular json file otherwise the project configure will fail
    writeFileSync(path.join(projectRoot, 'angular.json'), '{}');
  }
  await amplifyConfigureProjectInfo({ cwd: projectRoot, ...config });
  // Setup the non-amplify project with schema and pre-existing files
  const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);
  await expect(addCodegen(projectRoot, { ...config })).resolves.not.toThrow();
  // Check if statements are generated
  expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(config.isStatementGenerated);
  // pre-existing file should still exist
  expect(existsSync(userSourceCodePath)).toBe(true);
  // Check if type files are generated
  expect(isTypeFileGeneratedAtPath(typeFilePath)).toBe(config.isTypeGenerated)
}

export async function testAddCodegen(config: AmplifyFrontendConfig, projectRoot: string, schema: string, additionalParams?: Array<string>) {
    // init project and add API category
    await initProjectWithProfile(projectRoot, { ...config });
    const projectName = createRandomName();
    await addApiWithoutSchema(projectRoot, { apiName: projectName });
    await updateApiSchema(projectRoot, projectName, schema);

    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // add codegen succeeds
    await expect(addCodegen(projectRoot, { ...config, params: additionalParams ?? [] })).resolves.not.toThrow();

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // GraphQL statements are generated
    expect(isNotEmptyDir(path.join(projectRoot, config.graphqlCodegenDir))).toBe(true);
    testValidGraphQLConfig(projectRoot, config);
}

export type TestAddCodegenUninitializedProps = {
    config: AmplifyFrontendConfig;
    projectRoot: string;
    sdlFilename?: string;
    expectedFilenames: Array<string>;
    dropAndRunCodegen?: boolean;
    dropAndRunCodegenStatements?: boolean;
    dropAndRunCodegenTypes?: boolean;
    initialFailureMessage?: string;
    additionalParams?: Array<string>;
};

const assertTypeFileExists = (projectRoot: string): void => {
    expect(existsSync(path.join(projectRoot, 'src', 'API.ts'))).toBe(true)
};

/**
 * Ensure that all values provided in the expected set are present in the received set, allowing for additional values in received.
 * @param expectedValues the expected values to check
 * @param receivedValues the received values to check
 */
const ensureAllExpectedValuesAreReceived = <T>(expectedValues: Array<T>, receivedValues: Array<T>): void => {
    const receivedValueSet = new Set(receivedValues);
    console.log(`Comparing received values: ${JSON.stringify(receivedValues)} to expected values: ${JSON.stringify(expectedValues)}`);
    expectedValues.forEach((expectedFilename) => expect(receivedValueSet.has(expectedFilename)).toBe(true));
};

export async function testAddCodegenUninitialized({
    config,
    projectRoot,
    sdlFilename,
    expectedFilenames,
    dropAndRunCodegen,
    dropAndRunCodegenStatements,
    dropAndRunCodegenTypes,
    initialFailureMessage,
    additionalParams,
}: TestAddCodegenUninitializedProps) {
    // Setup the non-amplify project with schema and pre-existing files
    const userSourceCodePath = testSetupBeforeAddCodegen(projectRoot, config);

    // Write SDL Schema
    if (sdlFilename) {
        const sdlSchema = readFileSync(path.join(__dirname, '..', '..', 'schemas', 'sdl', sdlFilename), 'utf-8');
        writeFileSync(path.join(projectRoot, sdlFilename), sdlSchema);
    }

    let isTypeGenIncluded = false;
    // add codegen without init
    switch (config.frontendType) {
      case AmplifyFrontend.javascript:
        switch (config.codegenTarget) {
          case 'javascript':
              await addCodegenNonAmplifyJS(projectRoot, additionalParams ?? [], initialFailureMessage);
              break;
          case 'typescript':
              isTypeGenIncluded = true;
              await addCodegenNonAmplifyTS(projectRoot, additionalParams ?? [], initialFailureMessage);
              break;
          default:
              throw new Error(`Received unexpected codegen target ${config.codegenTarget}`);
        }
        break;
      default:
        throw new Error(`Received unexpected frontendType ${config.frontendType}`);
    }


    // return if we expected the add command to fail
    if (initialFailureMessage) {
        return;
    }

    // pre-existing file should still exist
    expect(existsSync(userSourceCodePath)).toBe(true);
    // GraphQL statements are generated
    ensureAllExpectedValuesAreReceived(expectedFilenames, readdirSync(path.join(projectRoot, config.graphqlCodegenDir)))
    // graphql configuration should be added
    expect(existsSync(getGraphQLConfigFilePath(projectRoot))).toBe(true);
    if (isTypeGenIncluded) {
        assertTypeFileExists(projectRoot)
    }

    if (dropAndRunCodegen || dropAndRunCodegenStatements || dropAndRunCodegenTypes) {
        rmSync(path.join(projectRoot, config.graphqlCodegenDir), { recursive: true });
        // pre-existing file should still exist
        expect(existsSync(userSourceCodePath)).toBe(true);
        // Graphql statements are deleted
        expect(existsSync(path.join(projectRoot, config.graphqlCodegenDir))).toBe(false);
    }

    if (dropAndRunCodegen) {
        await generateStatementsAndTypes(projectRoot);

        // GraphQL statements are regenerated
        ensureAllExpectedValuesAreReceived(expectedFilenames, readdirSync(path.join(projectRoot, config.graphqlCodegenDir)))

        if (isTypeGenIncluded) {
            assertTypeFileExists(projectRoot)
        }
    }

    if (dropAndRunCodegenStatements) {
        await generateStatements(projectRoot);

        // GraphQL statements are regenerated
        ensureAllExpectedValuesAreReceived(expectedFilenames, readdirSync(path.join(projectRoot, config.graphqlCodegenDir)))
    }

    if (dropAndRunCodegenTypes) {
        await generateTypes(projectRoot);

        if (isTypeGenIncluded) {
            assertTypeFileExists(projectRoot)
        }
    }
}
