import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelDartVisitor } from '../../visitors/appsync-dart-visitor';
import { CodeGenGenerateEnum } from '../../visitors/appsync-visitor';
import { DART_SCALAR_MAP } from '../../scalars';

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = ({
  schema,
  selectedType,
  generate = CodeGenGenerateEnum.code,
  isTimestampFieldsAdded = false,
  transformerVersion = 1,
  dartUpdateAmplifyCoreDependency = false,
  respectPrimaryKeyAttributesOnConnectionField = false,
}: {
  schema: string;
  selectedType?: string;
  generate?: CodeGenGenerateEnum;
  isTimestampFieldsAdded?: boolean;
  transformerVersion?: number;
  dartUpdateAmplifyCoreDependency?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
}) => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelDartVisitor(
    builtSchema,
    {
      directives,
      target: 'dart',
      scalars: DART_SCALAR_MAP,
      isTimestampFieldsAdded,
      transformerVersion,
      dartUpdateAmplifyCoreDependency,
      respectPrimaryKeyAttributesOnConnectionField,
      codegenVersion: '1',
    },
    { selectedType, generate },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('AppSync Dart Visitor', () => {
  describe('Model Directive', () => {
    it('should generate a class for a Simple Model', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate a class for a model with all optional fields except id field', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Model with Key Directive', () => {
    it('should generate a class for model with key directive', () => {
      const schema = /* GraphQL */ `
        type authorBook @model @key(name: "byAuthor", fields: ["author_id"]) @key(name: "byBook", fields: ["book_id"]) {
          id: ID!
          author_id: ID!
          book_id: ID!
          author: String
          book: String
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Model with Auth Directive', () => {
    it('should generate class with owner auth', () => {
      const schema = /* GraphQL */ `
        type simpleOwnerAuth @model @auth(rules: [{ allow: owner }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate class with owner auth allowing others to read:', () => {
      const schema = /* GraphQL */ `
        type allowRead @model @auth(rules: [{ allow: owner, operations: [create, delete, update] }]) {
          id: ID!
          name: String
          bar: String
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should include authRules in schema when owner auth is used with ownerField', () => {
      const schema = /* GraphQL */ `
        type Post @model @auth(rules: [{ allow: owner, ownerField: "author" }]) {
          id: ID!
          title: String!
          author: String!
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should support multiple auth rules', () => {
      const schema = /* GraphQL */ `
        type Post
          @model
          @auth(
            rules: [
              { allow: groups, groups: ["admin"] }
              { allow: owner, operations: ["create", "update"] }
              { allow: public, operation: ["read"] }
            ]
          ) {
          id: ID!
          title: String!
          owner: String!
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
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
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate AuthRule with provider information when enabled', () => {
      const schema = /* GraphQL */ `
        type TodoWithAuth
          @model
          @auth(
            rules: [
              { allow: groups, groups: ["admin"] }
              { allow: owner, operations: ["create", "update"] }
              { allow: public, operations: ["read"], provider: "apiKey" }
            ]
          ) {
          id: ID!
          name: String!
        }
      `;

      const visitor = getVisitor({
        schema,
        selectedType: 'TodoWithAuth',
        isTimestampFieldsAdded: true,
      });

      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    })
  });

  describe('Model with Connection Directive', () => {
    it('should generate classes for models with one to many connection', () => {
      const schema = /* GraphQL */ `
        type Todo @model {
          id: ID!
          tasks: [Task] @connection(name: "TodoTasks")
        }

        type Task @model {
          id: ID
          todo: Todo @connection(name: "TodoTasks")
        }
      `;
      const outputModels: string[] = ['Todo', 'Task'];
      outputModels.forEach(model => {
        const generatedCode = getVisitor({schema, selectedType: model}).generate();
        expect(generatedCode).toMatchSnapshot();
      });
    });

    it('should support connection directive with keyName and fields', () => {
      const schema = /* GraphQL */ `
        type Blog @model {
          id: ID!
          name: String!
          posts: [Post] @connection(keyName: "byBlog", fields: ["id"])
          test: [String]
        }
        type Comment @model @key(name: "byPost", fields: ["postID", "content"]) {
          id: ID!
          postID: ID!
          post: Post @connection(fields: ["postID"])
          content: String!
        }
        type Post @model @key(name: "byBlog", fields: ["blogID"]) {
          id: ID!
          title: String!
          blogID: ID!
          blog: Blog @connection(fields: ["blogID"])
          comments: [Comment] @connection(keyName: "byPost", fields: ["id"])
        }
      `;
      const outputModels: string[] = ['Blog', 'Comment', 'Post'];
      outputModels.forEach(model => {
        const generatedCode = getVisitor({ schema, selectedType: model }).generate();
        expect(generatedCode).toMatchSnapshot();
      });
    });
  });

  describe('Enum Generation', () => {
    it('should generate a class for enum type', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          status: Status
        }
        enum Status {
          yes
          no
          maybe
        }
      `;
      const outputModels: string[] = ['SimpleModel', 'Status'];
      outputModels.forEach(model => {
        const generatedCode = getVisitor({ schema, selectedType: model }).generate();
        expect(generatedCode).toMatchSnapshot();
      });
    });
  });

  describe('Field tests', () => {
    it('should generate correct output for regular field w/o list or nullable', () => {
      const schema = /* GraphQL */ `
        type TestModel @model {
          id: ID!
          floatVal: Float!
          floatNullableVal: Float
          floatList: [Float!]!
          floatNullableList: [Float!]
          nullableFloatList: [Float]!
          nullableFloatNullableList: [Float]
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct output for enum field w/o list or nullable', () => {
      const schema = /* GraphQL */ `
        type TestEnumModel @model {
          id: ID!

          enumVal: TestEnum!

          nullableEnumVal: TestEnum

          enumList: [TestEnum!]!
          enumNullableList: [TestEnum!]
          nullableEnumList: [TestEnum]!
          nullableEnumNullableList: [TestEnum]
        }

        enum TestEnum {
          VALUE_ONE
          VALUE_TWO
        }
      `;
      const visitor = getVisitor({ schema, selectedType: 'TestEnumModel' });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct output for appsync scalar types of time and int', () => {
      const schema = /* GraphQL */ `
        type TemporalTimeModel @model {
          id: ID!
          date: AWSDate
          time: AWSTime
          dateTime: AWSDateTime
          timestamp: AWSTimestamp
          intNum: Int
          dateList: [AWSDate]
          timeList: [AWSTime]
          dateTimeList: [AWSDateTime]
          timestampList: [AWSTimestamp]
          intList: [Int]
        }
      `;
      const visitor = getVisitor({ schema });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Dart Specific Tests', () => {
    it('should generate the model provider', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          name: String
        }
      `;
      const visitor = getVisitor({schema, generate: CodeGenGenerateEnum.loader });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should throw error when a reserved word of dart is used in graphql schema field name', () => {
      const schema = /* GraphQL */ `
        type ReservedWord @model {
          id: ID!
          class: String!
        }
      `;
      const visitor = getVisitor({ schema });
      expect(visitor.generate).toThrowErrorMatchingInlineSnapshot(
        `"Field name 'class' in type 'ReservedWord' is a reserved word in dart. Please use a non-reserved name instead."`,
      );
    });

    it('should throw error when a reserved word of dart is used in graphql schema type name', () => {
      const schema = /* GraphQL */ `
        type class @model {
          id: ID!
          name: String!
        }
      `;
      const visitor = getVisitor({ schema });
      expect(visitor.generate).toThrowErrorMatchingInlineSnapshot(
        `"Type name 'class' is a reserved word in dart. Please use a non-reserved name instead."`,
      );
    });
  });

  describe('Null Safety Tests', () => {
    it('should generate correct model files with nullsafety', () => {
      const schema = /* GraphQL */ `
        type Blog @model {
          id: ID!
          name: String!
          posts: [Post] @connection(keyName: "byBlog", fields: ["id"])
        }
        type Comment @model @key(name: "byPost", fields: ["postID", "content"]) {
          id: ID!
          postID: ID!
          post: Post @connection(fields: ["postID"])
          content: String!
        }
        type Post @model @key(name: "byBlog", fields: ["blogID"]) {
          id: ID!
          title: String!
          blogID: ID!
          blog: Blog @connection(fields: ["blogID"])
          comments: [Comment] @connection(keyName: "byPost", fields: ["id"])
        }
      `;
      const outputModels: string[] = ['Blog', 'Comment', 'Post'];
      outputModels.forEach(model => {
        const generatedCode = getVisitor({ schema, selectedType: model }).generate();
        expect(generatedCode).toMatchSnapshot();
      });
    });

    it('should generate correct null safe output for regular field w/o list or nullable', () => {
      const schema = /* GraphQL */ `
        type TestModel @model {
          id: ID!
          floatVal: Float!
          floatNullableVal: Float
          floatList: [Float!]!
          floatNullableList: [Float!]
          nullableFloatList: [Float]!
          nullableFloatNullableList: [Float]
        }
      `;
      const generatedCode = getVisitor({ schema, selectedType: 'TestModel' }).generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct null safe output for connection field w/o list or nullable', () => {
      const schema = /* GraphQL */ `
        type ListItem @model {
          id: ID!
          name: String!
        }

        type TestModel @model {
          id: ID!
          listOfModels: [ListItem]! @hasMany
          nullableListOfModels: [ListItem] @hasMany
        }
      `;
      const generatedCode = getVisitor({ schema, selectedType: 'TestModel', transformerVersion: 2 }).generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct internal constructor for a model has only ID field', () => {
      const schema = /* GraphQL */ `
        type TestModel @model {
          id: ID!
        }
      `;
      const generatedCode = getVisitor({ schema, selectedType: 'TestModel' }).generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct null safe output for regular scalar/list fields', () => {
      const schema = /* GraphQL */ `
        type TestModel @model {
          id: ID!
          floatVal: Float!
          floatNullableVal: Float
          floatList: [Float!]!
          floatNullableList: [Float!]
          nullableFloatList: [Float]!
          nullableFloatNullableList: [Float]
          intVal: Int!
          intNullableVal: Int
          intList: [Int!]!
          intNullableList: [Int!]
          nullableIntList: [Int]!
          nullableIntNullableList: [Int]
        }
      `;
      const generatedCode = getVisitor({ schema, selectedType: 'TestModel' }).generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('CustomType (non-model) Tests', () => {
    const schema = /* GraphQL */ `
        type Person @model {
          name: String!
          phone: Phone!
          mailingAddresses: [Address]
        }

        type Contact {
          contactName: String!
          phone: Phone!
          mailingAddresses: [Address]
        }

        type Phone {
          countryCode: String!
          areaCode: String!
          number: String!
        }

        type Address {
          line1: String!
          line2: String
          city: String!
          state: String!
          postalCode: String!
        }
      `;

    const models = [undefined, 'Person', 'Contact', 'Address'];

    models.forEach(type => {
      it(`should generate correct dart class for ${!type ? 'ModelProvider' : type} with nullsafety`, () => {
        const generatedCode = getVisitor({schema, selectedType: type, generate: !type ? CodeGenGenerateEnum.loader : CodeGenGenerateEnum.code }).generate();

        expect(generatedCode).toMatchSnapshot();
      })
    });
  });

  describe('Read-only Field Tests', () => {
    it('should generate the read-only timestamp fields when isTimestampFields is true', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          name: String
        }
      `;
      const visitor = getVisitor({ schema, isTimestampFieldsAdded: true });
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Read-only and Null Safety Combined Tests', () => {
    it('should generate the read-only timestamp fields when isTimestampFields is true and with null safety', () => {
      const schema = /* GraphQL */ `
        type SimpleModel @model {
          id: ID!
          name: String
        }
      `;
      const visitor = getVisitor({ schema, isTimestampFieldsAdded: true  });


      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Many To Many V2 Tests', () => {
    it('Should generate the intermediate model successfully with nullsafety', () => {
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
      const generatedCode = getVisitor({ schema, transformerVersion: 2 }).generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('Amplify Core dependency used in imports', () => {
    const schema = /* GraphQL */`
      enum PostStatus {
        ACTIVE
        INACTIVE
      }
      type Post @model {
        id: ID!
        title: String!
        rating: Int!
        status: PostStatus!
        # New field with @hasMany
        comments: [Comment] @hasMany(indexName: "byPost", fields: ["id"])
      }
      # New model
      type Comment @model {
        id: ID!
        postID: ID! @index(name: "byPost", sortKeyFields: ["content"])
        post: Post! @belongsTo(fields: ["postID"])
        content: String!
      }
    `;
    it('Should use the older flutter datastore interface dependency if dartUpdateAmplifyCoreDependency is false', () => {
      const generatedCode = getVisitor({ schema, transformerVersion: 2 }).generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('Should use the amplify_core dependency if dartUpdateAmplifyCoreDependency is true', () => {
      const generatedCode = getVisitor({ schema, transformerVersion: 2, dartUpdateAmplifyCoreDependency: true }).generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });

  describe('custom primary key model generation', () => {
    it('should generate correct model and helper class for model that is NOT using custom primary key', () => {
      const schema = /* GraphQL */ `
        type ModelWithImplicitID @model {
          title: String!
        }

        type ModelWithExplicitID @model {
          id: ID!
          title: String!
        }

        type ModelWithExplicitIDAndSDI @model {
          id: ID!
          parentID: ID @index(name: "byParent")
        }
      `;

      ['ModelWithImplicitID', 'ModelWithExplicitID', 'ModelWithExplicitIDAndSDI'].forEach(modelName => {
        const generatedCode = getVisitor({
          schema,
          selectedType: modelName,
          isTimestampFieldsAdded: true,
          respectPrimaryKeyAttributesOnConnectionField: true,
          transformerVersion: 2
        }).generate();

        expect(generatedCode).toMatchSnapshot();
      });
    });

    it('should generate correct model and helper class for model that is using `id` field as primary key plus sort keys', () => {
      const schema = /* GraphQL */ `
        type ModelWithIDPlusSortKeys @model {
          id: ID! @primaryKey(sortKeyFields: ["title", "rating"])
          title: String!
          rating: Int!
        }
      `;

      const generatedCode = getVisitor({
        schema,
        isTimestampFieldsAdded: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: 2,
      }).generate();

      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct model and helper class for model that is using custom primary key', () => {
      const schema = /* GraphQL */ `
        type ModelWithExplicitlyDefinedPK @model {
          modelID: ID! @primaryKey
          title: String!
        }

        type ModelWithExplicitlyDefinedPKPlusSortKeysAsCompositeKey @model {
          modelID: ID! @primaryKey(sortKeyFields: ["title", "rating"])
          title: String!
          rating: Int!
        }
      `;

      ['ModelWithExplicitlyDefinedPK', 'ModelWithExplicitlyDefinedPKPlusSortKeysAsCompositeKey'].forEach(
        modelName => {
          const generatedCode = getVisitor({
            schema,
            selectedType: modelName,
            isTimestampFieldsAdded: true,
            respectPrimaryKeyAttributesOnConnectionField: true,
            transformerVersion: 2,
          }).generate();

          expect(generatedCode).toMatchSnapshot();
        },
      );
    });

    it('should generate correct models for hasOne/belongsTo relation when custom PK is enabled', () => {
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
        type CpkOneToOneBidirectionalParent @model {
          id: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          explicitChild: CpkOneToOneBidirectionalChildExplicit @hasOne
        }
        type CpkOneToOneBidirectionalChildExplicit @model {
          id: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          belongsToParentID: ID
          belongsToParentName: String
          belongsToParent: CpkOneToOneBidirectionalParent
            @belongsTo(fields: ["belongsToParentID", "belongsToParentName"])
        }
      `;
      ['Project', 'Team', 'CpkOneToOneBidirectionalParent', 'CpkOneToOneBidirectionalChildExplicit'].forEach(modelName => {
        const generatedCode = getVisitor({
          schema,
          selectedType: modelName,
          isTimestampFieldsAdded: true,
          respectPrimaryKeyAttributesOnConnectionField: true,
          transformerVersion: 2,
        }).generate();
        expect(generatedCode).toMatchSnapshot();
      });
    });
    it('should generate correct models for hasMany uni relation when custom PK is enabled', () => {
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
      ['Post', 'Comment'].forEach(modelName => {
        const generatedCode = getVisitor({
          schema,
          selectedType: modelName,
          isTimestampFieldsAdded: true,
          respectPrimaryKeyAttributesOnConnectionField: true,
          transformerVersion: 2,
        }).generate();
        expect(generatedCode).toMatchSnapshot();
      })
    })
  });
});
