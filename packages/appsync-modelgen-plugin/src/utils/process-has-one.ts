import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';
import { getModelPrimaryKeyComponentFields } from './fieldUtils';
import { getOtherSideBelongsToField } from './fieldUtils';

export function processHasOneConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
  isCustomPKEnabled: boolean = false
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  // Find other side belongsTo field when in bi direction connection
  const otherSideBelongsToField = getOtherSideBelongsToField(model.name, otherSide);
  if (field.isList || (otherSideBelongsToField && otherSideBelongsToField.isList)) {
    throw new Error("A hasOne relationship should be 1:1, no lists");
  }
  let associatedWithFields;
  if (isCustomPKEnabled) {
    // Return belongsTo field when in bi direction connenction
    if (otherSideBelongsToField) {
      associatedWithFields = [otherSideBelongsToField];
    }
    // Otherwise return child pk and sk fields
    else {
      associatedWithFields = getModelPrimaryKeyComponentFields(otherSide);
    }
  } else {
    const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
    associatedWithFields = [otherSideField];
  }
  const connectionFields = connectionDirective.arguments.fields || [];

  // TODO: Update comment, graphql-connection-transformer is the v1 package and this file is created for vNext
  // if a type is connected using name, then graphql-connection-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const isConnectingFieldAutoCreated = connectionFields.length === 0;
  // New metada type introduced by custom PK v2 support
  const targetNames = connectionFields.length > 0
    ? [ ...connectionFields ]
    : (isCustomPKEnabled
      ? getModelPrimaryKeyComponentFields(otherSide).map(componentField => makeConnectionAttributeName(model.name, field.name, componentField.name))
      : [makeConnectionAttributeName(model.name, field.name)])
  return {
    kind: CodeGenConnectionType.HAS_ONE,
    associatedWith: associatedWithFields[0],
    associatedWithFields,
    connectedModel: otherSide,
    isConnectingFieldAutoCreated,
    targetName: targetNames[0],
    targetNames,
  };
}
