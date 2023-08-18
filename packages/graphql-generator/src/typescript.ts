export type ModelsTarget = 'android' | 'ios' | 'flutter' | 'javascript' | 'introspection';

export type Language = 'java' | 'swift' | 'dart' | 'javascript' | 'introspection';

export type StatementsTarget = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';

export type TypesTarget = 'json' | 'swift' | 'typescript' | 'flow' | 'scala' | 'flow-modern' | 'angular';

export type FileExtension = 'js' | 'graphql' | 'ts';

export type GenerateTypesOptions = {
  schema: string;
  target: TypesTarget;
  queries?: string[];
  introspection?: boolean;
  only?: string; // only used when target is swift
  multipleFiles?: boolean;
};

export type GenerateModelsOptions = {
  schema: string;
  target: ModelsTarget;
  directives: string;
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
  target: StatementsTarget;
  maxDepth?: number;
  typenameIntrospection?: boolean;
};

export type GeneratedOutput = {
  [filepath: string]: string;
};
