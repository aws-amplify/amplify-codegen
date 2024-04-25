import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { METADATA_SCALAR_MAP } from '../../scalars';
import { AppSyncDirectives, DefaultDirectives, V1Directives, DeprecatedDirective, Directive } from '@aws-amplify/graphql-directives';
import { scalars } from '../../scalars/supported-scalars';
import { AppSyncModelIntrospectionVisitor } from '../../visitors/appsync-model-introspection-visitor';

const defaultModelIntropectionVisitorSettings = {
  isTimestampFieldsAdded: true,
  respectPrimaryKeyAttributesOnConnectionField: false,
  transformerVersion: 2
}

const buildSchemaWithDirectives = (schema: String, directives: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (schema: string, settings: any = {}, directives: readonly Directive[] = DefaultDirectives): AppSyncModelIntrospectionVisitor => {
  const visitorConfig = { ...defaultModelIntropectionVisitorSettings, ...settings }
  const ast = parse(schema);
  const stringDirectives = directives.map(directive => directive.definition).join('\n');
  const builtSchema = buildSchemaWithDirectives(schema, stringDirectives);
  const visitor = new AppSyncModelIntrospectionVisitor(
    builtSchema,
    { directives: stringDirectives, scalars: METADATA_SCALAR_MAP, ...visitorConfig, target: 'introspection' },
    {},
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('Model Introspection Visitor', () => {
  const schema = /* GraphQL */ `
    type SimpleModel @model {
      id: ID!
      name: String
      bar: String
      children: [Child] @hasMany
      ssn: SSN @hasOne
    }
    type Child @model {
      id: ID!
      parent: SimpleModel @belongsTo
    }
    type SSN @model {
      id: ID!
      user: SimpleModel @belongsTo
    }
    enum SimpleEnum {
      enumVal1
      enumVal2
    }
    type SimpleNonModelType {
      id: ID!
      names: [String]
    }
    input SimpleInput {
      name: String
    }
    interface SimpleInterface {
      firstName: String!
    }
    union SimpleUnion = SimpleModel | SimpleEnum | SimpleNonModelType | SimpleInput | SimpleInterface
  `;
  const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
  describe('getType', () => {
    it('should return model type for Models', () => {
      expect((visitor as any).getType('SimpleModel')).toEqual({ model: 'SimpleModel' });
    });

    it('should return EnumType for Enum', () => {
      expect((visitor as any).getType('SimpleEnum')).toEqual({ enum: 'SimpleEnum' });
    });

    it('should return NonModel type for Non-model', () => {
      expect((visitor as any).getType('SimpleNonModelType')).toEqual({ nonModel: 'SimpleNonModelType' });
    });

    it('should return input type for Input', () => {
      expect((visitor as any).getType('SimpleInput')).toEqual({ input: 'SimpleInput' });
    });

    it('should return union type for Union', () => {
      expect((visitor as any).getType('SimpleUnion')).toEqual({ union: 'SimpleUnion' });
    });

    it('should return interface type for Interface', () => {
      expect((visitor as any).getType('SimpleInterface')).toEqual({ interface: 'SimpleInterface' });
    });

    it('should throw error for unknown type', () => {
      expect(() => (visitor as any).getType('unknown')).toThrowError('Unknown type');
    });
  });
  describe('Metadata snapshot', () => {
    it('should generate correct model intropection file validated by JSON schema', () => {
      expect(visitor.generate()).toMatchSnapshot();
    });
  });
});

describe('Custom primary key tests', () => {
  const schema = /* GraphQL */ `
    type Project1 @model {
      projectId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      team: Team1 @hasOne
    }
    type Team1 @model {
      teamId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      project: Project1 @belongsTo
    }
    type Project2 @model {
      projectId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      team: Team2 @hasOne
    }
    type Team2 @model {
      teamId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
    }
    type Project3 @model {
      projectId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      team: Team3 @hasOne(fields:["teamId", "teamName"])
      teamId: ID # customized foreign key for child primary key
      teamName: String # customized foreign key for child sort key
    }
    type Team3 @model {
      teamId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      project: Project3 @belongsTo(fields:["projectId", "projectName"])
      projectId: ID # customized foreign key for parent primary key
      projectName: String # customized foreign key for parent sort key
    }
    type Project4 @model {
      projectId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
      team: Team4 @hasOne(fields:["teamId", "teamName"])
      teamId: ID # customized foreign key for child primary key
      teamName: String # customized foreign key for child sort key
    }
    type Team4 @model {
      teamId: ID! @primaryKey(sortKeyFields:["name"])
      name: String!
    }
    type Post1 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment1] @hasMany
    }
    type Comment1 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      post: Post1 @belongsTo
    }
    type Post2 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment2] @hasMany
    }
    type Comment2 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
    }
    type Post3 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment3] @hasMany(indexName:"byPost", fields:["postId", "title"])
    }
    type Comment3 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      post: Post3 @belongsTo(fields:["postId", "postTitle"])
      postId: ID @index(name: "byPost", sortKeyFields:["postTitle"]) # customized foreign key for parent primary key
      postTitle: String # customized foreign key for parent sort key
    }
    type Post4 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment4] @hasMany(indexName:"byPost", fields:["postId", "title"])
    }
    type Comment4 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      postId: ID @index(name: "byPost", sortKeyFields:["postTitle"]) # customized foreign key for parent primary key
      postTitle: String # customized foreign key for parent sort key
    }
    type Post @model {
      customPostId: ID! @primaryKey(sortKeyFields: ["title"])
      title: String!
      content: String
      tags: [Tag] @manyToMany(relationName: "PostTags")
    }
    type Tag @model {
        customTagId: ID! @primaryKey(sortKeyFields: ["label"])
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
    }
  `;
  it('should generate correct model intropection file validated by JSON schema and not throw error when custom PK is enabled', () => {
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });
});

describe('Primary Key Info tests', () => {
  const schema = /* GraphQL */ `
    type Todo1 @model {
      todoId: ID! @primaryKey
    }
    type Todo2 @model {
      todoId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
    }
    type Todo3 @model {
      id: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
    }
    type Todo4 @model {
      title: String!
    }
    type Todo5 @model {
      id: ID! @primaryKey
    }
    type Todo6 @model {
      id: ID!
    }
  `;
  it('should generate correct primary key info for model with/without custom primary key', () => {
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  it('should retain order of targetNames and primaryKeyInfo.sortKeyFieldNames', () => {
    // Data Manager relies on this order matching
    const schema = /* GraphQL */ `
      type Enthusiast @model {
        id: ID! @primaryKey
        name: String!
        likes: [Like] @manyToMany(relationName: "EnthusiastLikes")
      }

      type Like @model {
        sortKeyFieldThree: String!
        value: String!
        name: String! @primaryKey(sortKeyFields: ["sortKeyFieldOne", "sortKeyFieldTwo", "sortKeyFieldThree"])
        sortKeyFieldOne: String!
        enthusiasts: [Enthusiast] @manyToMany(relationName: "EnthusiastLikes")
        sortKeyFieldTwo: String!
      }
    `;
    const result = JSON.parse(getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true }).generate());
    const { models: { Like, EnthusiastLikes } } = result;
    expect(result).toMatchSnapshot();
    
    // name
    expect(Like.primaryKeyInfo.primaryKeyFieldName).toEqual('name');
    expect(EnthusiastLikes.fields.like.association.targetNames[0]).toEqual('likeName');


    // sortKeyFieldOne
    expect(Like.primaryKeyInfo.sortKeyFieldNames[0]).toEqual('sortKeyFieldOne');
    expect(EnthusiastLikes.fields.like.association.targetNames[1]).toEqual('likesortKeyFieldOne');

    // sortKeyFieldTwo
    expect(Like.primaryKeyInfo.sortKeyFieldNames[1]).toEqual('sortKeyFieldTwo');
    expect(EnthusiastLikes.fields.like.association.targetNames[2]).toEqual('likesortKeyFieldTwo');

    // sortKeyFieldThree
    expect(Like.primaryKeyInfo.sortKeyFieldNames[2]).toEqual('sortKeyFieldThree');
    expect(EnthusiastLikes.fields.like.association.targetNames[3]).toEqual('likesortKeyFieldThree');
  });

});

describe('Primary key info within a belongsTo model tests', () => {
  const schema = /* GraphQL */ `
    type Post @model {
      postId: ID! @primaryKey
      node: PostNode! @belongsTo(fields: ["postId"])
      title: String!
    }
    type PostNode @model {
      id: ID!
      post: Post! @hasOne
    }
  `;
  it('should generate correct primary key info for model when the primary key field is part of belongsTo connection field and custom PK is disabled', () => {
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: false });
    expect(visitor.generate()).toMatchSnapshot();
  });
});

describe('schemas with pk on a belongsTo fk', () => {
  it('works for v1', () => {
    expect(getVisitor(/* GraphQL */ `
      type Blog @model {
        id: ID!
        title: String
        posts: [Post] @connection(fields: ["id"])
      }

      type Post @model @key(fields: ["blogId", "title", "description"]) {
        id: ID!
        blogId: ID!
        title: String!
        description: String!
        blog: Blog @connection(fields: ["blogId"])
      }
    `, {
      transformerVersion: 1,
      usePipelinedTransformer: false,
    }, [...AppSyncDirectives, ...V1Directives, DeprecatedDirective]).generate()).toMatchSnapshot();

  });

  it('works for v2', () => {
    expect(getVisitor(/* GraphQL */ `
      type Blog @model {
        id: ID!
        title: String
        posts: [Post] @hasMany(fields: ["id"])
      }

      type Post @model {
        id: ID!
        blogId: ID! @primaryKey(sortKeyFields: ["title", "description"])
        title: String!
        description: String!
        blog: Blog @belongsTo(fields: ["blogId"])
      }
    `, {
      transformerVersion: 2,
      usePipelinedTransformer: true,
    }).generate()).toMatchSnapshot();
  });
});

describe('Custom queries/mutations/subscriptions & input type tests', () => {
  const schema = /* GraphQL */ `
    input AMPLIFY { globalAuthRule: AuthRule = { allow: public } } # FOR TESTING ONLY!

    type Todo @model {
      id: ID!
      name: String!
      description: String
      phone: Phone
    }
    type Phone {
      number: String
    }
    enum BillingSource {
      CLIENT
      PROJECT
    }
    input CustomInput {
      customField1: String!
      customField2: Int
      customField3: NestedInput!
    }
    input NestedInput {
      content: String! = "hello"
    }
    interface ICustom {
      firstName: String!
      lastName: String
      birthdays: [INestedCustom!]!
    }
    interface INestedCustom {
      birthDay: AWSDate!
    }
    # The member types of a Union type must all be Object base types.
    union CustomUnion = Todo | Phone
    
    type Query {
      getAllTodo(msg: String, input: CustomInput): String
      echo(msg: String): String
      echo2(todoId: ID!): Todo
      echo3: [Todo!]!
      echo4(number: String): Phone
      echo5: [CustomUnion!]!
      echo6(customInput: CustomInput): String!
      echo7: [ICustom]!
      echo8(msg: [Float], msg2: [Int!], enumType: BillingSource, enumList: [BillingSource], inputType: [CustomInput]): [String]
      echo9(msg: [Float]!, msg2: [Int!]!, enumType: BillingSource!, enumList: [BillingSource!]!, inputType: [CustomInput!]!): [String!]!    
    }
    type Mutation {
      mutate(msg: [String!]!): Todo
      mutate2: [CustomUnion!]!
      mutate3: [ICustom]!
    }
    type Subscription {
      onMutate(msg: String): [Todo!]
      onMutate2: CustomUnion
      onMutate3: ICustom
    }
  `;
  it('should generate correct metadata for custom queries/mutations/subscriptions in model introspection schema', () => {
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });
});

describe('custom fields', () => {
  test('sets the association for fields for hasOne', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        relatedId: ID
        related: RelatedLegacy @hasOne(fields: [relatedId])
      }
      
      type RelatedLegacy @model {
        id: ID!
        primary: PrimaryLegacy @belongsTo
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association for fields for hasMany', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        relatedId: ID
        related: [RelatedLegacy] @hasMany(fields: [relatedId])
      }
      
      type RelatedLegacy @model {
        id: ID!
        primary: PrimaryLegacy @belongsTo
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association for fields for belongsTo with other side hasOne', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        related: RelatedLegacy @hasOne
      }
      
      type RelatedLegacy @model {
        id: ID!
        primaryId: ID!
        primary: PrimaryLegacy @belongsTo(fields: [primaryId])
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association for fields for belongsTo with other side hasMany', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        related: [RelatedLegacy] @hasMany
      }
      
      type RelatedLegacy @model {
        id: ID!
        primaryId: ID!
        primary: PrimaryLegacy @belongsTo(fields: [primaryId])
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association for fields for hasOne and belongsTo', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        relatedId: ID
        related: RelatedLegacy @hasOne(fields: [relatedId])
      }
      
      type RelatedLegacy @model {
        id: ID!
        primaryId: ID!
        primary: PrimaryLegacy @belongsTo(fields: [primaryId])
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association for fields for hasMany and belongsTo', () => {
    const schema = /* GraphQL */ `
      type PrimaryLegacy @model {
        id: ID!
        relatedId: ID
        related: [RelatedLegacy] @hasMany(fields: [relatedId])
      }
      
      type RelatedLegacy @model {
        id: ID!
        primaryId: ID!
        primary: PrimaryLegacy @belongsTo(fields: [primaryId])
      }
    `;
  });
});

