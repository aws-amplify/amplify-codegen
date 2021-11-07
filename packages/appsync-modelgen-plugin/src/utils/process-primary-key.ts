import { CodeGenModel } from '../visitors/appsync-visitor';
import { getDirective } from './fieldUtils';

/**
 * Maps @primaryKey directives back to how they would be represented with the old @key directive
 * @param model The model to translate
 */
export const processPrimaryKey = (model: CodeGenModel) => {
  const alreadyHasPrimaryKeySanityCheck = model.directives.some(
    directive => directive.name === 'key' && directive.arguments.name === undefined,
  );
  if (alreadyHasPrimaryKeySanityCheck) {
    return;
  }
  const primaryKeyField = model.fields.find(field => getDirective(field)('primaryKey'));
  if (!primaryKeyField) {
    return;
  }
  const primaryKeyDirective = getDirective(primaryKeyField)('primaryKey')!;
  model.directives.push({
    name: 'key',
    arguments: {
      fields: [primaryKeyField.name].concat((primaryKeyDirective.arguments.sortKeyFields as string[]) ?? []),
    },
  });
};
