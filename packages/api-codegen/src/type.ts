export type Platform = 'android' | 'ios' | 'flutter' | 'javascript' | 'introspection';

export type Language = 'java' | 'swift' | 'dart' | 'javascript' | 'introspection';

export type Target = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';

export type FileExtension = 'js' | 'graphql' | 'ts' | 'graphql';

export type GenerateTypesOptions = {
  schema: string;
  queries: string[];
  platform: string;
  only: string;
  target: string;
  appSyncApi: any;
  generatedFileName: string;
  multipleFiles?: boolean;
};

export type GenerateModelsOptions = {
  schema: string;
  platform: Platform;
  directiveDefinitions: any;

  // feature flags
  generateIndexRules?: boolean;
  emitAuthProvider?: boolean;
  useExperimentalPipelinedTranformer?: boolean;
  transformerVersion?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
  generateModelsForLazyLoadAndCustomSelectionSet?: boolean;
  addTimestampFields?: boolean;
  handleListNullabilityTransparently?: boolean;
};

export type GenerateStatementsOptions = {
  schema: string;
  appSyncApi: any;
  target: Target;
  maxDepth: number;
  typenameIntrospection: boolean;
};

export type GeneratedOutput = {
  [filepath: string]: string;
};
