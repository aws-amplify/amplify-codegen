import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { validateJava } from '../utils/validate-java';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelJavaVisitor } from '../../visitors/appsync-java-visitor';
import { CodeGenGenerateEnum } from '../../visitors/appsync-visitor';
import { JAVA_SCALAR_MAP } from '../../scalars';

const defaultJavaVisitorSettings = {
  isTimestampFieldsAdded: true,
  handleListNullabilityTransparently: true,
  transformerVersion: 1,
  generate: CodeGenGenerateEnum.code,
  respectPrimaryKeyAttributesOnConnectionField: false,
};
const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (schema: string, selectedType?: string, settings: any = {}) => {
  const visitorConfig = { ...defaultJavaVisitorSettings, ...settings };
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelJavaVisitor(
    builtSchema,
    {
      directives,
      target: 'java',
      scalars: JAVA_SCALAR_MAP,
      ...visitorConfig,
    },
    { selectedType },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

const getVisitorPipelinedTransformer = (schema: string, selectedType?: string, settings: any = {}) => {
  return getVisitor(schema, selectedType, { ...settings, transformerVersion: 2 });
};

describe('AppSyncModelVisitor', () => {
  const schema = /* GraphQL */ `
    type Todo @model {
      id: ID!
      title: String!
      done: Boolean!
      description: String
      due_date: String
      version: Int!
      value: Float
      tasks: [task] @connection(name: "TodoTasks")
    }

    enum status {
      pending
      done
    }

    type task @model {
      id: ID
      title: String!
      done: Boolean!
      status: status
      todo: Todo @connection(name: "TodoTasks")
      time: AWSTime
      createdOn: AWSDate
    }

    type authorBook @model @key(name: "byAuthor", fields: ["author_id"]) @key(name: "byBook", fields: ["book_id"]) {
      id: ID!
      author_id: ID!
      book_id: ID!
      author: Author @connection(fields: ["author_id"])
      book: Book @connection(fields: ["book_id"])
    }

    type Book @model {
      id: ID!
      title: String!
      authors: [authorBook] @connection(keyName: "byBook", fields: ["id"])
    }

    type Author @model {
      id: ID!
      first_name: String!
      last_name: String!
      books: [authorBook] @connection(keyName: "byAuthor", fields: ["id"])
    }

    type Foo @model {
      name: String
      bar: String
    }
  `;

  it('Should generate a class for a Model', () => {
    const schema = /* GraphQL */ `
      type SimpleModel @model {
        id: ID!
        name: String
        bar: String
      }
    `;

    const visitor = getVisitor(schema, 'SimpleModel');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('Should generate a class a model with all optional fields except id field', () => {
    const schema = /* GraphQL */ `
      type SimpleModel @model {
        id: ID!
        name: String
        bar: String
      }
    `;

    const visitor = getVisitor(schema);
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should generate an enum for enum type', () => {
    const schema = /* GraphQL */ `
      enum status {
        pending
        done
      }
    `;

    const visitor = getVisitor(schema, 'status');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should generate model with snake case', () => {
    const schema = /* GraphQL */ `
      type snake_case @model {
        id: ID!
        name: String
      }
    `;

    const visitor = getVisitor(schema, 'snake_case');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should generate model with with snake_case field', () => {
    const schema = /* GraphQL */ `
      type SnakeCaseField @model {
        id: ID!
        first_name: String
      }
    `;

    const visitor = getVisitor(schema, 'SnakeCaseField');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should generate model with non-camel case field', () => {
    const schema = /* GraphQL */ `
      type NonCamelCaseField @model {
        id: ID!
        employeePID: String
      }
    `;
    const visitor = getVisitor(schema, 'NonCamelCaseField');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should throw error if two fields have the same camel field', () => {
    const schema = /* GraphQL */ `
      type sameCamelCaseField @model {
        id: ID!
        subjectName: String
        subject_name: String
      }
    `;
    const visitor = getVisitor(schema, 'sameCamelCaseField');
    expect(visitor.generate).toThrowErrorMatchingSnapshot();
  });

  it('should generate model with key directive', () => {
    const schema = /* GraphQL */ `
      type authorBook @model @key(name: "byAuthor", fields: ["author_id"]) @key(name: "byBook", fields: ["book_id"]) {
        id: ID!
        author_id: ID!
        book_id: ID!
        author: String
        book: String
      }
    `;
    const visitor = getVisitor(schema, 'authorBook');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  it('should avoid name collision on builder step', () => {
    const schema = /* GraphQL */ `
      type TutorialStep {
        position: Int!
        text: String!
      }

      type FormCue {
        position: Int!
        text: String!
      }

      type MyObject @model {
        id: ID!
        tutorial: [TutorialStep!]!
        formCues: [FormCue!]!
      }
    `;
    const visitor = getVisitor(schema, 'MyObject');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  describe('vNext transformer feature parity tests', () => {
    it('should produce the same result for @primaryKey as the primary key variant of @key', async () => {
      const schemaV1 = /* GraphQL */ `
        type authorBook @model @key(fields: ["author_id"]) {
          id: ID!
          author_id: ID!
          book_id: ID!
          author: String
          book: String
        }
      `;
      const schemaV2 = /* GraphQL */ `
        type authorBook @model {
          id: ID!
          author_id: ID! @primaryKey
          book_id: ID!
          author: String
          book: String
        }
      `;
      const visitorV1 = getVisitor(schemaV1, 'authorBook');
      const visitorV2 = getVisitorPipelinedTransformer(schemaV2, 'authorBook');
      const version1Code = visitorV1.generate();
      const version2Code = visitorV2.generate();

      expect(version1Code).toMatch(version2Code);
    });

    it('should produce the same result for @index as the secondary index variant of @key', async () => {
      const schemaV1 = /* GraphQL */ `
        type authorBook @model @key(fields: ["id"]) @key(name: "authorSecondary", fields: ["author_id", "author"]) {
          id: ID!
          author_id: ID!
          book_id: ID!
          author: String
          book: String
        }
      `;
      const schemaV2 = /* GraphQL */ `
        type authorBook @model {
          id: ID! @primaryKey
          author_id: ID! @index(name: "authorSecondary", sortKeyFields: ["author"])
          book_id: ID!
          author: String
          book: String
        }
      `;
      const visitorV1 = getVisitor(schemaV1, 'authorBook');
      const visitorV2 = getVisitorPipelinedTransformer(schemaV2, 'authorBook');
      const version1Code = visitorV1.generate();
      const version2Code = visitorV2.generate();

      expect(version1Code).toMatch(version2Code);
    });
  });

  it('Should handle nullability of lists appropriately', () => {
    const schema = /* GraphQL */ `
      enum StatusEnum {
        pass
        fail
      }

      type CustomType {
        name: String
      }

      type ListContainer @model {
        id: ID!
        name: String
        list: [Int]
        requiredList: [String]!
        requiredListOfRequired: [StatusEnum!]!
        listOfRequired: [Boolean!]
        requiredListOfRequiredDates: [AWSDate!]!
        listOfRequiredFloats: [Float!]
        requiredListOfCustomTypes: [CustomType]!
      }
    `;

    const visitor = getVisitor(schema, 'ListContainer');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  describe('Model with Auth', () => {
    it('should generate class with owner auth', () => {
      const schema = /* GraphQL */ `
        type simpleOwnerAuth @model @auth(rules: [{ allow: owner }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'simpleOwnerAuth');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with owner auth allowing others to read', () => {
      const schema = /* GraphQL */ `
        type allowRead @model @auth(rules: [{ allow: owner, operations: [create, delete, update] }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'allowRead');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with static groups', () => {
      const schema = /* GraphQL */ `
        type staticGroups @model @auth(rules: [{ allow: groups, groups: ["Admin"] }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'staticGroups');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with dynamic groups', () => {
      const schema = /* GraphQL */ `
        type dynamicGroups @model @auth(rules: [{ allow: groups, groupsField: "groups" }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'dynamicGroups');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with public authorization', () => {
      const schema = /* GraphQL */ `
        type publicType @model @auth(rules: [{ allow: public }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'publicType');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with private authorization', () => {
      const schema = /* GraphQL */ `
        type privateType @model @auth(rules: [{ allow: private }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'privateType');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with default field auth', () => {
      const schema = /* GraphQL */ `
        type Employee @model @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }]) {
          id: ID!
          name: String!
          address: String!
          ssn: String @auth(rules: [{ allow: owner }])
        }
      `;
      const visitor = getVisitor(schema, 'Employee');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with non-default providers', () => {
      const schema = /* GraphQL */ `
        type Employee @model @auth(rules: [{ allow: owner }, { allow: private, provider: "iam" }]) {
          id: ID!
          name: String!
          address: String!
          ssn: String @auth(rules: [{ allow: groups, provider: "oidc", groups: ["Admins"] }])
        }
      `;
      const visitor = getVisitor(schema, 'Employee');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with private authorization and field auth', () => {
      const schema = /* GraphQL */ `
        type privateType @model @auth(rules: [{ allow: private }]) {
          id: ID!
          name: String
          bar: String @auth(rules: [{ allow: private, operations: [create, update] }])
        }
      `;
      const visitor = getVisitor(schema, 'privateType');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with custom claims', () => {
      const schema = /* GraphQL */ `
        type customClaim @model @auth(rules: [{ allow: owner, identityClaim: "user_id" }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'customClaim');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with custom group claims', () => {
      const schema = /* GraphQL */ `
        type customClaim @model @auth(rules: [{ allow: groups, groups: ["Moderator"], groupClaim: "user_groups" }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor(schema, 'customClaim');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Non model type', () => {
    const schema = /* GraphQL */ `
      type Landmark @model {
        id: ID!
        name: String!
        rating: Int!
        location: Location!
        parking: Location
      }
      type Location {
        lat: String!
        lang: String!
      }
    `;
    const nonModelwithIdSchema = /* GraphQL */ `
      enum ReferenceIdTypeEnum {
        ASIN
        OBJECT_ID
      }
      type Reference {
        id: String!
        idType: ReferenceIdTypeEnum!
      }
    `;
    it('should generate class for non model types', () => {
      const visitor = getVisitor(schema, 'Location');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate class for model types with non model fields', () => {
      const visitor = getVisitor(schema, 'Landmark');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('should generate class for non model types with id field', () => {
      const visitor = getVisitor(nonModelwithIdSchema, 'Reference');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  it('should generate Temporal type for AWSDate* scalars', () => {
    const schema = /* GraphQL */ `
      type TypeWithAWSDateScalars @model {
        id: ID!
        date: AWSDate
        createdAt: AWSDateTime
        time: AWSTime
        timestamp: AWSTimestamp
      }
    `;
    const visitor = getVisitor(schema, 'TypeWithAWSDateScalars');
    const generatedCode = visitor.generate();
    expect(() => validateJava(generatedCode)).not.toThrow();
    expect(generatedCode).toMatchSnapshot();
  });

  describe('connection', () => {
    describe('One to Many connection', () => {
      const schema = /* GraphQL */ `
        type Todo @model {
          id: ID!
          title: String!
          done: Boolean!
          description: String
          due_date: String
          version: Int!
          value: Float
          tasks: [task] @connection(name: "TodoTasks")
        }

        type task @model {
          id: ID
          title: String!
          done: Boolean!
          todo: Todo @connection(name: "TodoTasks")
          time: AWSTime
          createdOn: AWSDate
        }
      `;
      it('should generate one side of the connection', () => {
        const visitor = getVisitor(schema, 'Todo');
        const generatedCode = visitor.generate();
        expect(() => validateJava(generatedCode)).not.toThrow();
        expect(generatedCode).toMatchSnapshot();
      });

      it('should generate many side of the connection', () => {
        const visitor = getVisitor(schema, 'task');
        const generatedCode = visitor.generate();
        expect(() => validateJava(generatedCode)).not.toThrow();
        expect(generatedCode).toMatchSnapshot();
      });
    });
  });

  describe('One to Many connection with no nullable and non nullable fields', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID!
        tasks: [task] @connection(name: "TodoTasks")
      }

      type task @model {
        id: ID
        todo: Todo @connection(name: "TodoTasks")
        time: AWSTime
        createdOn: AWSDate
      }
    `;
    it('should generate class for one side of the connection', () => {
      const visitor = getVisitor(schema, 'Todo');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class for many side of the connection', () => {
      const visitor = getVisitor(schema, 'task');
      const generatedCode = visitor.generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Many To Many V2 Tests', () => {
    it('Should generate the intermediate model successfully', () => {
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
      const generatedCode = getVisitorPipelinedTransformer(schema).generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Custom primary key tests', () => {
    const schema = /* GraphQL */ `
      type Blog @model {
        id: ID!
        name: String!
        blogOwner: BlogOwnerWithCustomPKS! @belongsTo
        posts: [Post] @hasMany
      }

      type BlogOwnerWithCustomPKS @model {
        id: ID!
        name: String! @primaryKey(sortKeyFields: ["wea"])
        wea: String!
        blogs: [Blog] @hasMany
      }

      type Post @model {
        postId: ID! @primaryKey
        title: String!
        rating: Int!
        created: AWSDateTime
        blogID: ID!
        blog: Blog @belongsTo
        comments: [Comment] @hasMany
      }

      type Comment @model {
        post: Post @belongsTo
        title: String! @primaryKey(sortKeyFields: ["content", "likes"])
        content: String!
        likes: Int!
        description: String
      }
    `;
    it('Should generate correct model file for default id as primary key type', () => {
      const generatedCode = getVisitorPipelinedTransformer(schema, `Blog`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('Should generate correct model file for custom primary key type', () => {
      const generatedCode = getVisitorPipelinedTransformer(schema, `Post`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(() => validateJava(generatedCode)).not.toThrow();
      expect(generatedCode).toMatchSnapshot();
    });
    it('Should generate correct model file for composite key type without id field defined', () => {
      const generatedCode = getVisitorPipelinedTransformer(schema, `Comment`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(generatedCode).toMatchSnapshot();
    });
    it('Should generate correct model file for composite key type with id field defined', () => {
      const generatedCode = getVisitorPipelinedTransformer(schema, `BlogOwnerWithCustomPKS`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Custom primary key for connected model tests', () => {
    it('Should generate correct model file for hasOne & belongsTo relation with composite primary key when CPK is enabled', () => {
      const schema = /* GraphQL */ `
        type Project @model {
          projectId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          team: Team @hasOne
        }

        type Team @model {
          teamId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          project: Project @belongsTo
        }
      `;
      const generatedCodeProject = getVisitorPipelinedTransformer(schema, `Project`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      const generatedCodeTeam = getVisitorPipelinedTransformer(schema, `Team`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(generatedCodeProject).toMatchSnapshot();
      expect(generatedCodeTeam).toMatchSnapshot();
    });
    it('Should generate corect model file for hasMany uni relation with composite primary key when CPK is enabled', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          id: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }

        type Comment @model {
          id: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
        }
      `;
      const generatedCodePost = getVisitorPipelinedTransformer(schema, 'Post', {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      const generatedCodeComment = getVisitorPipelinedTransformer(schema, 'Comment', {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(generatedCodePost).toMatchSnapshot();
      expect(generatedCodeComment).toMatchSnapshot();
    });
  });

  describe('ModelIdentifier for all model types tests', () => {
    it('Should generate ModelIdentifier factory with resolveIdentifier return type extending ModelIdentifier', () => {
      const schema = /* GraphQL */ `
        type MyPost @model {
          postId: ID! @primaryKey(sortKeyFields: ["title", "createdAt", "rating"])
          title: String!
          createdAt: AWSDateTime!
          rating: Float!
        }
      `;
      const generatedCodeMyPost = getVisitorPipelinedTransformer(schema, `MyPost`, {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      expect(generatedCodeMyPost).toMatchSnapshot();
    });
    it('Should generate ModelIdentifier factory with resolveIdentifier returning Java types matching graphql scalar conversion', () => {
      const schema = /* GraphQL */ `
        type StringModel @model {
          customKey: String! @primaryKey
        }

        type IdModel @model {
          customKey: ID! @primaryKey
        }

        type IntModel @model {
          customKey: Int! @primaryKey
        }
      `;
      const generatedCodeStringModel = getVisitorPipelinedTransformer(schema, 'StringModel', {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      const generatedCodeIdModel = getVisitorPipelinedTransformer(schema, 'IdModel', {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();
      const generatedCodeIntModel = getVisitorPipelinedTransformer(schema, 'IntModel', {
        respectPrimaryKeyAttributesOnConnectionField: true,
      }).generate();

      expect(generatedCodeStringModel).toMatchSnapshot();
      expect(generatedCodeIdModel).toMatchSnapshot();
      expect(generatedCodeIntModel).toMatchSnapshot();
    });
  });
});
