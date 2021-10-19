import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection, flattenFieldDirectives,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';


export function processBelongsToConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
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
  else if (field.isNullable && otherSideField.isNullable) {
    throw new Error(
      `DataStore does not support 1 to 1 connection with both sides of connection as optional field: ${model.name}.${field.name}`,
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
  const isConnectingFieldAutoCreated = connectionFields.length === 0;

  return {
    kind: CodeGenConnectionType.BELONGS_TO,
    connectedModel: otherSide,
    isConnectingFieldAutoCreated,
    targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
  };
}

export function getBelongsToConnectedField(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel, connectionInfo: CodeGenDirective): CodeGenField | undefined {
  if(connectionInfo.arguments.fields) {
    let indexDirective = flattenFieldDirectives(model).find(dir => {
      return dir.name === 'index' && dir.fieldName === connectionInfo.arguments.fields[0];
    });

    if(indexDirective) {
      let theIndex = indexDirective;
      let otherSideConnected = flattenFieldDirectives(connectedModel).find(dir => {
        return (dir.name === 'hasOne' || dir.name === 'hasMany') && dir?.arguments?.indexName === theIndex.arguments.name;
      });
      if(otherSideConnected) {
        for(let connField of connectedModel.fields) {
          if (connField.name === otherSideConnected?.fieldName) {
            return connField;
          }
        }
      }
    }
  }
  else {
    let otherSideDirectives = flattenFieldDirectives(connectedModel).filter(dir => {
      let fieldType = connectedModel.fields.find(connField => { return connField.name === dir.fieldName; })?.type;
      return (dir.name === 'hasOne' || dir.name === 'hasMany') && model.name === fieldType;
    });

    if (otherSideDirectives?.length === 1) {
      return connectedModel.fields.find(connField => { return connField.name === otherSideDirectives[0].fieldName; });
    }
  }
}
