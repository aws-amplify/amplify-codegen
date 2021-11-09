import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';

export function processHasOneConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
  const connectionFields = connectionDirective.arguments.fields || [];

  // TODO: Update comment, graphql-connection-transformer is the v1 package and this file is created for vNext
  // if a type is connected using name, then graphql-connection-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const isConnectingFieldAutoCreated = connectionFields.length === 0;

  if (!field.isList && !otherSideField.isList) {
    return {
      kind: CodeGenConnectionType.HAS_ONE,
      associatedWith: otherSideField,
      connectedModel: otherSide,
      isConnectingFieldAutoCreated,
      targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
    };
  }
  else {
    throw new Error("A hasOne relationship should be 1:1, no lists");
  }
}
