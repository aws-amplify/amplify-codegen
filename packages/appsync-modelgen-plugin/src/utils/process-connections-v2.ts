import { CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { CodeGenFieldConnection, DEFAULT_HASH_KEY_FIELD, flattenFieldDirectives, makeConnectionAttributeName } from './process-connections';
import { processHasOneConnection } from './process-has-one';
import { processBelongsToConnection, getBelongsToConnectedField } from './process-belongs-to';
import { processHasManyConnection } from './process-has-many';
import { getDirective } from './fieldUtils';

// TODO: This file holds several references to utility functions in the v1 process connections file, those functions need to go here before that file is removed

export function getConnectedFieldV2(
  field: CodeGenField,
  model: CodeGenModel,
  connectedModel: CodeGenModel,
  directiveName: string,
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean = false
): CodeGenField {
  const connectionInfo = getDirective(field)(directiveName);
  if (!connectionInfo) {
    throw new Error(`The ${field.name} on model ${model.name} is not connected`);
  }

  if (connectionInfo.name === 'belongsTo') {
    let connectedFieldBelongsTo = getBelongsToConnectedField(field, model, connectedModel);
    if (connectedFieldBelongsTo) {
      return connectedFieldBelongsTo;
    }
  }

  const indexName = connectionInfo.arguments.indexName;
  const connectionFields = connectionInfo.arguments.fields;
  if (connectionFields || directiveName === 'hasOne') {
    let indexDirective;
    if (indexName) {
      indexDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'index' && dir.arguments.name === indexName;
      });
      if (!indexDirective) {
        throw new Error(
          `Error processing @${connectionInfo.name} directive on ${model.name}.${field.name}, @index directive with name ${indexName} was not found in connected model ${connectedModel.name}`,
        );
      }
    } else {
      indexDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'primaryKey';
      });
    }

    // when there is a fields argument in the connection
    const connectedFieldName = indexDirective
      ? ((fieldDir: CodeGenFieldDirective) => {
          return fieldDir.fieldName;
        })(indexDirective as CodeGenFieldDirective)
      : DEFAULT_HASH_KEY_FIELD;

    // Find a field on the other side which connected by a @connection and has the same fields[0] as indexName field
    const otherSideConnectedField = connectedModel.fields
      .filter(f => f.type === model.name)
      .find(f =>
        f.directives.find(
          d =>
            (d.name === 'belongsTo' || d.name === 'hasOne' || d.name === 'hasMany') &&
            d.arguments.fields &&
            d.arguments.fields[0] === connectedFieldName,
        ),
      );
    if (otherSideConnectedField) {
      return otherSideConnectedField;
    }
    // If there are no field with @connection with indexName then try to find a field that has same name as connection name
    const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);

    if (!connectedField) {
      throw new Error(`Can not find key field ${connectedFieldName} in ${connectedModel.name}`);
    }
    return connectedField;
  }

    // TODO: Remove us, leaving in to be explicit on why this flag is here.
  if (shouldUseModelNameFieldInHasManyAndBelongsTo) {
    const otherSideConnectedField = connectedModel.fields
    .filter(f => f.type === model.name)
    .find(f =>
      f.directives.find(
        d =>
          (d.name === 'belongsTo' || d.name === 'hasOne' || d.name === 'hasMany')
      ),
    );
    if (otherSideConnectedField) {
      return otherSideConnectedField;
    }
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
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean
): CodeGenFieldConnection | undefined {
  const connectionDirective = field.directives.find(d => d.name === 'hasOne' || d.name === 'hasMany' || d.name === 'belongsTo');

  if (connectionDirective) {
    switch (connectionDirective.name) {
      case 'hasOne':
        return processHasOneConnection(field, model, modelMap, connectionDirective);
      case 'belongsTo':
        return processBelongsToConnection(field, model, modelMap, connectionDirective);
      case 'hasMany':
        return processHasManyConnection(field, model, modelMap, connectionDirective, shouldUseModelNameFieldInHasManyAndBelongsTo);
      default:
        break;
    }
  }
}
