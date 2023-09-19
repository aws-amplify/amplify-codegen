export enum AmplifyFrontend {
  javascript = 'javascript',
  typescript = 'typescript',
  ios = 'ios',
  android = 'android',
  flutter = 'flutter'
}

export type AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend;
  srcDir: string;
  modelgenDir: string;
  graphqlCodegenDir?: string;
}

export const DEFAULT_JS_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.javascript,
  srcDir: 'src',
  modelgenDir: 'src/models',
  graphqlCodegenDir : 'src/graphql'
};

export const DEFAULT_ANDROID_CONFIG: AmplifyFrontendConfig = {
  frontendType: AmplifyFrontend.android,
  srcDir: 'app/src/main/res',
  modelgenDir: 'app/src/main/java',
  graphqlCodegenDir : 'app/src/main/graphql'
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