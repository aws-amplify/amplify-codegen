import { processIndex } from '../../utils/process-index';
import { CodeGenModel } from '../../visitors/appsync-visitor';

describe('processIndex', () => {
  it('adds multiple compound @index directives as model key attributes', () => {
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
          name: 'connectionField',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byItem',
                sortKeyFields: ['sortField'],
              },
            },
          ],
        },
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'anotherConnection',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byAnother',
                sortKeyFields: ['anotherSortField'],
              },
            },
          ],
        },
      ],
    };
    processIndex(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: {},
      },
      {
        name: 'key',
        arguments: {
          name: 'byItem',
          fields: ['connectionField', 'sortField'],
        },
      },
      {
        name: 'key',
        arguments: {
          name: 'byAnother',
          fields: ['anotherConnection', 'anotherSortField'],
        },
      },
    ]);
  });

  it('adds simple @index directives as model key attributes', () => {
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
          name: 'connectionField',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byItem',
              },
            },
          ],
        },
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'anotherConnection',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byAnother',
              },
            },
          ],
        },
      ],
    };
    processIndex(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: {},
      },
      {
        name: 'key',
        arguments: {
          name: 'byItem',
          fields: ['connectionField'],
        },
      },
      {
        name: 'key',
        arguments: {
          name: 'byAnother',
          fields: ['anotherConnection'],
        },
      },
    ]);
  });

  it('does nothing if no @index directives in model', () => {
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
          name: 'aNormalField',
          directives: [],
        },
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'anotherNormalField',
          directives: [],
        },
      ],
    };
    processIndex(model);
    expect(model.directives).toEqual([
      {
        name: 'model',
        arguments: {},
      },
    ]);
  });

  it('does not add duplicate indexes', () => {
    const model: CodeGenModel = {
      directives: [
        {
          name: 'model',
          arguments: {},
        },
        {
          name: 'key',
          arguments: {
            name: 'byItem',
            fields: ['connectionField'],
          },
        },
      ],
      name: 'testModel',
      type: 'model',
      fields: [
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'connectionField',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byItem',
              },
            },
          ],
        },
        {
          type: 'field',
          isList: false,
          isNullable: true,
          name: 'anotherConnection',
          directives: [
            {
              name: 'index',
              arguments: {
                name: 'byAnother',
              },
            },
          ],
        },
      ],
    };
    processIndex(model);
    expect(model.directives.length).toBe(3);
  });
});
