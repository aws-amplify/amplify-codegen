import { CodeGenDirective, CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { TransformerV2DiretiveName, DEFAULT_HASH_KEY_FIELD } from './constants';
import { getDirective, getOtherSideBelongsToFieldName } from './fieldUtils';
import { getModelPrimaryKeyComponentFields } from './fieldUtils';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
  flattenFieldDirectives,
} from './process-connections';
import { getConnectedFieldV2 } from './process-connections-v2';


export function processHasManyConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean,
  isCustomPKEnabled: boolean = false,
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  const connectionFields = connectionDirective.arguments.fields || [];
  const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name, shouldUseModelNameFieldInHasManyAndBelongsTo);
  const otherSideFields = isCustomPKEnabled
    ? getConnectedFieldsForHasMany(field, model, otherSide, shouldUseModelNameFieldInHasManyAndBelongsTo)
    : [otherSideField];
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
        associatedWithFields: otherSideFields,
        isConnectingFieldAutoCreated,
        connectedModel: otherSide,
      };
    }
  }
  else {
    if (field.isList) {
      const connectionFieldName = makeConnectionAttributeName(model.name, field.name);
      const existingConnectionField = shouldUseModelNameFieldInHasManyAndBelongsTo
        ? otherSide.fields.find(f => f.name === connectionFieldName) || otherSideField
        : otherSide.fields.find(f => f.name === connectionFieldName)
      // const existingConnectionField = otherSide.fields.find(f => f.name === connectionFieldName);
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
        associatedWithFields: otherSideFields,
      };
    }
    else {
      throw new Error("A field with hasMany must be a list type");
    }
  }
}

export function getConnectedFieldsForHasMany(
  field: CodeGenField,
  model: CodeGenModel,
  connectedModel: CodeGenModel,
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean
): CodeGenField[] {
  const hasManyDir = getDirective(field)(TransformerV2DiretiveName.HAS_MANY);
  if (!hasManyDir) {
    throw new Error(`The ${field.name} on model ${model.name} is not connected`);
  }
  let otherSideConnectedField;
  const indexName = hasManyDir.arguments.indexName;
  const indexMatchingFields = hasManyDir.arguments.fields;
  // When fields argument is defined
  if (indexMatchingFields) {
    let otherSideConnectedDir;
    const otherSideFieldDirectives: CodeGenFieldDirective[] = flattenFieldDirectives(connectedModel);
    // Find gsi on other side if index is defined
    if (indexName) {
      otherSideConnectedDir = otherSideFieldDirectives.find(dir => {
        return dir.name === TransformerV2DiretiveName.INDEX && dir.arguments.name === indexName;
      });
      if (!otherSideConnectedDir) {
        throw new Error(
          `Error processing @hasMany directive on ${model.name}.${field.name}, @index directive with name ${indexName} was not found in connected model ${connectedModel.name}`,
        );
      }
    }
    // Otherwise find the pk on other side
    else {
      otherSideConnectedDir = otherSideFieldDirectives.find(dir => {
        return dir.name === TransformerV2DiretiveName.PRIMARY_KEY;
      });
    }
    // Find other side connected field name
    const otherSideConnectedFieldName = otherSideConnectedDir?.fieldName ?? getOtherSideBelongsToFieldName(model.name, connectedModel) ?? DEFAULT_HASH_KEY_FIELD;
    // First check if it is a bi-connection and find the belongsTo field on the other side with fields[0] matching connected field name
    otherSideConnectedField = connectedModel.fields
      .filter(f => f.type === model.name)
      .find(f =>
        f.directives.find(
          d =>
            (d.name === TransformerV2DiretiveName.BELONGS_TO) &&
            d.arguments.fields &&
            d.arguments.fields[0] === otherSideConnectedFieldName,
        ),
      );
    if (otherSideConnectedField) {
      return [otherSideConnectedField];
    }
    // Otherwise find the field matching other side connected field name
    otherSideConnectedField = connectedModel.fields.find(f => f.name === otherSideConnectedFieldName);
    if (!otherSideConnectedField) {
      throw new Error(`Can not find key field ${otherSideConnectedFieldName} in ${connectedModel.name}`);
    }
    return [otherSideConnectedField];
  }

  // When fields argument is not defined, auto generate connected fields

  // All platforms except for JS use field with @belongsTo as connected field in hasMany/belongsTo bi-direction connection
  if (shouldUseModelNameFieldInHasManyAndBelongsTo) {
    otherSideConnectedField = connectedModel.fields
      .filter(f => f.type === model.name)
      .find(f => f.directives.find(d => d.name === TransformerV2DiretiveName.BELONGS_TO));
    if (otherSideConnectedField) {
      return [otherSideConnectedField];
    }
  }
  // Otherwise use auto-generated foreign keys
  return getModelPrimaryKeyComponentFields(model)
    .map(compField => {
      const foreignKeyFieldName = makeConnectionAttributeName(model.name, field.name, compField.name);
      otherSideConnectedField = connectedModel.fields.find(f => f.name === foreignKeyFieldName);
      return otherSideConnectedField ?? {
        name: foreignKeyFieldName,
        directives: [],
        type: compField.type,
        isList: false,
        isNullable: true,
      }
    });
}
