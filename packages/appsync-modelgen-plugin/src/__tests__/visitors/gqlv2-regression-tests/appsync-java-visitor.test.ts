import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { DefaultDirectives } from '@aws-amplify/graphql-directives';
import { scalars } from '../../../scalars/supported-scalars';
import { JAVA_SCALAR_MAP } from '../../../scalars';
import { AppSyncModelJavaVisitor } from '../../../visitors/appsync-java-visitor';
import { CodeGenGenerateEnum } from '../../../visitors/appsync-visitor';

const directives = DefaultDirectives.map(directive => directive.definition).join('\n');

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getGQLv2Visitor = (
  schema: string,
  selectedType?: string,
  generate: CodeGenGenerateEnum = CodeGenGenerateEnum.code,
) => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavaVisitor(
    builtSchema,
    {
      directives,
      target: 'java',
      generate,
      scalars: JAVA_SCALAR_MAP,
      isTimestampFieldsAdded: true,
      handleListNullabilityTransparently: true,
      transformerVersion: 2,
    },
    { selectedType },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('AppSyncJavaVisitor - GQLv2 Regression Tests', () => {
  it('Works when configuring a secondary index', () => {
    const schema = /* GraphQL */ `
      type Customer @model {
        id: ID!
        name: String!
        phoneNumber: String
        accountRepresentativeID: ID! @index(name: "byRepresentative", queryField: "customerByRepresentative")
      }
    `;
    expect(getGQLv2Visitor(schema, 'Customer').generate()).toMatchSnapshot();    expect(getGQLv2Visitor(schema, 'Customer', CodeGenGenerateEnum.metadata).generate()).toMatchSnapshot();
  });

  it('Works on record creation and updating timestamp', () => {
    const schema = /* GraphQL */ `  
      type Todo @model(timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" }) {content: String}
    `;
    expect(getGQLv2Visitor(schema, 'Todo').generate()).toMatchSnapshot();
  });

  it('Works on uni-directional implicit has one relationship @hasOne', () => {
    const schema = /* GraphQL */ `  
      # Implicit field
      type Project @model {
        id: ID!
        name: String
        team: Team @hasOne
      }

      type Team @model {
        id: ID!
        name: String!
      }
    `;
    expect(getGQLv2Visitor(schema, 'Project').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Team').generate()).toMatchSnapshot();
  });

  it('Works on uni-directional explicit has one relationship @hasOne', () => {
    const schema = /* GraphQL */ `  
      # Explicit field
      type Project2 @model {
        id: ID!
        name: String
        teamID: ID
        team: Team2 @hasOne(fields: ["teamID"])
      }

      type Team2 @model {
        id: ID!
        name: String!
      }
    `;
    expect(getGQLv2Visitor(schema, 'Project2').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Team2').generate()).toMatchSnapshot();
  });

  it('Works on uni-directional implicit has many relationship @hasMany', () => {
    const schema = /* GraphQL */ `  
      # Implicit
      type Post @model {
        id: ID!
        title: String!
        comments: [Comment] @hasMany
      }

      type Comment @model {
        id: ID!
        content: String!
      }
    `;
    expect(getGQLv2Visitor(schema, 'Post').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Comment').generate()).toMatchSnapshot();
  });

  it('Works on uni-directional explicit has many relationship @hasMany', () => {
    const schema = /* GraphQL */ `  
      # Explicit
      type Post2 @model {
        id: ID!
        title: String!
        comments: [Comment2] @hasMany(indexName: "byPost", fields: ["id"])
      }

      type Comment2 @model {
        id: ID!
        postID: ID! @index(name: "byPost", sortKeyFields: ["content"])
        content: String!
      }
    `;
    expect(getGQLv2Visitor(schema, 'Post2').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Comment2').generate()).toMatchSnapshot();
  });

  it('Works on many to many relationship @manyToMany', () => {
    const schema = /* GraphQL */ `  
      type Post @model {
        id: ID!
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }

      type Tag @model {
        id: ID!
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    expect(getGQLv2Visitor(schema, 'Post').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Tag').generate()).toMatchSnapshot();
  });

  it('Works on implicit hasOne belongs to relationship @belongsTo', () => {
    const schema = /* GraphQL */ `  
      # Implicit
      type Project @model {
        id: ID!
        name: String
        team: Team @hasOne
      }

      type Team @model {
        id: ID!
        name: String!
        project: Project @belongsTo
      }
    `;
    expect(getGQLv2Visitor(schema, 'Project').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Team').generate()).toMatchSnapshot();
  });

  it('Works on explicit hasOne belongs to relationship @belongsTo', () => {
    const schema = /* GraphQL */ `  
      # Explicit
      type Project2 @model {
        id: ID!
        name: String
        team: Team2 @hasOne
      }

      type Team2 @model {
        id: ID!
        name: String!
        projectID: ID
        project: Project2 @belongsTo(fields: ["projectID"])
      }
    `;
    expect(getGQLv2Visitor(schema, 'Project2').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Team2').generate()).toMatchSnapshot();
  });

  it('Works on explicit hasMany belongs to relationship @belongsTo', () => {
    const schema = /* GraphQL */ `  
      # Explicit - Bi-directional Has Many
      type Post @model {
        id: ID!
        title: String!
        comments: [Comment] @hasMany(indexName: "byPost", fields: ["id"])
      }

      type Comment @model {
        id: ID!
        postID: ID! @index(name: "byPost", sortKeyFields: ["content"])
        content: String!
        post: Post @belongsTo(fields: ["postID"])
      }
    `;
    expect(getGQLv2Visitor(schema, 'Post').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Comment').generate()).toMatchSnapshot();
  });


  it('Works on implicit hasMany belongs to relationship @belongsTo (extended)', () => {
    const schema = /* GraphQL */ `  
      # 7 - Blog Post Comment
      type Blog7V2 @model {
        id: ID!
        name: String!
        posts: [Post7V2] @hasMany
      }
      type Post7V2 @model {
        id: ID!
        title: String!
        blog: Blog7V2 @belongsTo
        comments: [Comment7V2] @hasMany
      }
      type Comment7V2 @model {
        id: ID!
        content: String
        post: Post7V2 @belongsTo
      }
    `;
    expect(getGQLv2Visitor(schema, 'Blog7V2').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Post7V2').generate()).toMatchSnapshot();
    expect(getGQLv2Visitor(schema, 'Comment7V2').generate()).toMatchSnapshot();
  });
});
