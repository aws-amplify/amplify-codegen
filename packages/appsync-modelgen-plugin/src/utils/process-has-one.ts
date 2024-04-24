import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenModelMap } from '../visitors/appsync-visitor';
import {
  CodeGenConnectionType,
  CodeGenFieldConnection,
  makeConnectionAttributeName,
} from './process-connections';
import { getConnectedFieldV2, fieldsAndReferencesErrorMessage } from './process-connections-v2';
import { getModelPrimaryKeyComponentFields } from './fieldUtils';
import { getOtherSideBelongsToField } from './fieldUtils';

export function processHasOneConnection(
  field: CodeGenField,
  model: CodeGenModel,
  modelMap: CodeGenModelMap,
  connectionDirective: CodeGenDirective,
  isCustomPKEnabled: boolean = false,
  shouldUseFieldsInAssociatedWithInHasOne:boolean = false
): CodeGenFieldConnection | undefined {
  const otherSide = modelMap[field.type];
  // Find other side belongsTo field when in bi direction connection
  const otherSideBelongsToField = getOtherSideBelongsToField(model.name, otherSide);
  if (field.isList || (otherSideBelongsToField && otherSideBelongsToField.isList)) {
    throw new Error("A hasOne relationship should be 1:1, no lists");
  }

  const connectionFields = connectionDirective.arguments.fields || [];
  const references = connectionDirective.arguments.references || [];

  if (connectionFields.length > 0 && references.length > 0) {
    throw new Error(fieldsAndReferencesErrorMessage);
  }

  let associatedWithFields;
  if (references.length > 0) {
    // native uses the connected field instead of associatedWithFields
    // when using references associatedWithFields and associatedWithNative are not the same
    // getConnectedFieldV2 also ensures there is a matching belongsTo field with references
    const associatedWithNative = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
    associatedWithFields = references.map((reference: string) => otherSide.fields.find((field) => reference === field.name))
    return {
      kind: CodeGenConnectionType.HAS_ONE,
      associatedWith: associatedWithFields[0],
      associatedWithFields,
      associatedWithNative,
      connectedModel: otherSide,
      isConnectingFieldAutoCreated: false,
    };
  } else if (isCustomPKEnabled) {
    associatedWithFields = getConnectedFieldsForHasOne(otherSideBelongsToField, otherSide, shouldUseFieldsInAssociatedWithInHasOne);
  } else {
    const otherSideField = getConnectedFieldV2(field, model, otherSide, connectionDirective.name);
    associatedWithFields = [otherSideField];
  }

  // TODO: Update comment, graphql-connection-transformer is the v1 package and this file is created for vNext
  // if a type is connected using name, then graphql-connection-transformer adds a field to
  //  track the connection and that field is not part of the selection set
  // but if the field are connected using fields argument in connection directive
  // we are reusing the field and it should be preserved in selection set
  const isConnectingFieldAutoCreated = connectionFields.length === 0;
  // New metada type introduced by custom PK v2 support
  const targetNames = connectionFields.length > 0
    ? [ ...connectionFields ]
    : (isCustomPKEnabled
      ? getModelPrimaryKeyComponentFields(otherSide).map(componentField => makeConnectionAttributeName(model.name, field.name, componentField.name))
      : [makeConnectionAttributeName(model.name, field.name)])
  return {
    kind: CodeGenConnectionType.HAS_ONE,
    associatedWith: associatedWithFields[0],
    associatedWithFields,
    connectedModel: otherSide,
    isConnectingFieldAutoCreated,
    targetName: targetNames[0],
    targetNames,
  };
}

/**
 * Get connected fields for hasOne relation
 * @param otherSideBelongsToField belongsTo field on other side
 * @param otherSide other side model of hasOne connection
 * @param shouldUseFieldsInAssociatedWithInHasOne Return the connected fields instead of the connected model
 * @returns Array of connected fields. Return belongsTo field when in bi direction connenction. Otherwise return child pk and sk fields
 */
export function getConnectedFieldsForHasOne(otherSideBelongsToField: CodeGenField | undefined, otherSide: CodeGenModel, shouldUseFieldsInAssociatedWithInHasOne: boolean = false): CodeGenField[] {
  return (!shouldUseFieldsInAssociatedWithInHasOne && otherSideBelongsToField) ? [otherSideBelongsToField] : getModelPrimaryKeyComponentFields(otherSide);
}
