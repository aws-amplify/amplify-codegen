import { CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenFieldConnection, DEFAULT_HASH_KEY_FIELD, flattenFieldDirectives,
  getDirective,
  makeConnectionAttributeName,
} from './process-connections';
import { processHasOneConnection } from './process-has-one';
import { processBelongsToConnection } from './process-belongs-to';
import { processHasManyConnection } from './process-has-many';

// TODO: This file holds several references to utility functions in the v1 process connections file, those functions need to go here before that file is removed

export function getConnectedFieldV2(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel, directiveName: string): CodeGenField {
  const connectionInfo = getDirective(field)(directiveName);
  if (!connectionInfo) {
    throw new Error(`The ${field.name} on model ${model.name} is not connected`);
  }

  const connectionName = connectionInfo.arguments.name;
  const keyName = connectionInfo.arguments.keyName;
  const connectionFields = connectionInfo.arguments.fields;
  if (connectionFields) {
    let keyDirective;
    if (keyName) {
      keyDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'index' && dir.arguments.name === keyName;
      });
      if (!keyDirective) {
        throw new Error(
          `Error processing @${connectionInfo.name} directive on ${model.name}.${field.name}, @index directive with name ${keyName} was not found in connected model ${connectedModel.name}`,
        );
      }
    } else {
      keyDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'primaryKey';
      });
    }

    // when there is a fields argument in the connection
    const connectedFieldName = keyDirective ? ((fieldDir: CodeGenFieldDirective) => { return fieldDir.fieldName ;})(keyDirective as CodeGenFieldDirective) : DEFAULT_HASH_KEY_FIELD;

    // Find a field on the other side which connected by a @connection and has the same fields[0] as keyName field
    const otherSideConnectedField = connectedModel.fields.find(f => {
      return f.directives.find(d => {
        return (d.name === 'belongsTo' || d.name === 'hasOne' || d.name === 'hasMany') && d.arguments.fields && d.arguments.fields[0] === connectedFieldName;
      });
    });
    if (otherSideConnectedField) {
      return otherSideConnectedField;
    }
    // If there are no field with @connection with keyName then try to find a field that has same name as connection name
    const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);

    if (!connectedField) {
      throw new Error(`Can not find key field ${connectedFieldName} in ${connectedModel}`);
    }
    return connectedField;
  } else if (connectionName) {
    // when the connection is named
    const connectedField = connectedModel.fields.find(f =>
      f.directives.find(d => (d.name === 'belongsTo' || d.name === 'hasOne' || d.name === 'hasMany') && d.arguments.name === connectionName && f !== field),
    );
    if (!connectedField) {
      throw new Error(`Can not find key field with connection name ${connectionName} in ${connectedModel}`);
    }
    return connectedField;
  }
  // un-named connection. Use an existing field or generate a new field
  const connectedFieldName = makeConnectionAttributeName(model.name, field.name);
  const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);
  return connectedField
    ? connectedField
    : {
      name: connectedFieldName,
      directives: [],
      type: 'ID',
      isList: false,
      isNullable: true,
    };
}


export function processConnectionsV2(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
): CodeGenFieldConnection | undefined {
  const connectionDirective = field.directives.find(d => d.name === 'hasOne' || d.name === 'hasMany' || d.name === 'belongsTo');

  if(connectionDirective) {

    switch(connectionDirective.name) {
      case 'hasOne':
        return processHasOneConnection(field, model, modelMap, connectionDirective);
      case 'belongsTo':
        return processBelongsToConnection(field, model, modelMap, connectionDirective);
      case 'hasMany':
        return processHasManyConnection(field, model, modelMap, connectionDirective);
      default:
        break;
    }
  }
}
