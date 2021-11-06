import { processPrimaryKey } from '../../utils/process-primary-key';
import { CodeGenModel } from '../../visitors/appsync-visitor';

describe('processPrimaryKey', () => {
  it('should add compound @primaryKey directive as model key attributes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: [],
        },
      ],
      name: 'testModel',
      type: 'model',
      fields: [
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'primaryField',
          directives: [
            {
              name: 'primaryKey',
              arguments: {
                sortKeyFields: ['sortField'],
              },
            },
          ],
        },
      ],
    };
    processPrimaryKey(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: [],
      },
      {
        name: 'key',
        arguments: {
          fields: ['primaryField', 'sortField'],
        },
      },
    ]);
  });

  it('should add simple @primaryKey directive as model key attributes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: [],
        },
      ],
      name: 'testModel',
      type: 'model',
      fields: [
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'primaryField',
          directives: [
            {
              name: 'primaryKey',
              arguments: {},
            },
          ],
        },
      ],
    };
    processPrimaryKey(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: [],
      },
      {
        name: 'key',
        arguments: {
          fields: ['primaryField'],
        },
      },
    ]);
  });
});
