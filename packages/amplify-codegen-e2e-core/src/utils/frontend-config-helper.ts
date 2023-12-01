export enum AmplifyFrontend {
  javascript = 'javascript',
  ios = 'ios',
  android = 'android',
  flutter = 'flutter',
  typescript = 'typescript',
}

export type JavaScriptFramework = 'none' | 'angular' | 'ember' | 'ionic' | 'react' | 'react-native' | 'vue';

export type JavaScriptCodegenTarget = 'javascript' | 'typescript' | 'flow' | 'angular';

export type JavaScriptConfig = {
  frontendType: AmplifyFrontend.javascript,
  framework: JavaScriptFramework,
  codegenTarget?: JavaScriptCodegenTarget,
  srcDir: string,
  modelgenDir?: string,
  graphqlCodegenDir?: string,
}

export type TypeScriptConfig = {
  frontendType: AmplifyFrontend.typescript,
  srcDir: string,
  modelgenDir?: string,
  graphqlCodegenDir?: string,
}

export type AndroidConfig = {
  frontendType: AmplifyFrontend.android,
  srcDir: string,
  modelgenDir?: string,
  graphqlCodegenDir?: string,
}

export type IOSConfig = {
  frontendType: AmplifyFrontend.ios,
  srcDir: string,
  modelgenDir?: string,
  graphqlCodegenDir?: string,
}

export type FlutterConfig = {
  frontendType: AmplifyFrontend.flutter,
  srcDir: string,
  modelgenDir?: string,
  graphqlCodegenDir?: string,
}
export type AmplifyFrontendConfig = JavaScriptConfig | AndroidConfig | IOSConfig | FlutterConfig | TypeScriptConfig;

export const DEFAULT_JS_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.javascript,
  framework: 'none',
  codegenTarget: 'javascript',
  srcDir: 'src',
  modelgenDir: 'src/models',
  graphqlCodegenDir : 'src/graphql',
};

// Config used for modelgen test only
export const DEFAULT_TS_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.typescript,
  srcDir: 'src',
  modelgenDir: 'src/models',
}

export const DEFAULT_ANDROID_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.android,
  srcDir: 'app/src/main/res',
  modelgenDir: 'app/src/main/java',
  graphqlCodegenDir : 'app/src/main/graphql/com/amazonaws/amplify/generated/graphql'
};

export const DEFAULT_IOS_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.ios,
  srcDir: '.',
  modelgenDir: 'amplify/generated/models',
  graphqlCodegenDir : 'graphql'
};

export const DEFAULT_FLUTTER_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.flutter,
  srcDir: 'lib',
  modelgenDir: 'lib/models',
};