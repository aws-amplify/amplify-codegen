import { CodeGenDirective, CodeGenField, CodeGenModel, CodeGenMutation, CodeGenQuery } from '../visitors/appsync-visitor';
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

export const getDirectives = (fieldOrModel: CodeGenField | CodeGenModel) => (directiveName: string): CodeGenDirective[] | undefined =>
  fieldOrModel.directives.filter(d => d.name === directiveName);

// Function matching to GraphQL transformer so that the auto-generated field
export function toCamelCase(words: string[]): string {
  const formatted = words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)));
  return formatted.join('');
}

export function getOtherSideBelongsToField(type: string, otherSideModel: CodeGenModel): CodeGenField | undefined {
  return otherSideModel.fields.filter(f => f.type === type).find(f => f.directives.find(d => d.name === TransformerV2DirectiveName.BELONGS_TO));
}

/**
 * Given a model, it returns the primary and sort key fields if present, an empty list otherwise.
 * @param model Codegen Model object
 * @returns Array of primary and sort key codegen fields if present or an empty list
 */
export function getModelPrimaryKeyComponentFields(model: CodeGenModel): CodeGenField[] {
  const primaryKeyField = model.fields.find(field => field.primaryKeyInfo);
  const keyFields: CodeGenField[] = [];
  if (primaryKeyField) {
    keyFields.push(primaryKeyField);
    if ( primaryKeyField?.primaryKeyInfo?.sortKeyFields ) {
      keyFields.push(...primaryKeyField.primaryKeyInfo.sortKeyFields);
    };
  }
  return keyFields;
}

/**
 * Checks if a given mutation field contains the @conversation directive.
 *
 * @param {CodeGenMutation} queryField - The mutation field to check.
 * @returns {boolean} True if the mutation field contains the @conversation directive, false otherwise.
 */
export function containsConversationDirective(queryField: CodeGenMutation): boolean {
  return queryField.directives.some((directive) => directive.name === TransformerV2DirectiveName.CONVERSATION);
}

/**
 * Checks if a given query field contains the @generation directive.
 *
 * @param {CodeGenQuery} queryField - The query field to check.
 * @returns {boolean} True if the query field contains the @generation directive, false otherwise.
 */
export function containsGenerationDirective(queryField: CodeGenQuery): boolean {
  return queryField.directives.some((directive) => directive.name === TransformerV2DirectiveName.GENERATION);
}