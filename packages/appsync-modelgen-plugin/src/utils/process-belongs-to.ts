import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { getModelPrimaryKeyComponentFields } from './fieldUtils';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  flattenFieldDirectives,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';


export function processBelongsToConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
  isCustomPKEnabled: boolean = false,
): CodeGenFieldConnection | undefined {
  if (field.isList) {
    throw new Error(
      `A list field does not support the 'belongsTo' relation`
    );
  }
  const otherSide = modelMap[field.type];
  const otherSideConnectedFields = getBelongsToConnectedFields(model, otherSide);
  if (otherSideConnectedFields.length === 0) {
    throw new Error(
      `A 'belongsTo' field should match to a corresponding 'hasMany' or 'hasOne' field`
    );
  }
  const references = connectionDirective.arguments.references || [];
  const isUsingReferences = references.length > 0;
  if (isUsingReferences) {
    // ensure there is a matching hasOne/hasMany field with references
    getConnectedFieldV2(field, model, otherSide, connectionDirective.name)
  }

  const otherSideField = isCustomPKEnabled ? otherSideConnectedFields[0] : getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
  const connectionFields = connectionDirective.arguments.fields || [];

  // if a type is connected using name, then amplify-graphql-relational-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const otherSideHasMany = otherSideField.isList;
  // New metada type introduced by custom PK v2 support
  let targetNames: string[] = [ ...connectionFields, ...references ];
  if (targetNames.length === 0) {
    if (otherSideHasMany) {
      targetNames = isCustomPKEnabled
        ? getModelPrimaryKeyComponentFields(otherSide).map(componentField => makeConnectionAttributeName(otherSide.name, otherSideField.name, componentField.name))
        : [makeConnectionAttributeName(otherSide.name, otherSideField.name)];
    }
    else {
      targetNames = isCustomPKEnabled
        ? getModelPrimaryKeyComponentFields(otherSide).map(componentField => makeConnectionAttributeName(model.name, field.name, componentField.name))
        : [makeConnectionAttributeName(model.name, field.name)];
    }
  }

  return {
    kind: CodeGenConnectionType.BELONGS_TO,
    connectedModel: otherSide,
    isConnectingFieldAutoCreated: false,
    targetName: targetNames[0],
    targetNames,
    isUsingReferences,
  };
}

/**
 * Get connected fields for belongsTo relaion
 * @param model CodeGen model of belongsTo side
 * @param connectedModel connected CodeGen model side
 * @returns Array of fields which are child model types with hasOne/hasMany diretives on connected model
 */
export function getBelongsToConnectedFields(model: CodeGenModel, connectedModel: CodeGenModel): CodeGenField[] {
  const otherSideDirectives = flattenFieldDirectives(connectedModel).filter(dir => {
    const connectedField = connectedModel.fields.find(connField => { return connField.name === dir.fieldName; });
    const fieldType = connectedField?.type;
    return ((dir.name === 'hasOne' && !connectedField?.isList) || (dir.name === 'hasMany' && connectedField?.isList)) && model.name === fieldType;
  });
  return otherSideDirectives.map(dir => {
    return connectedModel.fields.find(connField => connField.name === dir.fieldName)!
  });
}
