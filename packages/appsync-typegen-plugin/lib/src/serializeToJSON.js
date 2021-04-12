'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.serializeAST = void 0;
const graphql_1 = require('graphql');
function serializeToJSON(context) {
  return serializeAST(
    {
      operations: Object.values(context.operations),
      fragments: Object.values(context.fragments),
      typesUsed: context.typesUsed.map(serializeType),
    },
    '\t',
  );
}
exports.default = serializeToJSON;
function serializeAST(ast, space) {
  return JSON.stringify(
    ast,
    function(_, value) {
      if (graphql_1.isType(value)) {
        return String(value);
      } else {
        return value;
      }
    },
    space,
  );
}
exports.serializeAST = serializeAST;
function serializeType(type) {
  if (graphql_1.isEnumType(type)) {
    return serializeEnumType(type);
  } else if (graphql_1.isUnionType(type)) {
    return serializeUnionType(type);
  } else if (graphql_1.isInputObjectType(type)) {
    return serializeInputObjectType(type);
  } else if (graphql_1.isObjectType(type)) {
    return serializeObjectType(type);
  } else if (graphql_1.isInterfaceType(type)) {
    return serializeInterfaceType(type);
  } else if (graphql_1.isScalarType(type)) {
    return serializeScalarType(type);
  } else {
    throw new Error(`Unexpected GraphQL type: ${type}`);
  }
}
function serializeEnumType(type) {
  const { name, description } = type;
  const values = type.getValues();
  return {
    kind: 'EnumType',
    name,
    description,
    values: values.map(value => ({
      name: value.name,
      description: value.description,
      isDeprecated: value.isDeprecated,
      deprecationReason: value.deprecationReason,
    })),
  };
}
function serializeUnionType(type) {
  const { name, description } = type;
  const types = type.getTypes();
  return {
    kind: 'UnionType',
    name,
    description,
    types: types.map(type => ({
      name: type.name,
      description: type.description,
    })),
  };
}
function serializeInputObjectType(type) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());
  return {
    kind: 'InputObjectType',
    name,
    description,
    fields: fields.map(field => ({
      name: field.name,
      type: String(field.type),
      description: field.description,
      defaultValue: field.defaultValue,
    })),
  };
}
function serializeObjectType(type) {
  const { name, description } = type;
  const ifaces = Object.values(type.getInterfaces());
  const fields = Object.values(type.getFields());
  return {
    kind: 'ObjectType',
    name,
    description,
    ifaces: ifaces.map(iface => ({
      name: iface.name,
      description: iface.description,
    })),
    fields: fields.map(field => ({
      name: field.name,
      type: String(field.type),
      description: field.description,
    })),
  };
}
function serializeInterfaceType(type) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());
  return {
    kind: 'InterfaceType',
    name,
    description,
    fields: fields.map(field => ({
      name: field.name,
      type: String(field.type),
      description: field.description,
    })),
  };
}
function serializeScalarType(type) {
  const { name, description } = type;
  return {
    kind: 'ScalarType',
    name,
    description,
  };
}
//# sourceMappingURL=serializeToJSON.js.map
