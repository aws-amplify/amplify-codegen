import { CodeGenModelMap } from '../../visitors/appsync-visitor';
import { processConnectionsV2 } from '../../utils/process-connections-v2';
import {
  CodeGenConnectionType,
  CodeGenFieldConnectionBelongsTo,
  CodeGenFieldConnectionHasMany,
  CodeGenFieldConnectionHasOne,
} from '../../utils/process-connections';

describe('GraphQL V2 process connections tests', () => {
  describe('GraphQL vNext getConnectedField tests with @primaryKey and @index', () => {
    let hasOneWithFieldsModelMap: CodeGenModelMap;
    let hasOneNoFieldsModelMap: CodeGenModelMap;
    let v2ModelMap: CodeGenModelMap;
    let v2IndexModelMap: CodeGenModelMap;

    beforeEach(() => {
      const hasOneWithFieldsSchema = /* GraphQL */ `
          type BatteryCharger @model {
            chargerID: ID!
            powerSourceID: ID
            powerSource: PowerSource @hasOne(fields: ["powerSourceID"])
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
              type: 'ID',
              isNullable: true,
              isList: false,
              name: 'powerSourceID',
              directives: []
            },
            {
              type: 'PowerSource',
              isNullable: true,
              isList: false,
              name: 'powerSource',
              directives: [{ name: 'hasOne', arguments: { fields: ['powerSourceID'] } }],
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
        const connectionInfo = (processConnectionsV2(postField, v2ModelMap.Comment, v2ModelMap) as any) as CodeGenFieldConnectionBelongsTo;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.targetName).toEqual(v2ModelMap.Comment.fields[0].name);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('should support connection with @primaryKey on HAS_MANY side', () => {
        const commentsField = v2ModelMap.Post.fields[0];
        const connectionInfo = (processConnectionsV2(commentsField, v2ModelMap.Post, v2ModelMap) as any) as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2ModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('Should support connection with @index on BELONGS_TO side', () => {
        const commentsField = v2IndexModelMap.Post.fields[2];
        const connectionInfo = (processConnectionsV2(commentsField, v2IndexModelMap.Post, v2IndexModelMap) as any) as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2IndexModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });

    describe('Has one testing', () => {
      it('Should support @hasOne with no explicit primary key', () => {
        const powerSourceField = hasOneNoFieldsModelMap.BatteryCharger.fields[0];
        const connectionInfo = (processConnectionsV2(powerSourceField, hasOneNoFieldsModelMap.BatteryCharger, hasOneNoFieldsModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.connectedModel).toEqual(hasOneNoFieldsModelMap.PowerSource);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });
      it('Should support @hasOne with an explicit primary key', () => {
        const powerSourceField = hasOneWithFieldsModelMap.BatteryCharger.fields[2];
        const connectionInfo = (processConnectionsV2(powerSourceField, hasOneWithFieldsModelMap.BatteryCharger, hasOneWithFieldsModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.connectedModel).toEqual(hasOneWithFieldsModelMap.PowerSource);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
      it('disambiguates multiple connection directives in related type based on field type', () => {
        const modelMap: CodeGenModelMap = {
          Post: {
            name: 'Post',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'Comment',
                isNullable: true,
                isList: false,
                name: 'comment',
                directives: [{ name: 'hasOne', arguments: {} }],
              },
              {
                type: 'ID',
                isNullable: false,
                isList: false,
                name: 'id',
                directives: [],
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
                name: 'id',
                directives: [],
              },
              {
                type: 'Like',
                isNullable: true,
                isList: true,
                name: 'likes',
                directives: [{ name: 'hasMany', arguments: { indexName: 'byComment', fields: ['id'] } }],
              },
            ],
          },
          Like: {
            name: 'Like',
            type: 'model',
            directives: [],
            fields: [
              {
                type: 'string',
                isNullable: true,
                isList: false,
                name: 'likeString',
                directives: [],
              },
            ],
          },
        };
        const connectionInfo = processConnectionsV2(modelMap.Post.fields[0], modelMap.Post, modelMap);
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        console.log(connectionInfo);
        expect((connectionInfo as CodeGenFieldConnectionHasOne).associatedWith.name).toEqual('id');
      });
    });

    describe('BelongsTo testing', () => {
      const schema = `
        type Project2 @model {
          id: ID!
          name: String
          team: Team2 @hasOne 
        } 
        
        type Team2 @model {
          id: ID!
          name: String!
          project: Project2! @belongsTo
        }`

      const belongsToModelMap: CodeGenModelMap = {
        Project2: {
          name: 'Project2',
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
              isNullable: true,
              isList: false,
              name: 'name',
              directives: [],
            },
            {
              type: 'Team2',
              isNullable: true,
              isList: false,
              name: 'team',
              directives: [{ name: 'hasOne', arguments: {} }],
            },
          ],
        },
        Team2: {
          name: 'Team2',
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
              name: 'name',
              directives: [],
            },
            {
              type: 'Project2',
              isNullable: false,
              isList: false,
              name: 'project',
              directives: [{ name: 'belongsTo', arguments: {} }],
            },
          ],
        },
      };

      it('Should support belongsTo and detect connected field', () => {
        const projectField = belongsToModelMap.Team2.fields[2];
        const connectionInfo = (processConnectionsV2(projectField, belongsToModelMap.Team2, belongsToModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.connectedModel).toEqual(belongsToModelMap.Project2);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });

    describe('hasMany Testing', () => {
      const schema = `
        type Blog @model {
          id: ID!
          name: String!
          posts: [Post] @hasMany
        }
        
        type Post @model {
          id: ID!
          title: String!
          blog: Blog @belongsTo
          comments: [Comment] @hasMany
        }
        
        type Comment @model {
          id: ID!
          post: Post @belongsTo
          content: String!
        }`;

      const hasManyModelMap: CodeGenModelMap = {
        Blog: {
          name: 'Blog',
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
              name: 'name',
              directives: [],
            },
            {
              type: 'Post',
              isNullable: true,
              isList: true,
              name: 'posts',
              directives: [{ name: 'hasMany', arguments: {} }],
            },
          ],
        },
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
              type: 'Blog',
              isNullable: true,
              isList: false,
              name: 'blog',
              directives: [{ name: 'belongsTo', arguments: {} }],
            },
            {
              type: 'Comment',
              isNullable: true,
              isList: true,
              name: 'comments',
              directives: [{ name: 'hasMany', arguments: {} }],
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
              type: 'Post',
              isNullable: true,
              isList: false,
              name: 'post',
              directives: [{ name: 'belongsTo', arguments: {} }],
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

      it('Should detect first has many', () => {
        const postField = hasManyModelMap.Blog.fields[2];
        const connectionInfo = (processConnectionsV2(postField, hasManyModelMap.Blog, hasManyModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Post);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('Should detect second has many', () => {
        const commentField = hasManyModelMap.Post.fields[3];
        const connectionInfo = (processConnectionsV2(commentField, hasManyModelMap.Post, hasManyModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('Should detect first belongsTo', () => {
        const blogField = hasManyModelMap.Post.fields[2];
        const connectionInfo = (processConnectionsV2(blogField, hasManyModelMap.Post, hasManyModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Blog);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('Should detect second belongsTo', () => {
        const postField = hasManyModelMap.Comment.fields[1];
        const connectionInfo = (processConnectionsV2(postField, hasManyModelMap.Comment, hasManyModelMap)) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Post);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });
  });
});
