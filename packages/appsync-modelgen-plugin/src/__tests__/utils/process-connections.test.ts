import {
  processConnections,
  CodeGenConnectionType,
  CodeGenFieldConnection,
  CodeGenFieldConnectionHasMany,
  CodeGenFieldConnectionBelongsTo,
  CodeGenFieldConnectionHasOne,
  getConnectedField,
} from '../../utils/process-connections';
import { CodeGenModelMap, CodeGenGenerateEnum, AppSyncModelVisitor } from '../../visitors/appsync-visitor';
import { processConnectionsV2 } from '../../utils/process-connections-v2';
import { buildSchema, parse, visit } from 'graphql';
import { directives, scalars } from '../../scalars/supported-directives';
import { SWIFT_SCALAR_MAP } from '../../scalars';

const buildSchemaWithDirectives = (schema: String) => {
  return buildSchema([schema, directives, scalars].join('\n'));
};

const getPipelinedTransformerVisitor = (
  schema: string,
  selectedType?: string,
  generate: CodeGenGenerateEnum = CodeGenGenerateEnum.code,
  isTimestampFieldsAdded: boolean = true,
  emitAuthProvider: boolean = true,
  generateIndexRules: boolean = true,
  handleListNullabilityTransparently: boolean = true,
  usePipelinedTransformer: boolean = true
) => {
  const ast = parse(schema);
  const builtSchema = buildSchemaWithDirectives(schema);
  const visitor = new AppSyncModelVisitor(
    builtSchema,
    {
      directives,
      target: 'swift',
      scalars: SWIFT_SCALAR_MAP,
      isTimestampFieldsAdded,
      emitAuthProvider,
      generateIndexRules,
      handleListNullabilityTransparently,
      usePipelinedTransformer: usePipelinedTransformer
    },
    { selectedType, generate },
  );
  visit(ast, { leave: visitor });
  return visitor;
};

