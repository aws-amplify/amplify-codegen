import { CodeGenModel, CodeGenModelMap, CodeGenField, CodeGenFieldDirective } from '../visitors/appsync-visitor';
import { toCamelCase } from './fieldUtils';
import { getDirective } from './fieldUtils';
import { DEFAULT_HASH_KEY_FIELD } from './constants';

export enum CodeGenConnectionType {
  HAS_ONE = 'HAS_ONE',
  BELONGS_TO = 'BELONGS_TO',
  HAS_MANY = 'HAS_MANY',
}
export type CodeGenConnectionTypeBase = {
  kind: CodeGenConnectionType;
  connectedModel: CodeGenModel;
  isConnectingFieldAutoCreated: boolean;
};
export type CodeGenFieldConnectionBelongsTo = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.BELONGS_TO;
  targetName: string; // Legacy field remained for backward compatability
  targetNames: string[]; // New attribute for v2 custom pk support
  isUsingReferences?: boolean;
};
export type CodeGenFieldConnectionHasOne = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.HAS_ONE;
  associatedWith: CodeGenField;// Legacy field remained for backward compatability
  associatedWithNativeReferences?: CodeGenField; // native uses the connected field instead of associatedWithFields
  associatedWithFields: CodeGenField[]; // New attribute for v2 custom pk support
  targetName?: string; // Legacy field remained for backward compatability
  targetNames?: string[]; // New attribute for v2 custom pk support
};

export type CodeGenFieldConnectionHasMany = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.HAS_MANY;
  associatedWith: CodeGenField;// Legacy field remained for backward compatability
  associatedWithNativeReferences?: CodeGenField; // native uses the connected field instead of associatedWithFields
  associatedWithFields: CodeGenField[]; // New attribute for v2 custom pk support
};

export type CodeGenFieldConnection = CodeGenFieldConnectionBelongsTo | CodeGenFieldConnectionHasOne | CodeGenFieldConnectionHasMany;

export function makeConnectionAttributeName(type: string, field?: string, otherSidePrimaryKeyComponentField: string = 'id') {
  // The same logic is used graphql-connection-transformer package to generate association field
  // Make sure the logic gets update in that package
  return field ? toCamelCase([type, field, otherSidePrimaryKeyComponentField]) : toCamelCase([type, otherSidePrimaryKeyComponentField]);
}

export function flattenFieldDirectives(model: CodeGenModel) {
  let totalDirectives: CodeGenFieldDirective[] = new Array<CodeGenFieldDirective>();
  model.fields.forEach(field => {
    field.directives.forEach(dir => {
      let fieldDir = dir as CodeGenFieldDirective;
      fieldDir.fieldName = field.name;
      totalDirectives.push(fieldDir);
    });
  });
  return totalDirectives;
}

