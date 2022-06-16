import { CodeGenDirective, CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { TransformerV2DirectiveName, DEFAULT_HASH_KEY_FIELD } from './constants';
import { getDirective, getOtherSideBelongsToField } from './fieldUtils';
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
  if (!field.isList) {
    throw new Error("A field with hasMany must be a list type");
  }
  const otherSide = modelMap[field.type];
  const connectionFields = connectionDirective.arguments.fields || [];
  const otherSideFields = isCustomPKEnabled
    ? getConnectedFieldsForHasMany(field, model, otherSide, shouldUseModelNameFieldInHasManyAndBelongsTo)
    : [getConnectedFieldV2(field, model, otherSide, connectionDirective.name, shouldUseModelNameFieldInHasManyAndBelongsTo)];
  const otherSideField = otherSideFields[0];

  // if a type is connected using name, then graphql-connection-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const isConnectingFieldAutoCreated = connectionFields.length === 0;
  return {
    kind: CodeGenConnectionType.HAS_MANY,
    associatedWith: otherSideField,
    associatedWithFields: otherSideFields,
    isConnectingFieldAutoCreated,
    connectedModel: otherSide,
  }
}

/**
 * Get connected fields for hasMany relation
 * @param field field with hasMany directive
 * @param model parent model with hasMany directive
 * @param connectedModel child model
 * @param shouldUseModelNameFieldInHasManyAndBelongsTo whether to use model name field as associateWith in hasMany/belongsTo. True for native platforms and false for JS
 * @returns Array of fields refering parent model
 */
export function getConnectedFieldsForHasMany(
  field: CodeGenField,
  model: CodeGenModel,
  connectedModel: CodeGenModel,
  shouldUseModelNameFieldInHasManyAndBelongsTo: boolean
): CodeGenField[] {
  const hasManyDir = getDirective(field)(TransformerV2DirectiveName.HAS_MANY);
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
        return dir.name === TransformerV2DirectiveName.INDEX && dir.arguments.name === indexName;
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
        return dir.name === TransformerV2DirectiveName.PRIMARY_KEY;
      });
    }
    // Find other side connected field name
    const otherSideConnectedFieldName = otherSideConnectedDir?.fieldName ?? getOtherSideBelongsToField(model.name, connectedModel)?.name ?? DEFAULT_HASH_KEY_FIELD;
    // First check if it is a bi-connection and find the belongsTo field on the other side with fields[0] matching connected field name
    otherSideConnectedField = connectedModel.fields
      .filter(f => f.type === model.name)
      .find(f =>
        f.directives.find(
          d =>
            (d.name === TransformerV2DirectiveName.BELONGS_TO) &&
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
      .find(f => f.directives.find(d => d.name === TransformerV2DirectiveName.BELONGS_TO));
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
