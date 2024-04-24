import { CodeGenDirective, CodeGenField, CodeGenFieldDirective, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import { TransformerV2DirectiveName, DEFAULT_HASH_KEY_FIELD } from './constants';
import { getDirective, getOtherSideBelongsToField } from './fieldUtils';
import { getModelPrimaryKeyComponentFields } from './fieldUtils';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
  flattenFieldDirectives,
  CodeGenFieldConnectionHasMany,
} from './process-connections';
import { getConnectedFieldV2, fieldsAndReferencesErrorMessage } from './process-connections-v2';


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
  const references = connectionDirective.arguments.references || [];

  if (connectionFields.length > 0 && references.length > 0) {
    throw new Error(fieldsAndReferencesErrorMessage);
  }

  if (references.length > 0) {
    // native uses the connected field instead of associatedWithFields
    // when using references associatedWithFields and associatedWithNative are not the same
    // getConnectedFieldV2 also ensures there is a matching belongsTo field with references
    const associatedWithNative = getConnectedFieldV2(field, model, otherSide, connectionDirective.name, shouldUseModelNameFieldInHasManyAndBelongsTo)
    const associatedWithFields = references.map((reference: string) => otherSide.fields.find((field) => reference === field.name))
    return {
      kind: CodeGenConnectionType.HAS_MANY,
      associatedWith: associatedWithFields[0],
      associatedWithFields,
      associatedWithNative,
      isConnectingFieldAutoCreated: false,
      connectedModel: otherSide,
    };
  }

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

/**
 * Helper to add a key directive to a given model.
 */
 function addKeyToModel(model: CodeGenModel, name: string, fields: string[]): void {
  model.directives.push({
    name: 'key',
    arguments: {
      name,
      fields,
    },
  });
}

/**
 * Helper to simplify retrieving either CPK-enabled or standard connection fields.
 * Returns a list of fields of at least length 1.
 */
function getConnectionAssociatedFields(hasManyConnection: CodeGenFieldConnectionHasMany): CodeGenField[] {
  const associatedFields = hasManyConnection.associatedWithFields && hasManyConnection.associatedWithFields.length > 0
  ? hasManyConnection.associatedWithFields
  : [hasManyConnection.associatedWith]
  if (associatedFields.length === 0) {
    throw new Error('Expected at least one associated field for the hasMany relationship.');
  }
  return associatedFields;
}

/**
 * A corresponding belongsTo means that the corresponding model has a field with type that is the name of this model, and with a @belongsTo
 * directive attached to it.
 */
function doesHasManyConnectionHaveCorrespondingBelongsTo(model: CodeGenModel, hasManyConnection: CodeGenFieldConnectionHasMany): boolean {
  const fieldReferencingParent = hasManyConnection.connectedModel.fields.find(f => f.type === model.name);
  if (!fieldReferencingParent) {
    return false;
  }
  return fieldReferencingParent.directives.some(d => d.name === TransformerV2DirectiveName.BELONGS_TO);
}

/**
 * Check if the @hasMany directive on this field specifies an indexName.
 */
function doesHasManySpecifyIndexName(field: CodeGenField): boolean {
  return field.directives.some(d => d.name === TransformerV2DirectiveName.HAS_MANY && d.arguments.indexName);
}

/**
 * Return whether or not a hasMany connection has an implicit key defined.
 * This is determined if there is a belongsTo directive on the connected model, or if there is an index defined on the directive.
 */
export function hasManyHasImplicitKey(field: CodeGenField, model: CodeGenModel, hasManyConnection: CodeGenFieldConnectionHasMany): boolean {
  const hasCorrespondingBelongsTo = doesHasManyConnectionHaveCorrespondingBelongsTo(model, hasManyConnection);
  const hasIndexNameSpecified = doesHasManySpecifyIndexName(field);
  return !(hasCorrespondingBelongsTo || hasIndexNameSpecified);
}

/**
 * Extract the name and list of keys from the connection information, and add the key to
 * the related model.
 */
export function addHasManyKey(field: CodeGenField, model: CodeGenModel, hasManyConnection: CodeGenFieldConnectionHasMany): void {
  const associatedFieldNames = getConnectionAssociatedFields(hasManyConnection).map(f => f.name);
  const connectedModel = hasManyConnection.connectedModel;
  // Applying consistent auto-naming as the transformer does today
  // https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-relational-transformer/src/resolvers.ts#L334-L396
  const name = `gsi-${model.name}.${field.name}`;
  addKeyToModel(connectedModel, name, associatedFieldNames);
}
