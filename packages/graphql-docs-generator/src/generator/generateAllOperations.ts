import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import generateOperation from './generateOperation';
import {
  GQLTemplateOp,
  GQLOperationTypeEnum,
  GQLTemplateField,
  GQLTemplateFragment,
  GQLDocsGenOptions,
} from './types';

export function generateQueries(
  queries: GraphQLObjectType,
  schema: GraphQLSchema,
  maxDepth: number,
  options: GQLDocsGenOptions,
): Array<GQLTemplateOp> | undefined {
  if (queries) {
    const allQueries = queries.getFields();
    const processedQueries: Array<GQLTemplateOp> = Object.keys(allQueries).map(queryName => {
      const type: GQLOperationTypeEnum = GQLOperationTypeEnum.QUERY;
      const op = generateOperation(allQueries[queryName], schema, maxDepth, options);
      const name: string = capitalizeFirstLetter(queryName);
      const fieldName: string = queryName;
      return { type, name, fieldName, ...op };
    });
    return processedQueries;
  }
}

export function generateMutations(
  mutations: GraphQLObjectType,
  schema: GraphQLSchema,
  maxDepth: number,
  options: GQLDocsGenOptions,
): Array<any> {
  if (mutations) {
    const allMutations = mutations.getFields();
    const processedMutations = Object.keys(allMutations).map(mutationName => {
      const type: GQLOperationTypeEnum = GQLOperationTypeEnum.MUTATION;
      const op = generateOperation(allMutations[mutationName], schema, maxDepth, options);
      const name: string = capitalizeFirstLetter(mutationName);
      const fieldName: string = mutationName;
      return { type, name, fieldName, ...op };
    });
    return processedMutations;
  }
}

export function generateSubscriptions(
  subscriptions: GraphQLObjectType,
  schema: GraphQLSchema,
  maxDepth: number,
  options: GQLDocsGenOptions,
): Array<any> {
  if (subscriptions) {
    const allSubscriptions = subscriptions.getFields();
    const processedSubscriptions = Object.keys(allSubscriptions).map(subscriptionName => {
      const type: GQLOperationTypeEnum = GQLOperationTypeEnum.SUBSCRIPTION;
      const op = generateOperation(allSubscriptions[subscriptionName], schema, maxDepth, options);
      const name: string = capitalizeFirstLetter(subscriptionName);
      const fieldName: string = subscriptionName;
      return { type, name, fieldName, ...op };
    });
    return processedSubscriptions;
  }
}

export function collectExternalFragments(operations: GQLTemplateOp[] = []): GQLTemplateFragment[] {
  const fragments = {};
  operations.forEach(op => {
    getExternalFragment(op.body, fragments);
  });
  return Object.values(fragments);
}

function getExternalFragment(field: GQLTemplateField, externalFragments: object = {}) {
  field.fragments
    .filter(fragment => fragment.external)
    .reduce((acc, val) => {
      acc[val.name] = val;
      return acc;
    }, externalFragments);
  field.fields.forEach(f => {
    getExternalFragment(f, externalFragments);
  });

  return externalFragments;
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function lowerCaseFirstLetter(string: string): string {
  return string.charAt(0).toLocaleLowerCase() + string.slice(1);
}