describe('process connection', () => {
  describe('Bi-Directional connection (named connection)', () => {
    describe('One:Many', () => {
      let modelMap: CodeGenModelMap;
      beforeEach(() => {
        const schema = /* GraphQL */ `
          type Post @model {
            comments: [Comment] @connection(name: "postConnection")
          }

          type Comment @model {
            post: Post @connection(name: "postConnection")
          }
        `;
        modelMap = {
          Post: {
            name: 'Post',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Comment',
                isNullable: true,
                isList: true,
                name: 'comments',
                directives: [{ name: 'connection', arguments: { name: 'postConnection' } }],
              },
            ],
          },
          Comment: {
            name: 'Comment',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Post',
                isNullable: true,
                isList: false,
                name: 'post',
                directives: [{ name: 'connection', arguments: { name: 'postConnection' } }],
              },
            ],
          },
        };
      });

      it('should return HAS_MANY for Post.comments field connection info', () => {
        const commentsField = modelMap.Post.fields[0];
        const connectionInfo = (processConnections(commentsField, modelMap.Post, modelMap) as any) as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();

        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.associatedWith).toEqual(modelMap.Comment.fields[0]);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('should return BELONGS_TO for Comment.post field connection info', () => {
        const postField = modelMap.Comment.fields[0];
        const connectionInfo = (processConnections(postField, modelMap.Comment, modelMap) as any) as CodeGenFieldConnectionBelongsTo;
        expect(connectionInfo).toBeDefined();

        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });
    });
    describe('One:One connection', () => {
      let modelMap: CodeGenModelMap;
      beforeEach(() => {
        const schema = /* GraphQL */ `
          type Person @model {
            license: License @connection(name: "PersonLicense")
          }

          type License @model {
            person: Person! @connection(name: "PersonLicense")
          }
        `;

        modelMap = {
          Person: {
            name: 'Person',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'License',
                isNullable: true,
                isList: false,
                name: 'license',
                directives: [{ name: 'connection', arguments: { name: 'PersonLicense' } }],
              },
            ],
          },
          License: {
            name: 'License',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Person',
                isNullable: false,
                isList: false,
                name: 'person',
                directives: [{ name: 'connection', arguments: { name: 'PersonLicense' } }],
              },
            ],
          },
        };
      });

      it('should return HAS_ONE Person.license field', () => {
        const licenseField = modelMap.Person.fields[0];
        const connectionInfo = (processConnections(licenseField, modelMap.Person, modelMap) as any) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.associatedWith).toEqual(modelMap.License.fields[0]);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
        expect(connectionInfo.targetName).toEqual("personLicenseId");
      });

      it('should return BELONGS_TO License.person field', () => {
        const personField = modelMap.License.fields[0];
        const connectionInfo = (processConnections(personField, modelMap.License, modelMap) as any) as CodeGenFieldConnectionBelongsTo;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('should throw error when the One:One connection has optional field on both sides', () => {
        const personField = modelMap.License.fields[0];
        // Make person field optional
        personField.isNullable = true;
        expect(() => {
          processConnections(personField, modelMap.License, modelMap);
        }).toThrowError('DataStore does not support 1 to 1 connection with both sides of connection as optional field');
      });
    });
  });
  describe('Uni-directional connection (unnamed connection)', () => {
    let modelMap: CodeGenModelMap;
    beforeEach(() => {
      const schema = /* GraphQL */ `
        type Post @model {
          comments: [Comment] @connection
        }

        type Comment @model {
          post: Post @connection
        }
      `;
      modelMap = {
        Post: {
          name: 'Post',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'Comment',
              isNullable: true,
              isList: true,
              name: 'comments',
              directives: [{ name: 'connection', arguments: {} }],
            },
          ],
        },
        Comment: {
          name: 'Comment',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'Post',
              isNullable: true,
              isList: false,
              name: 'post',
              directives: [{ name: 'connection', arguments: {} }],
            },
          ],
        },
      };
    });

    it('should return HAS_MANY for Post.comments', () => {
      const commentsField = modelMap.Post.fields[0];
      const connectionInfo = (processConnections(commentsField, modelMap.Post, modelMap) as any) as CodeGenFieldConnectionHasMany;
      expect(connectionInfo).toBeDefined();

      expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
      expect(connectionInfo.associatedWith).toEqual({
        name: 'postCommentsId',
        type: 'ID',
        isList: false,
        directives: [],
        isNullable: true,
      });
      expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
    });

    it('should return BELONGS_TO for Comment.post', () => {
      const commentsField = modelMap.Comment.fields[0];
      const connectionInfo = (processConnections(commentsField, modelMap.Comment, modelMap) as any) as CodeGenFieldConnectionBelongsTo;
      expect(connectionInfo).toBeDefined();

      expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
      expect(connectionInfo.targetName).toEqual('commentPostId');
      expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
    });
  });

  describe('connection v2', () => {
    let modelMap: CodeGenModelMap;

    beforeEach(() => {
      const schema = /* GraphQL */ `
        type Post @model {
          comments: [Comment] @connection(keyName: "byPost", fields: ["id"])
        }

        type Comment @model @key(name: "byPost", fields: ["postID", "content"]) {
          postID: ID!
          content: String!
          post: Post @connection(fields:['postID'])
        }
      `;
      modelMap = {
        Post: {
          name: 'Post',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'Comment',
              isNullable: true,
              isList: true,
              name: 'comments',
              directives: [{ name: 'connection', arguments: { keyName: 'byPost', fields: ['id'] } }],
            },
          ],
        },
        Comment: {
          name: 'Comment',
          type: 'model',
          directives: [{ name: 'key', arguments: { name: 'byPost', fields: ['postID', 'content'] } }],
          fields: [
            {
              type: 'id',
              isNullable: false,
              isList: false,
              name: 'postID',
              directives: [],
            },
            {
              type: 'String',
              isNullable: false,
              isList: false,
              name: 'content',
              directives: [],
            },
            {
              type: 'Post',
              isNullable: false,
              isList: false,
              name: 'post',
              directives: [{ name: 'connection', arguments: { fields: ['postID'] } }],
            },
          ],
        },
      };
    });

    it('should not throw error if connection directive has keyName', () => {
      const commentsField = modelMap.Post.fields[0];
      expect(() => processConnections(commentsField, modelMap.Post, modelMap)).not.toThrowError();
    });

    it('should support connection with @key on BELONGS_TO side', () => {
      const postField = modelMap.Comment.fields[2];
      const connectionInfo = (processConnections(postField, modelMap.Post, modelMap) as any) as CodeGenFieldConnectionBelongsTo;
      expect(connectionInfo).toBeDefined();
      expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
      expect(connectionInfo.targetName).toEqual(modelMap.Comment.fields[0].name);
      expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
    });
  });
  describe('getConnectedField', () => {
    describe('One to Many', () => {
      let modelMap: CodeGenModelMap;
      beforeEach(() => {
        const schema = /* GraphQL */ `
          type Post @model {
            comments: [Comment] @connection(name: "postConnection")
          }

          type Comment @model {
            post: Post @connection(name: "postConnection")
          }
        `;

        modelMap = {
          Post: {
            name: 'Post',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Comment',
                isNullable: true,
                isList: true,
                name: 'comments',
                directives: [{ name: 'connection', arguments: { name: 'postConnection' } }],
              },
            ],
          },
          Comment: {
            name: 'Comment',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Post',
                isNullable: true,
                isList: false,
                name: 'post',
                directives: [{ name: 'connection', arguments: { name: 'postConnection' } }],
              },
            ],
          },
        };
      });

      it('should return connected field when connection is Many to one', () => {
        const commentsField = modelMap.Post.fields[0];
        const postField = modelMap.Comment.fields[0];
        const commentModel = modelMap.Comment;
        const postModel = modelMap.Post;
        expect(getConnectedField(commentsField, postModel, commentModel)).toEqual(postField);
      });

      it('should return connected field when connection is One to Many', () => {
        const commentsField = modelMap.Post.fields[0];
        const postField = modelMap.Comment.fields[0];
        const commentModel = modelMap.Comment;
        const postModel = modelMap.Post;
        expect(getConnectedField(postField, commentModel, postModel)).toEqual(commentsField);
      });
    });

    describe('One to one', () => {
      let modelMap: CodeGenModelMap;
      beforeEach(() => {
        const schema = /* GraphQL */ `
          type Person @model {
            license: License @connection(name: "person-license")
          }

          type License @model {
            holder: Person! @connection(name: "person-license")
          }
        `;

        modelMap = {
          Person: {
            name: 'Person',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'License',
                isNullable: true,
                isList: false,
                name: 'license',
                directives: [{ name: 'connection', arguments: { name: 'person-license' } }],
              },
            ],
          },
          License: {
            name: 'License',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Person',
                isNullable: false,
                isList: false,
                name: 'holder',
                directives: [{ name: 'connection', arguments: { name: 'person-license' } }],
              },
            ],
          },
        };
      });

      it('should return connected field when connection is One to One', () => {
        const licenseField = modelMap.Person.fields[0];
        const holderField = modelMap.License.fields[0];
        const personModel = modelMap.Person;
        const licenseModel = modelMap.License;
        expect(getConnectedField(licenseField, personModel, licenseModel)).toEqual(holderField);
        expect(getConnectedField(holderField, licenseModel, personModel)).toEqual(licenseField);
      });
    });
  });

  describe('self referencing models', () => {
    let modelMap: CodeGenModelMap;
    beforeEach(() => {
      const schema = /* GraphQL */ `
        type Employee @model {
          name: String!
          supervisor: Employee @connection(name: "supervisorConnection")
          subordinates: [Employee] @connection(name: "supervisorConnection")
        }
      `;

      modelMap = {
        Employee: {
          name: 'Employee',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'String',
              isNullable: false,
              isList: false,
              name: 'name',
              directives: [],
            },
            {
              type: 'Employee',
              isNullable: true,
              isList: false,
              name: 'supervisor',
              directives: [{ name: 'connection', arguments: { name: 'supervisorConnection' } }],
            },
            {
              type: 'Employee',
              isNullable: true,
              isList: true,
              name: 'subordinates',
              directives: [{ name: 'connection', arguments: { name: 'supervisorConnection' } }],
            },
          ],
        },
      };
    });

    it('should return connected field', () => {
      const supervisorField = modelMap.Employee.fields[1];
      const subordinateField = modelMap.Employee.fields[2];
      const employeeModel = modelMap.Employee;
      expect(getConnectedField(supervisorField, employeeModel, employeeModel)).toEqual(subordinateField);
      expect(getConnectedField(subordinateField, employeeModel, employeeModel)).toEqual(supervisorField);
    });
  });

  describe('GraphQL vNext getConnectedField tests with @primaryKey and @index', () => {
    let hasOneWithFieldsModelMap: CodeGenModelMap;
    let hasOneNoFieldsModelMap: CodeGenModelMap;
    let v2ModelMap: CodeGenModelMap;
    let v2IndexModelMap: CodeGenModelMap;

    beforeEach(() => {
      const hasOneWithFieldsSchema = /* GraphQL */ `
        type BatteryCharger @model {
          chargerID: ID!
          powerSource: PowerSource @hasOne(fields: ["chargerID"])
        }

        type PowerSource @model {
          sourceID: ID! @primaryKey
          amps: Float!
          volts: Float!
        }
      `;

      const hasOneNoFieldsSchema = /* GraphQL */ `
        type BatteryCharger @model {
          powerSource: PowerSource @hasOne
        }

        type PowerSource @model {
          id: ID!
          amps: Float!
          volts: Float!
        }
      `;

      const v2Schema = /* GraphQL */ `
        type Post @model {
          comments: [Comment] @hasMany(fields: ["id"])
        }
        
        type Comment @model {
          postID: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          post: Post @belongsTo(fields:["postID"])
        }
      `;

      const v2IndexSchema = /* graphQL */ `
        type Post @model {
          id: ID!
          title: String!
          comments: [Comment] @hasMany(indexName: "byPost", fields: ["id"])
        }
        
        type Comment @model {
          id: ID!
          postID: ID! @index(name: "byPost", sortKeyFields: ["content"])
          content: String!
        }
      `;

      hasOneWithFieldsModelMap = {
        BatteryCharger: {
          name: 'BatteryCharger',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'chargerID',
              directives: []
            },
            {
              type: 'PowerSource',
              isNullable: true,
              isList: false,
              name: 'powerSource',
              directives: [{ name: 'hasOne', arguments: { fields: ['chargerID'] } }],
            },
          ],
        },
        PowerSource: {
          name: 'PowerSource',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'id',
              isNullable: false,
              isList: false,
              name: 'sourceID',
              directives: [{ name: 'primaryKey', arguments: {} }],
            },
            {
              type: 'Float',
              isNullable: false,
              isList: false,
              name: 'amps',
              directives: [],
            },
            {
              type: 'Float',
              isNullable: false,
              isList: false,
              name: 'volts',
              directives: [],
            },
          ],
        },
      };

      hasOneNoFieldsModelMap = {
        BatteryCharger: {
          name: 'BatteryCharger',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'PowerSource',
              isNullable: true,
              isList: false,
              name: 'powerSource',
              directives: [{ name: 'hasOne', arguments: {} }],
            },
          ],
        },
        PowerSource: {
          name: 'PowerSource',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'id',
              directives: []
            },
            {
              type: 'Float',
              isNullable: false,
              isList: false,
              name: 'amps',
              directives: [],
            },
            {
              type: 'Float',
              isNullable: false,
              isList: false,
              name: 'volts',
              directives: [],
            },
          ],
        },
      };

      v2ModelMap = {
        Post: {
          name: 'Post',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'Comment',
              isNullable: true,
              isList: true,
              name: 'comments',
              directives: [{ name: 'hasMany', arguments: { fields: ['id'] } }],
            },
          ],
        },
        Comment: {
          name: 'Comment',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'id',
              isNullable: false,
              isList: false,
              name: 'postID',
              directives: [{name: 'primaryKey', arguments: { sortKeyFields: ['content'] } }],
            },
            {
              type: 'String',
              isNullable: false,
              isList: false,
              name: 'content',
              directives: [],
            },
            {
              type: 'Post',
              isNullable: false,
              isList: false,
              name: 'post',
              directives: [{ name: 'belongsTo', arguments: { fields: ['postID'] } }],
            },
          ],
        },
      };

      v2IndexModelMap = {
        Post: {
          name: 'Post',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'id',
              directives: [],
            },
            {
              type: 'String',
              isNullable: false,
              isList: false,
              name: 'title',
              directives: [],
            },
            {
              type: 'Comment',
              isNullable: true,
              isList: true,
              name: 'comments',
              directives: [{ name: 'hasMany', arguments: { indexName: 'byPost', fields: ['id'] } }],
            },
          ],
        },
        Comment: {
          name: 'Comment',
          type: 'model',
          directives: [],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'id',
              directives: [],
            },
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'postID',
              directives: [{name: 'index', arguments: { name: 'byPost', sortKeyFields: ['content'] }}],
            },
            {
              type: 'String',
              isNullable: false,
              isList: false,
              name: 'content',
              directives: [],
            },
          ],
        },
      };
    });

    describe('Has many comparison', () => {
      it('should support connection with @primaryKey on BELONGS_TO side', () => {
        const postField = v2ModelMap.Comment.fields[2];
        const connectionInfo = (processConnectionsV2(postField, v2ModelMap.Post, v2ModelMap) as any) as CodeGenFieldConnectionBelongsTo;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.targetName).toEqual(v2ModelMap.Comment.fields[0].name);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('should support connection with @primaryKey on HAS_MANY side', () => {
        const commentsField = v2ModelMap.Post.fields[0];
        const connectionInfo = (processConnectionsV2(commentsField, v2ModelMap.Comment, v2ModelMap) as any) as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2ModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('Should support connection with @index on BELONGS_TO side', () => {
        const commentsField = v2IndexModelMap.Post.fields[2];
        const connectionInfo = (processConnectionsV2(commentsField, v2IndexModelMap.Comment, v2IndexModelMap) as any) as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2IndexModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });

    describe('Has one testing', () => {
      it('Should support @hasOne with no explicit primary key', () => {
        const powerSourceField = hasOneNoFieldsModelMap.BatteryCharger.fields[0];
        const connectionInfo = (processConnectionsV2(powerSourceField, hasOneNoFieldsModelMap.PowerSource, hasOneNoFieldsModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.connectedModel).toEqual(hasOneNoFieldsModelMap.PowerSource);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });
      it('Should support @hasOne with an explicit primary key', () => {
        const powerSourceField = hasOneWithFieldsModelMap.BatteryCharger.fields[1];
        const connectionInfo = (processConnectionsV2(powerSourceField, hasOneWithFieldsModelMap.PowerSource, hasOneWithFieldsModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.connectedModel).toEqual(hasOneWithFieldsModelMap.PowerSource);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });

    describe('manyToMany testing', () => {
      let simpleManyToManySchema;
      let simpleManyModelMap;
      let transformedSimpleManyModelMap;

      beforeEach(() => {
        simpleManyToManySchema = /* GraphQL */ `
          type Human @model {
            governmentID: ID! @primaryKey
            pets: [Animal] @manyToMany(relationName: "PetFriend")
          }
          
          type Animal @model {
            animalTag: ID!
            humanFriend: [Human] @manyToMany(relationName: "PetFriend")
          }
        `;

        simpleManyModelMap = {
          Human: {
            name: 'Human',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'ID',
                isNullable: false,
                isList: false,
                name: 'governmentID',
                directives: [{ name: 'primaryKey', arguments: {} }]
              },
              {
                type: 'Animal',
                isNullable: true,
                isList: true,
                name: 'pets',
                directives: [{ name: 'manyToMany', arguments: { relationName: 'PetFriend' } }]
              }
            ]
          },
          Animal: {
            name: 'Animal',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'ID',
                isNullable: false,
                isList: false,
                name: 'animalTag',
                directives: [],
              },
              {
                type: 'Human',
                isNullable: true,
                isList: true,
                name: 'postID',
                directives: [{ name: 'manyToMany', arguments: { relationName: 'PetFriend' } }]
              }
            ],
          }
        };
      });

      transformedSimpleManyModelMap = {
        Human: {
          name: 'Human',
          type: 'model',
          directives: [{name: 'model', arguments: {}}],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'governmentID',
              directives: [{ name: 'primaryKey', arguments: {} }]
            },
            {
              type: 'PetFriend',
              isNullable: true,
              isList: true,
              name: 'pets',
              directives: [{ name: 'hasMany', arguments: { fields: ['governmentID'] } }]
            }
          ]
        },
        Animal: {
          name: 'Animal',
          type: 'model',
          directives: [{name: 'model', arguments: {}}],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'animalTag',
              directives: [],
            },
            {
              type: 'PetFriend',
              isNullable: true,
              isList: true,
              name: 'postID',
              directives: [{ name: 'hasMany', arguments: { fields: ['id'] } }]
            }
          ],
        },
        PetFriend: {
          name: 'PetFriend',
          type: 'model',
          directives: [{name: 'model', arguments: {}}],
          fields: [
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'id',
              directives: []
            },
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'humanID',
              directives: [{ name: 'index', arguments: { name: 'byHuman', sortKeyFields: ['animalID'] } }]
            },
            {
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'animalID',
              directives: [{ name: 'index', arguments: { name: 'byAnimal', sortKeyFields: ['humanID'] } }]
            },
            {
              type: 'Human',
              isNullable: false,
              isList: false,
              name: 'human',
              directives: [{ name: 'belongsTo', arguments: { fields: ['humanID'] } }]
            },
            {
              type: 'Animal',
              isNullable: false,
              isList: false,
              name: 'animal',
              directives: [{ name: 'belongsTo', arguments: { fields: ['humanID'] } }]
            }
          ]
        }
      };

      it('Should correctly convert the model map of a simple manyToMany', () => {
        const visitor = getPipelinedTransformerVisitor(simpleManyToManySchema);
        let code = visitor.generate();

        expect(visitor.models.Human.fields.length).toEqual(5);
        expect(visitor.models.Human.fields[2].directives[0].name).toEqual('hasMany')
        expect(visitor.models.Human.fields[2].directives[0].arguments.fields.length).toEqual(1)
        expect(visitor.models.Human.fields[2].directives[0].arguments.fields[0]).toEqual('governmentID')
        expect(visitor.models.Human.fields[2].directives[0].arguments.indexName).toEqual('byHuman')
        expect(visitor.models.PetFriend).toBeDefined();
        expect(visitor.models.PetFriend.fields.length).toEqual(5);
        expect(visitor.models.PetFriend.fields[2].directives[0].name).toEqual('belongsTo')
        expect(visitor.models.PetFriend.fields[2].directives[0].arguments.fields.length).toEqual(1)
        expect(visitor.models.PetFriend.fields[2].directives[0].arguments.fields[0]).toEqual('animalID')
        expect(visitor.models.Animal.fields.length).toEqual(5);
        expect(visitor.models.Animal.fields[2].type).toEqual('PetFriend');
        expect(visitor.models.Animal.fields[2].directives.length).toEqual(1);
        expect(visitor.models.Animal.fields[2].directives[0].name).toEqual('hasMany');
        expect(visitor.models.Animal.fields[2].directives[0].arguments.fields.length).toEqual(1)
        expect(visitor.models.Animal.fields[2].directives[0].arguments.fields[0]).toEqual('id')
        expect(visitor.models.Animal.fields[2].directives[0].arguments.indexName).toEqual('byAnimal')
      });
    });
  });
});
