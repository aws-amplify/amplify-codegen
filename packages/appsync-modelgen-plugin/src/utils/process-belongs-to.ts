import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { getModelPrimaryKeyComponentFields } from './get-model-primary-key-component-fields';
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
  useFieldNameForPrimaryKeyConnectionField: boolean = false,
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
  const connectionFields = connectionDirective.arguments.fields || [];

  if (connectionFields.length > 1) {
    // Todo: Move to a common function and update the error message
    throw new Error('DataStore only support one key in field');
  }

  if (field.isList) {
    throw new Error(
      `A list field does not support the 'belongsTo' relation`
    );
  }

  let validOtherSideField = false;
  otherSideField.directives.forEach(dir => {
    if (dir.name === 'hasOne' || dir.name === 'hasMany') {
      validOtherSideField = true;
    }
  });

  if (!validOtherSideField) {
    throw new Error(
      `A 'belongsTo' field should match to a corresponding 'hasMany' or 'hasOne' field`
    );
  }
  // if a type is connected using name, then amplify-graphql-relational-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const otherSideHasMany = otherSideField.isList;
  const isConnectingFieldAutoCreated = false;

  // New metada type introduced by custom PK v2 support
  const targetNames = connectionFields.length > 0
    ? [ ...connectionFields ]
    : (otherSideHasMany
      ? [makeConnectionAttributeName(otherSide.name, otherSideField.name)]
      : (useFieldNameForPrimaryKeyConnectionField
        ? getModelPrimaryKeyComponentFields(otherSide).map(componentField => makeConnectionAttributeName(model.name, field.name, componentField.name))
        : [makeConnectionAttributeName(model.name, field.name)]));

  return {
    kind: CodeGenConnectionType.BELONGS_TO,
    connectedModel: otherSide,
    isConnectingFieldAutoCreated,
    targetName: targetNames[0],
    targetNames,
  };
}

export function getBelongsToConnectedField(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel): CodeGenField | undefined {
  let otherSideDirectives = flattenFieldDirectives(connectedModel).filter(dir => {
    const connectedField = connectedModel.fields.find(connField => { return connField.name === dir.fieldName; });
    const fieldType = connectedField?.type;
    return ((dir.name === 'hasOne' && !connectedField?.isList) || (dir.name === 'hasMany' && connectedField?.isList)) && model.name === fieldType;
  });

  if (otherSideDirectives?.length === 1) {
    return connectedModel.fields.find(connField => { return connField.name === otherSideDirectives[0].fieldName; });
  }
}

