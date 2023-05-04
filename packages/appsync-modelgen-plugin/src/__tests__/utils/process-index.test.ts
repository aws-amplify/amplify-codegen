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

  it('should generate a default name to @index directive', () => {
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
              arguments: {},
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
              arguments: {},
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
          name: 'testModelsByConnectionField',
          fields: ['connectionField'],
          queryField: undefined,
        },
      },
      {
        name: 'key',
        arguments: {
          name: 'testModelsByAnotherConnection',
          fields: ['anotherConnection'],
          queryField: undefined,
        },
      },
    ]);
  });

  it('should generate a default name to @index directive with sortkeys', () => {
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
                sortKeyFields: ['sortField1', 'sortField2'],
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
          name: 'testModelsByConnectionFieldAndSortField',
          fields: ['connectionField', 'sortField'],
          queryField: undefined, 
        },
      },
      {
        name: 'key',
        arguments: {
          name: 'testModelsByAnotherConnectionAndSortField1AndSortField2',
          fields: ['anotherConnection', 'sortField1', 'sortField2'],
          queryField: undefined,
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

  it('adds index with queryFields', () => {
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
          name: 'testField',
          directives: [
            {
              name: 'index',
              arguments: {
                queryField: 'myQuery',
                name: 'byItem',
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
          queryField: 'myQuery',
          fields: ['testField'],
        },
      },
    ]);
  });
});
