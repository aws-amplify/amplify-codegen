import { CodeGenDirective, CodeGenField, CodeGenModel } from '../visitors/appsync-visitor';
import { TransformerV2DirectiveName } from './constants';

export function addFieldToModel(model: CodeGenModel, field: CodeGenField): void {
  const existingField = model.fields.find(f => f.name === field.name);
  if (!existingField) {
    model.fields.push(field);
  }
}

export function removeFieldFromModel(model: CodeGenModel, fieldName: string): void {
  model.fields = model.fields.filter(field => field.name !== fieldName);
}

export const getDirective = (fieldOrModel: CodeGenField | CodeGenModel) => (directiveName: string): CodeGenDirective | undefined =>
  fieldOrModel.directives.find(d => d.name === directiveName);

// Function matching to GraphQL transformer so that the auto-generated field
export function toCamelCase(words: string[]): string {
  const formatted = words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)));
  return formatted.join('');
}

export function getOtherSideBelongsToField(type: string, otherSideModel: CodeGenModel): CodeGenField | undefined {
  return otherSideModel.fields.filter(f => f.type === type).find(f => f.directives.find(d => d.name === TransformerV2DirectiveName.BELONGS_TO));
}

/**
 * Given a model, it returns the primary and sort key fields if present, throws meaningful error otherwise.
 * @param model Codegen Model object
 * @returns Array of primary and sort key codegen fields
 */
export function getModelPrimaryKeyComponentFields(model: CodeGenModel): CodeGenField[] {
  const primaryKeyField = model.fields.find(field => field.primaryKeyInfo);
  if (primaryKeyField && primaryKeyField?.primaryKeyInfo) {
    const { sortKeyFields } = primaryKeyField.primaryKeyInfo;
    return [ primaryKeyField, ...sortKeyFields ];
  }

  throw new Error(`Unable to get the primary key component fields for model ${model?.name}`);
}