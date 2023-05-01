import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLInterfaceType, GraphQLUnionType, GraphQLFloat } from 'graphql';

import getFields from '../../src/generator/getFields';
import getFragment from '../../src/generator/getFragment';
import getType from '../../src/generator/utils/getType';

jest.mock('../../src/generator/getFragment');
describe('getField', () => {
  const nestedType = new GraphQLObjectType({
    name: 'NestedObject',
    fields: () => ({
      level: { type: GraphQLInt },
      subObj: { type: nestedType },
    }),
  });

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        foo: { type: GraphQLInt },
        nested: { type: nestedType },
      },
    }),
  });

  it('should support simple scalar', () => {
    const queries = schema.getQueryType().getFields();
    expect(getFields(queries.foo, schema, 3, { useExternalFragmentForS3Object: false, typenameIntrospection: true })).toEqual({
      name: 'foo',
      fields: [],
      fragments: [],
      hasBody: false,
    });
    expect(getFragment).not.toHaveBeenCalled();
  });

  it('it should recursively resolve fields up to max depth', () => {
    const queries = schema.getQueryType().getFields();
    expect(getFields(queries.nested, schema, 2, { useExternalFragmentForS3Object: false, typenameIntrospection: true })).toEqual({
      name: 'nested',
      fields: [
        {
          name: 'level',
          fields: [],
          fragments: [],
          hasBody: false,
        },
        {
          name: 'subObj',
          fields: [
            {
              name: 'level',
              fields: [],
              fragments: [],
              hasBody: false,
            },
            {
              name: '__typename',
              fields: [],
              fragments: [],
              hasBody: false,
            },
          ],
          fragments: [],
          hasBody: true,
        },
        {
          name: '__typename',
          fields: [],
          fragments: [],
          hasBody: false,
        },
      ],
      fragments: [],
      hasBody: true,
    });
  });

  it('it should recorsively resolve fields without typename when typenameIntrospection is disabled', () => {
    const queries = schema.getQueryType().getFields();
    expect(getFields(queries.nested, schema, 2, { useExternalFragmentForS3Object: false, typenameIntrospection: false })).toEqual({
      name: 'nested',
      fields: [
        {
          name: 'level',
          fields: [],
          fragments: [],
          hasBody: false,
        },
        {
          name: 'subObj',
          fields: [
            {
              name: 'level',
              fields: [],
              fragments: [],
              hasBody: false,
            },
          ],
          fragments: [],
          hasBody: true,
        },
      ],
      fragments: [],
      hasBody: true,
    });
  });

  it('should not return anything for complex type when the depth is < 1', () => {
    const queries = schema.getQueryType().getFields();
    expect(getFields(queries.nested, schema, 0, { useExternalFragmentForS3Object: false, typenameIntrospection: true })).toBeUndefined();
  });
  describe('When type is an Interface', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    const shapeInterfaceType = new GraphQLInterfaceType({
      name: 'Entity',
      fields: {
        name: { type: GraphQLString },
      },
    });
    const rectangleType = new GraphQLObjectType({
      name: 'Rectangle',
      fields: {
        name: { type: GraphQLString },
        length: { type: GraphQLInt },
        width: { type: GraphQLInt },
      },
      interfaces: () => [shapeInterfaceType],
    });

    const circleType = new GraphQLObjectType({
      name: 'Circle',
      fields: {
        name: { type: GraphQLString },
        radius: { type: GraphQLInt },
      },
      interfaces: () => [shapeInterfaceType],
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          shapeInterface: { type: shapeInterfaceType },
        },
      }),
      types: [circleType, rectangleType],
    });

    it('interface - should return fragments of all the implementations', () => {
      const maxDepth = 2;
      const getPossibleTypeSpy = jest.spyOn(schema, 'getPossibleTypes');
      getFields(schema.getQueryType().getFields().shapeInterface, schema, maxDepth, {
        useExternalFragmentForS3Object: false,
        typenameIntrospection: true,
      });
      expect(getPossibleTypeSpy).toHaveBeenCalled();
      expect(getFragment).toHaveBeenCalled();

      const commonField = {
        name: 'name',
        fragments: [],
        hasBody: false,
        fields: [],
      };

      expect(getFragment.mock.calls[0][0]).toEqual(circleType);
      expect(getFragment.mock.calls[0][1]).toEqual(schema);
      expect(getFragment.mock.calls[0][2]).toEqual(maxDepth);
      expect(getFragment.mock.calls[0][3]).toEqual([commonField]);

      expect(getFragment.mock.calls[1][0]).toEqual(rectangleType);
      expect(getFragment.mock.calls[1][1]).toEqual(schema);
      expect(getFragment.mock.calls[1][2]).toEqual(maxDepth);
      expect(getFragment.mock.calls[1][3]).toEqual([commonField]);
    });
  });
  describe('When type is an union', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    const rectangleType = new GraphQLObjectType({
      name: 'Rectangle',
      fields: {
        length: { type: GraphQLInt },
        width: { type: GraphQLInt },
      },
    });

    const circleType = new GraphQLObjectType({
      name: 'Circle',
      fields: {
        radius: { type: GraphQLInt },
      },
    });
    const shapeResultUnion = new GraphQLUnionType({
      name: 'ShapeResultUnion',
      types: [circleType, rectangleType],
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          shapeResult: { type: shapeResultUnion },
        },
      }),
    });

    it('union - should return fragments of all the types', () => {
      const maxDepth = 2;
      const getPossibleTypeSpy = jest.spyOn(schema, 'getPossibleTypes');
      getFields(schema.getQueryType().getFields().shapeResult, schema, maxDepth, {
        useExternalFragmentForS3Object: false,
        typenameIntrospection: true,
      });
      expect(getPossibleTypeSpy).toHaveBeenCalled();
      expect(getFragment).toHaveBeenCalled();

      const commonField = []; // unions don't have to have common field

      expect(getFragment.mock.calls[0][0]).toEqual(circleType);
      expect(getFragment.mock.calls[0][1]).toEqual(schema);
      expect(getFragment.mock.calls[0][2]).toEqual(maxDepth);
      expect(getFragment.mock.calls[0][3]).toEqual(commonField);

      expect(getFragment.mock.calls[1][0]).toEqual(rectangleType);
      expect(getFragment.mock.calls[1][1]).toEqual(schema);
      expect(getFragment.mock.calls[1][2]).toEqual(maxDepth);
      expect(getFragment.mock.calls[1][3]).toEqual(commonField);
    });
  });

  describe('aggregateItems should generate two additional levels', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    const aggregateScalarResult = new GraphQLObjectType({
      name: 'SearchableAggregateScalarResult',
      fields: {
        value: { type: GraphQLFloat },
      },
    });

    const aggregateBucketResultItem = new GraphQLObjectType({
      name: 'SearchableAggregateBucketResultItem',
      fields: {
        key: { type: GraphQLString },
        doc_count: { type: GraphQLInt },
      },
    });

    const aggregateBucketResult = new GraphQLObjectType({
      name: 'SearchableAggregateBucketResult',
      fields: {
        buckets: { type: aggregateBucketResultItem },
      },
    });

    const aggregateResult = new GraphQLUnionType({
      name: 'SearchableAggregateGenericResult',
      types: [aggregateScalarResult, aggregateBucketResult],
    });

    const aggregateItemsObject = new GraphQLObjectType({
      name: 'SearchableAggregateResult',
      fields: {
        name: { type: GraphQLString },
        result: { type: aggregateResult },
      },
    });

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          aggregateItems: { type: aggregateItemsObject },
        },
      }),
    });

    it('aggregateItems property should traverse two additional levels to generate required fields with default depth 2', () => {
      const maxDepth = 2;
      const getPossibleTypeSpy = jest.spyOn(schema, 'getPossibleTypes');
      getFields(schema.getQueryType().getFields().aggregateItems, schema, maxDepth, {
        useExternalFragmentForS3Object: false,
        typenameIntrospection: true,
      });
      expect(getPossibleTypeSpy).toHaveBeenCalled();
      expect(getFragment).toHaveBeenCalled();

      const commonField = []; // unions don't have to have common field

      expect(getFragment.mock.calls[0][0]).toEqual(aggregateScalarResult);
      expect(getFragment.mock.calls[0][1]).toEqual(schema);
      expect(getFragment.mock.calls[0][2]).toEqual(maxDepth - 1);
      expect(getFragment.mock.calls[0][3]).toEqual(commonField);

      expect(getFragment.mock.calls[1][0]).toEqual(aggregateBucketResult);
      expect(getFragment.mock.calls[1][1]).toEqual(schema);
      expect(getFragment.mock.calls[1][2]).toEqual(maxDepth - 1);
      expect(getFragment.mock.calls[1][3]).toEqual(commonField);
    });
  });
});