describe('custom references', () => {
  test('sets the association to the references field for hasMany/belongsTo', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated!] @hasMany(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association to the references field for hasOne/belongsTo', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: SqlRelated @hasOne(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('sets the association to the references field for hasOne and hasMany', () => {
    const schema = /* GraphQL */ `
      type Primary @model {
        id: ID! @primaryKey
        relatedMany: [RelatedMany] @hasMany(references: ["primaryId"])
        relatedOne: RelatedOne @hasOne(references: ["primaryId"])
      }
      
      type RelatedMany @model {
        id: ID! @primaryKey
        primaryId: ID!
        primary: Primary @belongsTo(references: ["primaryId"])
      }
      
      type RelatedOne @model {
        id: ID! @primaryKey
        primaryId: ID!
        primary: Primary @belongsTo(references: ["primaryId"])
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('double linked references', () => {
    const schema = /* GraphQL */ `
      type Foo @model {
        id: ID!
        bar1: Bar @hasOne(references: ["bar1Id"])
        bar2: Bar @hasOne(references: ["bar2Id"])
      }
      
      type Bar @model {
        id: ID!
        bar1Id: ID
        bar2Id: ID
        foo1: Foo @belongsTo(references: ["bar1Id"])
        foo2: Foo @belongsTo(references: ["bar2Id"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('hasMany with sortKeyFields on primary key', () => {
    const schema = /* GraphQL */ `
      type Primary @model {
        tenantId: ID! @primaryKey(sortKeyFields: ["instanceId", "recordId"])
        instanceId: ID!
        recordId: ID!
        content: String
        related: [Related!] @hasMany(references: ["primaryTenantId", "primaryInstanceId", "primaryRecordId"])
      }
      
      type Related @model {
        content: String
        primaryTenantId: ID!
        primaryInstanceId: ID!
        primaryRecordId: ID!
        primary: Primary @belongsTo(references: ["primaryTenantId", "primaryInstanceId", "primaryRecordId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('hasOne with sortKeyFields on primary key', () => {
    const schema = /* GraphQL */ `
      type Primary @model {
        tenantId: ID! @primaryKey(sortKeyFields: ["instanceId", "recordId"])
        instanceId: ID!
        recordId: ID!
        content: String
        related: Related @hasOne(references: ["primaryTenantId", "primaryInstanceId", "primaryRecordId"])
      }
      
      type Related @model {
        content: String
        primaryTenantId: ID!
        primaryInstanceId: ID!
        primaryRecordId: ID!
        primary: Primary @belongsTo(references: ["primaryTenantId", "primaryInstanceId", "primaryRecordId"])
      }
    `;
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(visitor.generate()).toMatchSnapshot();
  });

  test('throws error when using fields and references on hasMany', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated!] @hasMany(references: ["primaryId"], fields: ["content"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`'fields' and 'references' cannot be used together.`);
  });

  test('throws error when using fields and references on belongsTo', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated!] @hasMany(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"], fields: ["content"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`'fields' and 'references' cannot be used together.`);
  });

  test('throws error when using fields and references on hasOne', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: SqlRelated @hasOne(references: ["primaryId"], fields: ["content"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`'fields' and 'references' cannot be used together.`);
  });

  test('throws error when missing references on hasOne related model', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: SqlRelated @hasOne(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`Error processing @hasOne directive on SqlPrimary.related. @belongsTo directive with references ["primaryId"] was not found in connected model SqlRelated`);
  });

  test('throws error when missing references on hasOne primary model', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: SqlRelated @hasOne
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`Error processing @belongsTo directive on SqlRelated.primary. @hasOne or @hasMany directive with references ["primaryId"] was not found in connected model SqlPrimary`);
  });

  test('throws error when missing references on hasMany related model when custom pk is disabled', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated] @hasMany(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: false });
    expect(() => visitor.generate())
      .toThrowError(`Error processing @hasMany directive on SqlPrimary.related. @belongsTo directive with references ["primaryId"] was not found in connected model SqlRelated`);
  });


  test('throws error when missing references on hasMany related model', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated] @hasMany(references: ["primaryId"])
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`Error processing @hasMany directive on SqlPrimary.related. @belongsTo directive with references ["primaryId"] was not found in connected model SqlRelated`);
  });

  test('throws error when missing references on hasMany primary model', () => {
    const schema = /* GraphQL */ `
      type SqlPrimary @refersTo(name: "sql_primary") @model {
        id: Int! @primaryKey
        content: String
        related: [SqlRelated] @hasMany
      }

      type SqlRelated @refersTo(name: "sql_related") @model {
        id: Int! @primaryKey
        content: String
        primaryId: Int! @refersTo(name: "primary_id") @index(name: "primary_id")
        primary: SqlPrimary @belongsTo(references: ["primaryId"])
      }
    `;

    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema, { respectPrimaryKeyAttributesOnConnectionField: true });
    expect(() => visitor.generate())
      .toThrowError(`Error processing @belongsTo directive on SqlRelated.primary. @hasOne or @hasMany directive with references ["primaryId"] was not found in connected model SqlPrimary`);
  });
});
