'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.typeNameFromGraphQLType = void 0;
const graphql_1 = require('graphql');
const builtInScalarMap = {
  [graphql_1.GraphQLString.name]: 'string',
  [graphql_1.GraphQLInt.name]: 'number',
  [graphql_1.GraphQLFloat.name]: 'number',
  [graphql_1.GraphQLBoolean.name]: 'boolean',
  [graphql_1.GraphQLID.name]: 'string',
};
const appSyncScalars = {
  AWSTimestamp: 'number',
};
function typeNameFromGraphQLType(context, type, bareTypeName, nullable = true) {
  if (graphql_1.isNonNullType(type)) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, false);
  }
  let typeName;
  if (graphql_1.isListType(type)) {
    typeName = `Array< ${typeNameFromGraphQLType(context, type.ofType, bareTypeName, true)} >`;
  } else if (type instanceof graphql_1.GraphQLScalarType) {
    typeName =
      builtInScalarMap[type.name] ||
      appSyncScalars[type.name] ||
      (context.options.passthroughCustomScalars
        ? context.options.customScalarsPrefix + type.name
        : builtInScalarMap[graphql_1.GraphQLString.name]);
  } else {
    typeName = bareTypeName || type.name;
  }
  return nullable ? typeName + ' | null' : typeName;
}
exports.typeNameFromGraphQLType = typeNameFromGraphQLType;
//# sourceMappingURL=types.js.map
