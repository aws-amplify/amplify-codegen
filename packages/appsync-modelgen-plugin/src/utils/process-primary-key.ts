import { CodeGenModel } from '../visitors/appsync-visitor';
import { getDirective } from './fieldUtils';

export const processPrimaryKey = (model: CodeGenModel) => {
  const primaryKeyField = model.fields.find(field => getDirective(field)('primaryKey'));
  if (!primaryKeyField) {
    return;
  }
  const primaryKeyDirective = getDirective(primaryKeyField)('primaryKey')!;
  model.directives.push({
    name: 'key',
    arguments: {
      name: primaryKeyDirective.arguments.name,
      fields: [primaryKeyField.name].concat((primaryKeyDirective.arguments.sortKeyFields as string[]) ?? []),
    },
  });
};
