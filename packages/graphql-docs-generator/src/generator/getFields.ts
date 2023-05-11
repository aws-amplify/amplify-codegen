import {
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
  GraphQLList,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isScalarType,
  isListType,
} from 'graphql';
import getFragment from './getFragment';
import { GQLConcreteType, GQLTemplateField, GQLTemplateFragment, GQLDocsGenOptions } from './types';
import getType from './utils/getType';
import isS3Object from './utils/isS3Object';

export default function getFields(
  field: GraphQLField<any, any>,
  schema: GraphQLSchema,
  depth: number = 2,
  options: GQLDocsGenOptions,
): GQLTemplateField {
  const fieldType: GQLConcreteType = getType(field.type);
  const renderS3FieldFragment = options.useExternalFragmentForS3Object && isS3Object(fieldType);
  const subFields = !renderS3FieldFragment && (isObjectType(fieldType) || isInterfaceType(fieldType)) ? fieldType.getFields() : [];

  const subFragments: any = isInterfaceType(fieldType) || isUnionType(fieldType) ? schema.getPossibleTypes(fieldType) : {};

  if (depth < 1 && !(isScalarType(fieldType) || isEnumType(fieldType))) {
    return;
  }

  const fields: Array<GQLTemplateField> = Object.keys(subFields)
    .map(fieldName => {
      const subField = subFields[fieldName];
      return getFields(subField, schema, adjustDepth(subField, depth), options);
    })
    .filter(f => f);

  // add __typename to selection set.
  // getFields() does not include __typename because __typename is implicitly included on all object types.
  // https://spec.graphql.org/June2018/#sec-Type-Name-Introspection
  // do not add to interface types or union types because they are not supported by the transformers
  if (options.typenameIntrospection && isObjectType(fieldType)) {
    fields.push({
      name: '__typename',
      fields: [],
      fragments: [],
      hasBody: false,
    });
  }
  const fragments: Array<GQLTemplateFragment> = Object.keys(subFragments)
    .map(fragment => getFragment(subFragments[fragment], schema, depth, fields, null, false, options))
    .filter(f => f);

  // Special treatment for S3 input
  // Swift SDK needs S3 Object to have fragment
  if (renderS3FieldFragment) {
    fragments.push(getFragment(fieldType as GraphQLObjectType, schema, depth, [], 'S3Object', true, options));
  }

  // if the current field is an object and none of the subfields are included, don't include the field itself
  if (!(isScalarType(fieldType) || isEnumType(fieldType)) && fields.length === 0 && fragments.length === 0 && !renderS3FieldFragment) {
    return;
  }

  return {
    name: field.name,
    fields,
    fragments,
    hasBody: !!(fields.length || fragments.length),
  };
}

function adjustDepth(field, depth) {
  const maxDepth = 100;
  if (isGraphQLAggregateField(field) && depth < maxDepth) {
    return depth + 1;
  } else if (depth >= maxDepth) {
    throw new Error('Statement generation depth exceeded the maximum allowed limit');
  }
  return depth - 1;
}

function isGraphQLAggregateField(field) {
  if (field && field.name == 'aggregateItems' && getBaseType(field.type) == 'SearchableAggregateResult') {
    return true;
  }
  return false;
}

function getBaseType(type) {
  if (type && type.ofType) {
    return getBaseType(type.ofType);
  }
  return type?.name;
}
