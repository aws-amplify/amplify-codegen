'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.pickedPropertyDeclarations = exports.propertyFromField = exports.propertiesFromFields = exports.interfaceDeclarationForFragment = exports.interfaceDeclarationForOperation = exports.updateTypeNameField = exports.interfaceVariablesDeclarationForOperation = exports.interfaceNameFromOperation = exports.typeDeclarationForGraphQLType = exports.generateSource = void 0;
const graphql_1 = require('graphql');
const printing_1 = require('../utilities/printing');
const CodeGenerator_1 = require('../utilities/CodeGenerator');
const language_1 = require('./language');
const types_1 = require('./types');
function generateSource(context) {
  const generator = new CodeGenerator_1.CodeGenerator(context);
  generator.printOnNewline('/* tslint:disable */');
  generator.printOnNewline('/* eslint-disable */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  context.typesUsed.forEach(type => typeDeclarationForGraphQLType(generator, type));
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    interfaceDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(operation => interfaceDeclarationForFragment(generator, operation));
  generator.printNewline();
  return generator.output;
}
exports.generateSource = generateSource;
function typeDeclarationForGraphQLType(generator, type) {
  if (graphql_1.isEnumType(type)) {
    enumerationDeclaration(generator, type);
  } else if (graphql_1.isUnionType(type)) {
    unionDeclaration(generator, type);
  } else if (graphql_1.isInputObjectType(type)) {
    structDeclarationForInputObjectType(generator, type);
  } else if (graphql_1.isObjectType(type)) {
    structDeclarationForObjectType(generator, type);
  } else if (graphql_1.isInterfaceType(type)) {
    structDeclarationForInterfaceType(generator, type);
  }
}
exports.typeDeclarationForGraphQLType = typeDeclarationForGraphQLType;
function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();
  generator.printNewlineIfNeeded();
  if (description) {
    description.split('\n').forEach(line => {
      generator.printOnNewline(`// ${line.trim()}`);
    });
  }
  generator.printOnNewline(`export enum ${name} {`);
  values.forEach(value => {
    if (!value.description || value.description.indexOf('\n') === -1) {
      generator.printOnNewline(`  ${value.value} = "${value.value}",${printing_1.wrap(' // ', value.description || '')}`);
    } else {
      if (value.description) {
        value.description.split('\n').forEach(line => {
          generator.printOnNewline(`  // ${line.trim()}`);
        });
      }
      generator.printOnNewline(`  ${value.value} = "${value.value}",`);
    }
  });
  generator.printOnNewline(`}`);
  generator.printNewline();
}
function unionDeclaration(generator, type) {
  const { name, description } = type;
  const value = type
    .getTypes()
    .map(type => type.name)
    .join(' | ');
  generator.printNewlineIfNeeded();
  if (description) {
    description.split('\n').forEach(line => {
      generator.printOnNewline(`// ${line.trim()}`);
    });
  }
  generator.printOnNewline(`export type ${name} = ${value}`);
  generator.printNewline();
}
function structDeclarationForInputObjectType(generator, type) {
  const interfaceName = type.name;
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
    },
    () => {
      const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
      properties.forEach(property => language_1.propertyDeclaration(generator, { ...property }));
    },
  );
}
function structDeclarationForObjectType(generator, type) {
  const interfaceName = type.name;
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
    },
    () => {
      const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
      language_1.propertyDeclaration(generator, { fieldName: '__typename', typeName: `"${interfaceName}"` });
      properties.forEach(property => language_1.propertyDeclaration(generator, { ...property, isOptional: true }));
    },
  );
}
function structDeclarationForInterfaceType(generator, type) {
  const interfaceName = type.name;
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
    },
    () => {
      const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
      language_1.propertyDeclaration(generator, { fieldName: '__typename', typeName: `"${interfaceName}"` });
      properties.forEach(property => language_1.propertyDeclaration(generator, { ...property, isOptional: true }));
    },
  );
}
function interfaceNameFromOperation({ operationName, operationType }) {
  switch (operationType) {
    case 'query':
      return `${operationName}Query`;
      break;
    case 'mutation':
      return `${operationName}Mutation`;
      break;
    case 'subscription':
      return `${operationName}Subscription`;
      break;
    default:
      throw new graphql_1.GraphQLError(`Unsupported operation type "${operationType}"`);
  }
}
exports.interfaceNameFromOperation = interfaceNameFromOperation;
function interfaceVariablesDeclarationForOperation(generator, { operationName, operationType, variables }) {
  if (!variables || variables.length < 1) {
    return;
  }
  const interfaceName = `${interfaceNameFromOperation({ operationName, operationType })}Variables`;
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
    },
    () => {
      const properties = propertiesFromFields(generator.context, variables);
      pickedPropertyDeclarations(generator, properties, true);
    },
  );
}
exports.interfaceVariablesDeclarationForOperation = interfaceVariablesDeclarationForOperation;
function getObjectTypeName(type) {
  if (graphql_1.isListType(type)) {
    return getObjectTypeName(type.ofType);
  }
  if (graphql_1.isNonNullType(type)) {
    return getObjectTypeName(type.ofType);
  }
  if (graphql_1.isObjectType(type)) {
    return `"${type.name}"`;
  }
  if (graphql_1.isUnionType(type)) {
    return type
      .getTypes()
      .map(type => getObjectTypeName(type))
      .join(' | ');
  }
  return `"${type.name}"`;
}
function updateTypeNameField(rootField) {
  const fields =
    rootField.fields &&
    rootField.fields.map(field => {
      if (field.fieldName === '__typename') {
        const objectTypeName = getObjectTypeName(rootField.type);
        return {
          ...field,
          typeName: objectTypeName,
          type: { name: objectTypeName },
        };
      }
      if (field.fields) {
        return updateTypeNameField(field);
      }
      return field;
    });
  return {
    ...rootField,
    fields,
  };
}
exports.updateTypeNameField = updateTypeNameField;
function interfaceDeclarationForOperation(generator, { operationName, operationType, fields }) {
  const interfaceName = interfaceNameFromOperation({ operationName, operationType });
  fields = fields.map(field => updateTypeNameField(field));
  const properties = propertiesFromFields(generator.context, fields);
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
    },
    () => {
      pickedPropertyDeclarations(generator, properties);
    },
  );
}
exports.interfaceDeclarationForOperation = interfaceDeclarationForOperation;
function interfaceDeclarationForFragment(generator, fragment) {
  const { fragmentName, typeCondition, fields, inlineFragments } = fragment;
  const interfaceName = `${fragmentName}Fragment`;
  language_1.interfaceDeclaration(
    generator,
    {
      interfaceName,
      noBrackets: graphql_1.isAbstractType(typeCondition),
    },
    () => {
      if (graphql_1.isAbstractType(typeCondition)) {
        const propertySets = fragment.possibleTypes.map(type => {
          const inlineFragment = inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type.toString();
          });
          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` },
                };
              } else {
                return field;
              }
            });
            return propertiesFromFields(generator.context, fields);
          } else {
            const fragmentFields = fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` },
                };
              } else {
                return field;
              }
            });
            return propertiesFromFields(generator.context, fragmentFields);
          }
        });
        language_1.pickedPropertySetsDeclaration(generator, fragment, propertySets, true);
      } else {
        const fragmentFields = fields.map(field => {
          if (field.fieldName === '__typename') {
            return {
              ...field,
              typeName: `"${fragment.typeCondition}"`,
              type: { name: `"${fragment.typeCondition}"` },
            };
          } else {
            return field;
          }
        });
        const properties = propertiesFromFields(generator.context, fragmentFields);
        pickedPropertyDeclarations(generator, properties);
      }
    },
  );
}
exports.interfaceDeclarationForFragment = interfaceDeclarationForFragment;
function propertiesFromFields(context, fields) {
  return fields.map(field => propertyFromField(context, field));
}
exports.propertiesFromFields = propertiesFromFields;
function propertyFromField(context, field) {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;
  const propertyName = fieldName;
  let property = { fieldName, fieldType, propertyName, description };
  const namedType = graphql_1.getNamedType(fieldType);
  let isNullable = true;
  if (graphql_1.isNonNullType(fieldType)) {
    isNullable = false;
  }
  if (graphql_1.isCompositeType(namedType)) {
    const typeName = namedType.toString();
    let isArray = false;
    let isArrayElementNullable = null;
    if (graphql_1.isListType(fieldType)) {
      isArray = true;
      isArrayElementNullable = !graphql_1.isNonNullType(fieldType.ofType);
    } else if (graphql_1.isNonNullType(fieldType) && graphql_1.isListType(fieldType.ofType)) {
      isArray = true;
      isArrayElementNullable = !graphql_1.isNonNullType(fieldType.ofType.ofType);
    }
    return {
      ...property,
      typeName,
      fields: field.fields,
      isComposite: true,
      fragmentSpreads,
      inlineFragments,
      fieldType,
      isArray,
      isNullable,
      isArrayElementNullable,
    };
  } else {
    if (field.fieldName === '__typename') {
      const typeName = types_1.typeNameFromGraphQLType(context, fieldType, null, false);
      return { ...property, typeName, isComposite: false, fieldType, isNullable: false };
    } else {
      const typeName = types_1.typeNameFromGraphQLType(context, fieldType, null, isNullable);
      return { ...property, typeName, isComposite: false, fieldType, isNullable };
    }
  }
}
exports.propertyFromField = propertyFromField;
function pickedPropertyDeclarations(generator, properties, isOptional = false) {
  if (!properties) return;
  properties.forEach(property => {
    if (graphql_1.isAbstractType(graphql_1.getNamedType(property.type || property.fieldType))) {
      const propertySets = getPossibleTypeNames(generator, property).map(type => {
        const inlineFragment =
          property.inlineFragments &&
          property.inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type;
          });
        if (inlineFragment) {
          const fields = inlineFragment.fields.map(field => {
            if (field.fieldName === '__typename') {
              return {
                ...field,
                typeName: `"${inlineFragment.typeCondition}"`,
                type: { name: `"${inlineFragment.typeCondition}"` },
              };
            } else {
              return field;
            }
          });
          return propertiesFromFields(generator.context, fields);
        } else {
          const fields = property.fields.map(field => {
            if (field.fieldName === '__typename') {
              return {
                ...field,
                typeName: `"${type}"`,
                type: { name: `"${type}"` },
              };
            } else {
              return field;
            }
          });
          return propertiesFromFields(generator.context, fields);
        }
      });
      language_1.pickedPropertySetsDeclaration(generator, property, propertySets);
    } else {
      if (
        (property.fields && property.fields.length > 0) ||
        (property.inlineFragments && property.inlineFragments.length > 0) ||
        (property.fragmentSpreads && property.fragmentSpreads.length > 0)
      ) {
        language_1.propertyDeclaration(generator, property, () => {
          const properties = propertiesFromFields(generator.context, property.fields);
          pickedPropertyDeclarations(generator, properties, isOptional);
        });
      } else {
        language_1.propertyDeclaration(generator, { ...property, isOptional });
      }
    }
  });
}
exports.pickedPropertyDeclarations = pickedPropertyDeclarations;
function getPossibleTypeNames(generator, property) {
  const type = graphql_1.getNamedType(property.fieldType || property.type);
  if (graphql_1.isUnionType(type) || graphql_1.isInterfaceType(type)) {
    return generator.context.schema.getPossibleTypes(type).map(type => type.name);
  }
  return [];
}
//# sourceMappingURL=codeGeneration.js.map
