import { buildSchema, GraphQLSchema, parse, visit } from 'graphql';
import { directives, scalars } from '../../scalars/supported-directives';
import { AppSyncModelDartVisitor } from '../../visitors/appsync-dart-visitor';
import { CodeGenGenerateEnum } from '../../visitors/appsync-visitor';
import { DART_SCALAR_MAP } from '../../scalars';

const buildSchemaWithDirectives = (schema: String): GraphQLSchema => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getVisitor = (
  schema: string,
  selectedType?: string,
  generate: CodeGenGenerateEnum = CodeGenGenerateEnum.code,
  enableDartNullSafety: boolean = false,
  enableDartNonModelGeneration: boolean = true,
  isTimestampFieldsAdded: boolean = false,
  emitAuthProvider: boolean = false
) => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelDartVisitor(
    builtSchema,
    { directives, target: 'dart', scalars: DART_SCALAR_MAP, enableDartNullSafety, enableDartNonModelGeneration, isTimestampFieldsAdded, emitAuthProvider },
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });

    describe('should generate AuthRule with provider information when enabled', () => {
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
      
      [true, false].forEach(enableNullSafety => {
        const visitor = getVisitor(schema, 'TodoWithAuth', CodeGenGenerateEnum.code, enableNullSafety, true, true, true);
        const generatedCode = visitor.generate();
        it(`inserting auth provider to auth when nullsafety is ${enableNullSafety ? 'enabled' : 'disabled'}`, () => {
          expect(generatedCode).toMatchSnapshot();
        });
      })
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
        const generatedCode = getVisitor(schema, model).generate();
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
        const generatedCode = getVisitor(schema, model).generate();
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
        const generatedCode = getVisitor(schema, model).generate();
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema, 'TestEnumModel');
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema, undefined, CodeGenGenerateEnum.loader);
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
      const visitor = getVisitor(schema);
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
      const visitor = getVisitor(schema);
      expect(visitor.generate).toThrowErrorMatchingInlineSnapshot(
        `"Type name 'class' is a reserved word in dart. Please use a non-reserved name instead."`,
      );
    });
  });

  describe('Null Safety Tests', () => {
    it('should generate correct model files if the null safety is enabled', () => {
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
        const generatedCode = getVisitor(schema, model, CodeGenGenerateEnum.code, true).generate();
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
      const generatedCode = getVisitor(schema, 'TestModel', CodeGenGenerateEnum.code, true).generate();
      expect(generatedCode).toMatchSnapshot();
    });

    it('should generate correct internal constructor for a model has only ID field', () => {
      const schema = /* GraphQL */ `
        type TestModel @model {
          id: ID!
        }
      `;
      const generatedCode = getVisitor(schema, 'TestModel', CodeGenGenerateEnum.code, true).generate();
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
      const generatedCode = getVisitor(schema, 'TestModel', CodeGenGenerateEnum.code, true).generate();
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
      it(`should generated correct dart class for ${!type ? 'ModelProvider' : type} with nullsafety enabled`, () => {
        const generatedCode = getVisitor(schema, type, !type ? CodeGenGenerateEnum.loader : CodeGenGenerateEnum.code, true).generate();

        expect(generatedCode).toMatchSnapshot();
      })
    });

    models.forEach(type => {
      it(`should generated correct dart class for ${!type ? 'ModelProvider' : type} with nullsafety disabled`, () => {
        const generatedCode = getVisitor(schema, type, !type ? CodeGenGenerateEnum.loader : CodeGenGenerateEnum.code, false).generate();

        expect(generatedCode).toMatchSnapshot();
      })
    });

    it('should not generate custom type field in model provider if non model feature is disabled', () => {
      const generatedCode = getVisitor(schema, undefined, CodeGenGenerateEnum.loader, true, false).generate();
      expect(generatedCode).toMatchSnapshot();
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
      const visitor = getVisitor(schema, undefined, CodeGenGenerateEnum.code, false, false, true);
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
      const visitor = getVisitor(schema, undefined, CodeGenGenerateEnum.code, true, false, true);
      const generatedCode = visitor.generate();
      expect(generatedCode).toMatchSnapshot();
    });
  });
});
