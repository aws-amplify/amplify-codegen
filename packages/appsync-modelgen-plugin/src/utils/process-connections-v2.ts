import { CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { CodeGenFieldConnection, flattenFieldDirectives, makeConnectionAttributeName } from './process-connections';
import { processHasOneConnection } from './process-has-one';
import { processBelongsToConnection, getBelongsToConnectedFields } from './process-belongs-to';
import { processHasManyConnection } from './process-has-many';
import { getDirective } from './fieldUtils';
import { DEFAULT_HASH_KEY_FIELD } from './constants';

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

  const references = connectionInfo.arguments.references;
  if (connectionInfo.name === 'belongsTo') {
    let connectedFieldsBelongsTo = getBelongsToConnectedFields(model, connectedModel);
    if (references) {
      if (connectionInfo) {
        const connectedField = connectedFieldsBelongsTo.find((field) => {
          return field.directives.some((dir) => {
            return (dir.name === 'hasOne' || dir.name === 'hasMany')
              && dir.arguments.references
              && JSON.stringify(dir.arguments.references) === JSON.stringify(connectionInfo.arguments.references);
          });
        });
        if (!connectedField) {
         throw new Error(`Error processing @belongsTo directive on ${model.name}.${field.name}. @hasOne or @hasMany directive with references ${JSON.stringify(connectionInfo.arguments?.references)} was not found in connected model ${connectedModel.name}`);
        }
        return connectedField;
      }
    }

    if (connectedFieldsBelongsTo.length === 1) {
      return connectedFieldsBelongsTo[0];
    }
  }

  const indexName = connectionInfo.arguments.indexName;
  const connectionFields = connectionInfo.arguments.fields;
  if (connectionFields && references) {
    throw new Error(fieldsAndReferencesErrorMessage);
  }
  if (references || connectionFields || directiveName === 'hasOne') {
    let connectionDirective;
    if (references) {
      if (connectionInfo) {
        connectionDirective = flattenFieldDirectives(connectedModel).find((dir) => {
          return dir.arguments.references
            && JSON.stringify(dir.arguments.references) === JSON.stringify(connectionInfo.arguments.references);
        });
        if (!connectionDirective) {
         throw new Error(`Error processing @${connectionInfo.name} directive on ${model.name}.${field.name}. @belongsTo directive with references ${JSON.stringify(connectionInfo.arguments?.references)} was not found in connected model ${connectedModel.name}`);
        }
      }
    }

    // Find gsi on other side if index is defined
    else if (indexName) {
      connectionDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'index' && dir.arguments.name === indexName;
      });
      if (!connectionDirective) {
        throw new Error(
          `Error processing @${connectionInfo.name} directive on ${model.name}.${field.name}, @index directive with name ${indexName} was not found in connected model ${connectedModel.name}`,
        );
      }
    }
    // Otherwise find the pk on other side
    else {
      connectionDirective = flattenFieldDirectives(connectedModel).find(dir => {
        return dir.name === 'primaryKey';
      });
    }

    const getOtherSideBelongsToField = (type: string, otherSideModel: CodeGenModel) => {
      return otherSideModel.fields
      .filter(f => f.type === type)
      .find(f =>
        f.directives.find(
          d => d.name === 'belongsTo'
        )
      )?.name;
    }

    // when there is a fields argument in the connection
    let connectedFieldName: string = DEFAULT_HASH_KEY_FIELD;
    if (connectionDirective) {
      connectedFieldName = ((fieldDir: CodeGenFieldDirective) => {
        return fieldDir.fieldName;
      })(connectionDirective as CodeGenFieldDirective)
    } else {
      const otherSideBelongsToField = getOtherSideBelongsToField(model.name, connectedModel);
      if (otherSideBelongsToField) {
        connectedFieldName = otherSideBelongsToField;
      }
    }

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
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean = false,
  isCustomPKEnabled: boolean = false,
  shouldUseFieldsInAssociatedWithInHasOne: boolean = false,
): CodeGenFieldConnection | undefined {
  const connectionDirective = field.directives.find(d => d.name === 'hasOne' || d.name === 'hasMany' || d.name === 'belongsTo');

  if (connectionDirective) {
    switch (connectionDirective.name) {
      case 'hasOne':
        return processHasOneConnection(field, model, modelMap, connectionDirective, isCustomPKEnabled, shouldUseFieldsInAssociatedWithInHasOne);
      case 'belongsTo':
        return processBelongsToConnection(field, model, modelMap, connectionDirective, isCustomPKEnabled);
      case 'hasMany':
        return processHasManyConnection(field, model, modelMap, connectionDirective, shouldUseModelNameFieldInHasManyAndBelongsTo, isCustomPKEnabled);
      default:
        break;
    }
  }
}

export const fieldsAndReferencesErrorMessage = `'fields' and 'references' cannot be used together.`;
