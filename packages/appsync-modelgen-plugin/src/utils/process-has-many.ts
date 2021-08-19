import { CodeGenDirective, CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';


export function processHasManyConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  const connectionFields = connectionDirective.arguments.fields || [];
  const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);

  const isNewField = !otherSide.fields.includes(otherSideField);

  // if a type is connected using name, then graphql-connection-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const isConnectingFieldAutoCreated = connectionFields.length === 0;

  if (!isNewField) {
    if (field.isList && !otherSideField.isList) {
      return {
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: otherSideField,
        isConnectingFieldAutoCreated,
        connectedModel: otherSide,
      };
    }
  }
  else {
    if (field.isList) {
      const connectionFieldName = makeConnectionAttributeName(model.name, field.name);
      const existingConnectionField = otherSide.fields.find(f => f.name === connectionFieldName);
      return {
        kind: CodeGenConnectionType.HAS_MANY,
        connectedModel: otherSide,
        isConnectingFieldAutoCreated,
        associatedWith: existingConnectionField || {
          name: connectionFieldName,
          type: 'ID',
          isList: false,
          isNullable: true,
          directives: [],
        },
      };
    }
    else {
      throw new Error("A field with hasMany must be a list type");
    }
  }
}
