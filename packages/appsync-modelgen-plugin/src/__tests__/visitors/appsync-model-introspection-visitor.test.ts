import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { METADATA_SCALAR_MAP } from '../../scalars';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelIntrospectionVisitor } from '../../visitors/appsync-model-introspection-visitor';

const defaultModelIntropectionVisitorSettings = {
  isTimestampFieldsAdded: true,
  respectPrimaryKeyAttributesOnConnectionField: false,
  transformerVersion: 2
}

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (schema: string, settings: any = {}): AppSyncModelIntrospectionVisitor => {
  const visitorConfig = { ...defaultModelIntropectionVisitorSettings, ...settings }
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelIntrospectionVisitor(
    builtSchema,
    { directives, scalars: METADATA_SCALAR_MAP, ...visitorConfig, target: 'introspection' },
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
    }).generate()).toMatchSnapshot();
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

describe('Custom queries/mutations/subscriptions tests', () => {
  const schema = /* GraphQL */ `
    type Todo @model {
      id: ID!
      name: String!
      description: String
    }
    type Phone {
      number: String
    }
    type Query {
      echo(msg: String): String
      echo2(todoId: ID!): Todo
      echo3: [Todo]
      echo4(number: String): Phone
    }
    type Mutation {
      mutate(msg: [String!]!): Todo
    }
    type Subscription {
      onMutate(msg: String): [Todo!]
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
    const visitor: AppSyncModelIntrospectionVisitor = getVisitor(schema);
    expect(visitor.generate()).toMatchSnapshot();
  });
});
