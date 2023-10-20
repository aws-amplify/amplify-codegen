import { AmplifyFrontendConfig, AmplifyFrontend } from './frontend-config-helper';

export function constructGraphQLConfig(
    projectName: string,
    config: AmplifyFrontendConfig,
    maxDepth: number,
    region: string,
    isConfigured: boolean = false,
    apiId: string = null) : any {

    let schemaPath: string;
    let includes: [string];
    let excludes: [string] = ['./amplify/**'];
    let extensions = {
        amplify: {
            apiId: apiId,
            codeGenTarget: '',
            docsFilePath: '',
            generatedFileName: '',
            maxDepth: maxDepth ? maxDepth : 2,
            region: region
        }
    };

    switch (config.frontendType) {
      case AmplifyFrontend.android:
        schemaPath = 'app/src/main/graphql/schema.json';
        includes = ['app/src/main/graphql/**/*.graphql'];
        extensions.amplify.codeGenTarget = isConfigured ? 'android' : '';
        extensions.amplify.docsFilePath = 'app/src/main/graphql/com/amazonaws/amplify/generated/graphql';
        break;
      case AmplifyFrontend.ios:
        schemaPath = `amplify/backend/api/${projectName}/build/schema.graphql`;
        includes = ['graphql/**/*.graphql'];
        extensions.amplify.codeGenTarget = 'swift';
        extensions.amplify.docsFilePath = 'graphql';
        extensions.amplify.generatedFileName = 'API.swift';
        excludes.push('API.swift');
        break;
      default:
        schemaPath = `amplify/backend/api/${projectName}/build/schema.graphql`;
        includes = ['src/graphql/**/*.js'];
        extensions.amplify.codeGenTarget = 'javascript';
        extensions.amplify.docsFilePath = 'src/graphql';
    }

    return {
        schemaPath: schemaPath,
        includes: includes,
        excludes: excludes,
        extensions: extensions
    };
  }
