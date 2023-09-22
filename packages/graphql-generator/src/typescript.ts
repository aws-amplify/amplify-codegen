import { Target as GraphqlTypesGeneratorTarget } from '@aws-amplify/graphql-types-generator';
import { Target as AppsyncModelgenPluginTarget } from '@aws-amplify/appsync-modelgen-plugin';

export type ModelsTarget = AppsyncModelgenPluginTarget;
export type StatementsTarget = 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';
export type TypesTarget = GraphqlTypesGeneratorTarget;

export type FileExtension = 'js' | 'graphql' | 'ts';

export type GenerateTypesOptions = {
  schema: string;
  target: TypesTarget;
  queries: string;
  introspection?: boolean;
  multipleSwiftFiles?: boolean; // only used when target is swift
};

export type GenerateModelsOptions = {
  schema: string;
  target: ModelsTarget;
  directives: string;
  // feature flags
  generateIndexRules?: boolean;
  emitAuthProvider?: boolean;
  useExperimentalPipelinedTransformer?: boolean;
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
  relativeTypesPath?: string;
};

export type GeneratedOutput = {
  [filepath: string]: string;
};
