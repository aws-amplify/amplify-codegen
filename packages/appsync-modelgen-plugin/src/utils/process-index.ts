import { CodeGenDirective, CodeGenModel } from '../visitors/appsync-visitor';
import { getDirective } from './fieldUtils';

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
      name: directive.arguments.name,
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