export function getConnectedField(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel): CodeGenField {
  const connectionInfo = getDirective(field)('connection');
  if (!connectionInfo) {
    throw new Error(`The ${field.name} on model ${model.name} is not connected`);
  }

  const connectionName = connectionInfo.arguments.name;
  const keyName = connectionInfo.arguments.keyName;
  const connectionFields = connectionInfo.arguments.fields;
  if (connectionFields) {
    let keyDirective;
    if (keyName) {
      keyDirective = connectedModel.directives.find(dir => {
        return dir.name === 'key' && dir.arguments.name === keyName;
      });
      if (!keyDirective) {
        throw new Error(
          `Error processing @connection directive on ${model.name}.${field.name}, @key directive with name ${keyName} was not found in connected model ${connectedModel.name}`,
        );
      }
    } else {
      keyDirective = connectedModel.directives.find(dir => {
        return dir.name === 'key' && typeof dir.arguments.name === 'undefined';
      });
    }

    // when there is a fields argument in the connection
    const connectedFieldName = keyDirective ? keyDirective.arguments.fields[0] : DEFAULT_HASH_KEY_FIELD;

    // Find a field on the other side which connected by a @connection and has the same fields[0] as keyName field
    const otherSideConnectedField = connectedModel.fields.find(f => {
      return f.directives.find(d => {
        return d.name === 'connection' && d.arguments.fields && d.arguments.fields[0] === connectedFieldName;
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
      f.directives.find(d => d.name === 'connection' && d.arguments.name === connectionName && f !== field),
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

export function processConnections(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  isDataStoreEnabled: boolean,
): CodeGenFieldConnection | undefined {
  const connectionDirective = field.directives.find(d => d.name === 'connection');
  if (connectionDirective) {
    const otherSide = modelMap[field.type];
    const connectionFields = connectionDirective.arguments.fields || [];
    const otherSideField = getConnectedField(field, model, otherSide);

    const isNewField = !otherSide.fields.includes(otherSideField);

    // if a type is connected using name, then graphql-connection-transformer adds a field to
    //  track the connection and that field is not part of the selection set
    // but if the field are connected using fields argument in connection directive
    // we are reusing the field and it should be preserved in selection set
    const isConnectingFieldAutoCreated = connectionFields.length === 0;

    if (!isNewField) {
      // 2 way connection
      if (field.isList && !otherSideField.isList) {
        // Many to One
        return {
          kind: CodeGenConnectionType.HAS_MANY,
          associatedWith: otherSideField,
          associatedWithFields: [], // New attribute for v2 custom pk support. Not used in v1 so use empty array.
          isConnectingFieldAutoCreated,
          connectedModel: otherSide,
        };
      } else if (!field.isList && otherSideField.isList) {
        //  One to Many
        if (connectionFields.length > 1) {
          // Todo: Move to a common function and update the error message
          throw new Error('DataStore only support one key in field');
        }
        return {
          kind: CodeGenConnectionType.BELONGS_TO,
          connectedModel: otherSide,
          isConnectingFieldAutoCreated,
          targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
          targetNames: [] // New attribute for v2 custom pk support. Not used in v1 so use empty array.
        };
      } else if (!field.isList && !otherSideField.isList) {
        // One to One
        //  Data store can only support models where 1:1 connection, one of the connection side should be
        // Non null able to support the foreign key constrain.
        if (!field.isNullable && otherSideField.isNullable) {
          /*
          # model
          type Person { # hasOne
            license: License;
          }
          # otherSide
          type License { # belongsTo
            person: Person!
          }
          */
          return {
            kind: CodeGenConnectionType.BELONGS_TO,
            connectedModel: otherSide,
            isConnectingFieldAutoCreated,
            targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
            targetNames: [] // New attribute for v2 custom pk support. Not used in v1 so use empty array.
          };
        } else if ((field.isNullable && !otherSideField.isNullable) || !isDataStoreEnabled) {
          /*
          # model
          type License { # belongsTo
            person: Person!
          }
          # otherSide
          type Person { # hasOne
            license: License;
          }
          */
          return {
            kind: CodeGenConnectionType.HAS_ONE,
            associatedWith: otherSideField,
            associatedWithFields: [], // New attribute for v2 custom pk support. Not used in v1 so use empty array.
            connectedModel: otherSide,
            isConnectingFieldAutoCreated,
            targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
            targetNames: [] // New attribute for v2 custom pk support. Not used in v1 so use empty array.
          };
        } else {
          /*
          # model
          type License { # belongsTo
            person: Person!
          }
          # otherSide
          type Person { # hasOne
            license: License;
          }
          */
          throw new Error(
            `DataStore does not support 1 to 1 connection with both sides of connection as optional field: ${model.name}.${field.name}`,
          );
        }
      }
    } else {
      // one way connection
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
          associatedWithFields: [], // New attribute for v2 custom pk support. Not used in v1 so use empty array.
        };
      } else {
        if (connectionFields.length > 1) {
          // Todo: Update the message
          throw new Error('DataStore only support one key in field');
        }
        return {
          kind: CodeGenConnectionType.BELONGS_TO,
          connectedModel: otherSide,
          isConnectingFieldAutoCreated,
          targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
          targetNames: [] // New attribute for v2 custom pk support. Not used in v1 so use empty array.
        };
      }
    }
  }
}
