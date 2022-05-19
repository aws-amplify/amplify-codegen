import { CodeGenField, CodeGenModel } from "../visitors/appsync-visitor";

export function getModelPrimaryKeyComponentFields(model: CodeGenModel): CodeGenField[] {
  const primaryKeyField = model.fields.find(field => field.primaryKeyInfo)!;
  const { sortKeyFields } = primaryKeyField.primaryKeyInfo!;
  return [ primaryKeyField, ...sortKeyFields ];
}