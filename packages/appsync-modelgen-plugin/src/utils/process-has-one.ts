import { CodeGenField, CodeGenFieldDirective, CodeGenModel } from '../visitors/appsync-visitor';
import { DEFAULT_HASH_KEY_FIELD, flattenFieldDirectives, getDirective, makeConnectionAttributeName } from './process-connections';


export function getHasOneConnectedField(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel): CodeGenField {
  const hasOneDirective = getDirective(field)('hasOne');
  if (!hasOneDirective) {
    throw new Error(`The ${field.name} on model ${model.name} is not connected`);
  }

  if (hasOneDirective.arguments.fields) {
    const keyDirective = flattenFieldDirectives(connectedModel).find(dir => {
      return dir.name === 'primaryKey';
    });

    // when there is a fields argument in the connection
    const connectedFieldName = keyDirective ? ((fieldDir: CodeGenFieldDirective) => { return fieldDir.fieldName ;})(keyDirective as CodeGenFieldDirective)
                                            : DEFAULT_HASH_KEY_FIELD;

    // If there are no field with @connection with keyName then try to find a field that has same name as connection name
    const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);
    if (!connectedField) {
      throw new Error(`Can not find key field ${connectedFieldName} in ${connectedModel}`);
    }
    return connectedField;
  }

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
