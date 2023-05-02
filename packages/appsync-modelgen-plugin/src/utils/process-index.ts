import { CodeGenDirective, CodeGenModel } from '../visitors/appsync-visitor';
import { getDirective } from './fieldUtils';
import pluralize from 'pluralize';
import { toLower, toUpper } from './stringUtils';

/**
 * Maps @index directives back to how they would be represented with the old @key directive
 * @param model The model to process
 */
export const processIndex = (model: CodeGenModel) => {
  const indexMap = model.fields.reduce((acc, field) => {
    const indexDirective = getDirective(field)('index');
    if (!indexDirective) {
      return acc;
    }
    return { ...acc, [field.name]: indexDirective };
  }, {} as Record<string, CodeGenDirective>);

  const keyList: CodeGenDirective[] = Object.entries(indexMap).map(([fieldName, directive]) => ({
    name: 'key',
    arguments: {
      name: directive.arguments.name ?? generateDefaultIndexName(model.name, [fieldName].concat((directive.arguments.sortKeyFields as string[]) ?? [])),
      queryField: directive.arguments.queryField,
      fields: [fieldName].concat((directive.arguments.sortKeyFields as string[]) ?? []),
    },
  }));
  const existingIndexNames = model.directives
    .filter(directive => directive.name === 'key' && !!directive.arguments.name)
    .map(directive => directive.arguments.name);
  const deDupedKeyList = keyList.filter(key => !existingIndexNames.includes(key.arguments.name));
  model.directives.push(...deDupedKeyList);
};

/*
 * Accepts a model and field name, and potentially empty list of sortKeyFields to generate a unique index name.
 * e.g. modelName = Employee, fieldName = manager, sortKeyFields = [level]
 * will generate a name like employeesByManagerAndLevel.
 * (This naming logic is used to generate a default index name for @index directives that don't have a name argument).
 * Refer https://github.com/aws-amplify/amplify-category-api/blob/main/packages/amplify-graphql-index-transformer/src/utils.ts
 */
export const generateDefaultIndexName = (modelName: string, fieldNames: string[]): string => {
  return `${toLower(pluralize(modelName))}By${fieldNames.map(toUpper).join('And')}`;
};
