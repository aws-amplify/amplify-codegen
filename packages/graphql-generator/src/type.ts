export type Platform = 'android' | 'ios' | 'flutter' | 'javascript' | 'introspection';

export type Language = 'java' | 'swift' | 'dart' | 'javascript' | 'introspection';

export type Target = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';

export type TargetType = 'json' | 'swift' | 'typescript' | 'flow' | 'scala' | 'flow-modern' | 'angular';

export type FileExtension = 'js' | 'graphql' | 'ts' | 'graphql';

export type GenerateTypesOptions = {
  schema: string;
  target: TargetType;
  queries?: string[];
  introspection?: boolean;
  only?: string; // only used when target is swift
  multipleFiles?: boolean;
};

export type GenerateModelsOptions = {
  schema: string;
  platform: Platform;
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
  target: Target;
  maxDepth?: number;
  typenameIntrospection?: boolean;
};

export type GeneratedOutput = {
  [filepath: string]: string;
};
