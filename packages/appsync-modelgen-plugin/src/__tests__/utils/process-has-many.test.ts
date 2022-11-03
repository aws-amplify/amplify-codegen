import { CodeGenConnectionType, CodeGenFieldConnectionHasMany } from '../../utils/process-connections';
import { hasManyHasImplicitKey, addHasManyKey } from '../../utils/process-has-many';
import { CodeGenField, CodeGenModel } from '../../visitors/appsync-visitor';

describe('hasManyHasImplicitKey', () => {
  it('returns true for implicit primary key, no belongsTo', () => {
    /**
     * Example using the following schema:
     *
     * type Foo @model {
     *   id: ID!
     *   bar: [Bar] @hasMany
     * }
     *
     * type Bar @model {
     *   id: ID!
     * }
     */
    const hasManyField: CodeGenField = {
      name: 'bar',
      type: 'Bar',
      isList: true,
      isNullable: true,
      directives: [{ name: 'hasMany', arguments: {} }],
    };
    const fooModel: CodeGenModel = {
      name: 'Foo',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        hasManyField,
      ],
    };
    const associationField: CodeGenField = {
      name: 'fooBarsId',
      type: 'ID',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        associationField,
      ],
    }
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationField,
      associatedWithFields: [associationField],
    };
    expect(hasManyHasImplicitKey(hasManyField, fooModel, connection)).toBeTruthy();
  });

  it('returns false for implicit primary key with belongsTo', () => {
    /**
     * Example using the following schema:
     *
     * type Foo @model {
     *   id: ID!
     *   bar: [Bar] @hasMany
     * }
     *
     * type Bar @model {
     *   id: ID!
     *   foo: Foo @belongsTo
     * }
     */
    const hasManyField: CodeGenField = {
      name: 'bar',
      type: 'Bar',
      isList: true,
      isNullable: true,
      directives: [{ name: 'hasMany', arguments: {} }],
    }
    const fooModel: CodeGenModel = {
      name: 'Foo',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        hasManyField,
      ],
    };
    const associationField: CodeGenField = {
      name: 'fooBarsId',
      type: 'ID',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        {
          name: 'foo',
          type: 'Foo',
          isList: false,
          isNullable: true,
          directives: [{ name: 'belongsTo', arguments: {} }],
        },
        associationField,
      ],
    }
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationField,
      associatedWithFields: [associationField],
    };
    expect(hasManyHasImplicitKey(hasManyField, fooModel, connection)).toBeFalsy();
  });

  it('returns false for explicit index and id', () => {
    /**
     * Example using the following schema:
     *
     * type Foo @model {
     *   id: ID!
     *   bar: [Bar] @hasMany(indexName: "byFoo", fields: ["id"])
     * }
     *
     * type Bar @model {
     *   id: ID!
     *   fooId: ID @index(name: "byFoo")
     * }
     */
    const hasManyField: CodeGenField = {
      name: 'bar',
      type: 'Bar',
      isList: true,
      isNullable: true,
      directives: [{ name: 'hasMany', arguments: { indexName: 'byFoo', fields: ['id'] } }],
    };
    const fooModel: CodeGenModel = {
      name: 'Foo',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        hasManyField,
      ],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        {
          name: 'fooId',
          type: 'ID',
          isList: false,
          isNullable: true,
          directives: [{ name: 'index', arguments: { name: 'byFoo' } }],
        },
      ],
    }
    const associationField: CodeGenField = {
      type: 'ID',
      isList: false,
      isNullable: false,
      name: 'id',
      directives: [],
    };
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationField,
      associatedWithFields: [associationField],
    };
    expect(hasManyHasImplicitKey(hasManyField, fooModel, connection)).toBeFalsy();
  });
});

describe('addHasManyKey', () => {
  it('adds a key for implicit primary key', () => {
    /**
     * Example using the following schema:
     *
     * type Foo @model {
     *   id: ID!
     *   bar: [Bar] @hasMany
     * }
     *
     * type Bar @model {
     *   id: ID!
     * }
     */
    const associationField: CodeGenField = {
      name: 'fooBarsId',
      type: 'ID',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        associationField,
      ],
    }
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationField,
      associatedWithFields: [associationField],
    };
    const expectedKeyDirective = { name: 'key', arguments: { name: 'gsi-Bar.fooBarsId', fields: ['fooBarsId'] } };

    addHasManyKey(connection);
    expect(barModel.directives).toEqual(expect.arrayContaining([expectedKeyDirective]));
  });

  it('adds a key composite primary key', () => {
    /**
     * Example using the following schema:
     *
     * type Foo @model {
     *   id: ID! @primaryKey(sortKeyFields: ["warehouseId"])
     *   warehouseId: String!
     *   bar: [Bar] @hasMany
     * }
     *
     * type Bar @model {
     *   id: ID!
     * }
     */
    const associationFieldPartitionKey: CodeGenField = {
      name: 'fooBarsId',
      type: 'ID',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const associationFieldSortKey: CodeGenField = {
      name: 'fooBarsWarehouseId',
      type: 'String',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        associationFieldPartitionKey,
        associationFieldSortKey,
      ],
    }
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationFieldPartitionKey,
      associatedWithFields: [associationFieldPartitionKey, associationFieldSortKey],
    };
    const expectedKeyDirective = { name: 'key', arguments: { name: 'gsi-Bar.fooBarsId', fields: ['fooBarsId', 'fooBarsWarehouseId'] } };

    addHasManyKey(connection);
    expect(barModel.directives).toEqual(expect.arrayContaining([expectedKeyDirective]));
  });

  it('works with non-cpk fallback connection', () => {
    const associationField: CodeGenField = {
      name: 'fooBarsId',
      type: 'ID',
      isList: false,
      isNullable: true,
      directives: [],
    };
    const barModel: CodeGenModel = {
      name: 'Bar',
      type: 'model',
      directives: [
        { name: 'model', arguments: {} },
      ],
      fields: [
        {
          name: 'id',
          type: 'ID',
          isList: false,
          isNullable: false,
          directives: [],
        },
        associationField,
      ],
    }
    const connection: CodeGenFieldConnectionHasMany = {
      kind: CodeGenConnectionType.HAS_MANY,
      connectedModel: barModel,
      isConnectingFieldAutoCreated: true,
      associatedWith: associationField,
      associatedWithFields: [],
    };
    const expectedKeyDirective = { name: 'key', arguments: { name: 'gsi-Bar.fooBarsId', fields: ['fooBarsId'] } };

    addHasManyKey(connection);
    expect(barModel.directives).toEqual(expect.arrayContaining([expectedKeyDirective]));
  });
});
