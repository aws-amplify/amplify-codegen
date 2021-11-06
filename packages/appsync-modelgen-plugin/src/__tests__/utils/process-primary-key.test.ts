import { processPrimaryKey } from '../../utils/process-primary-key';
import { CodeGenModel } from '../../visitors/appsync-visitor';

describe('processPrimaryKey', () => {
  it('adds compound @primaryKey directive as model key attributes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: {},
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
        arguments: {},
      },
      {
        name: 'key',
        arguments: {
          fields: ['primaryField', 'sortField'],
        },
      },
    ]);
  });

  it('adds simple @primaryKey directive as model key attributes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: {},
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
        arguments: {},
      },
      {
        name: 'key',
        arguments: {
          fields: ['primaryField'],
        },
      },
    ]);
  });

  it('does nothing if no @primaryKey directive in model', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: {},
        },
      ],
      name: 'testModel',
      type: 'model',
      fields: [
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'normalField',
          directives: [],
        },
      ],
    };
    processPrimaryKey(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: {},
      },
    ]);
  });
});
