import { Target } from '@aws-amplify/graphql-types-generator';
export type ModelsTarget = 'java' | 'swift' | 'javascript' | 'typescript' | 'dart' | 'introspection';
export type StatementsTarget = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';
export type TypesTarget = Target;

export type FileExtension = 'js' | 'graphql' | 'ts';

export type GenerateTypesOptions = {
  schema: string;
  target: TypesTarget;
  queries?: string[];
  introspection?: boolean;
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
