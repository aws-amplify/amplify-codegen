import { CodeGenDirective, CodeGenField, CodeGenModel } from '../visitors/appsync-visitor';
import { TransformerV2DiretiveName } from './constants';

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

export const getOtherSideBelongsToFieldName = (type: string, otherSideModel: CodeGenModel): string | undefined =>
  otherSideModel.fields.filter(f => f.type === type).find(f => f.directives.find(d => d.name === TransformerV2DiretiveName.BELONGS_TO))?.name;