import { DefaultDirectives } from '@aws-amplify/graphql-directives';
import { CodeGenModelMap, CodeGenModel, CodeGenField } from '../../visitors/appsync-visitor';
import { processConnectionsV2 } from '../../utils/process-connections-v2';
import {
  CodeGenConnectionType,
  CodeGenFieldConnectionBelongsTo,
  CodeGenFieldConnectionHasMany,
  CodeGenFieldConnectionHasOne,
} from '../../utils/process-connections';
import { buildSchema, parse, visit } from 'graphql';
import { scalars } from '../../scalars/supported-scalars';
import { AppSyncModelVisitor, CodeGenGenerateEnum } from '../../visitors/appsync-visitor';

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
          post: Post @belongsTo(fields: ["postID"])
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
              directives: [],
            },
            {
              type: 'ID',
              isNullable: true,
              isList: false,
              name: 'powerSourceID',
              directives: [],
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
              type: 'ID',
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
              directives: [],
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
              type: 'ID',
              isNullable: false,
              isList: false,
              name: 'postID',
              directives: [{ name: 'primaryKey', arguments: { sortKeyFields: ['content'] } }],
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
              directives: [{ name: 'index', arguments: { name: 'byPost', sortKeyFields: ['content'] } }],
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
        const connectionInfo = processConnectionsV2(postField, v2ModelMap.Comment, v2ModelMap) as any as CodeGenFieldConnectionBelongsTo;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.targetName).toEqual(v2ModelMap.Comment.fields[0].name);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('should support connection with @primaryKey on HAS_MANY side', () => {
        const commentsField = v2ModelMap.Post.fields[0];
        const connectionInfo = processConnectionsV2(commentsField, v2ModelMap.Post, v2ModelMap) as any as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2ModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('Should support connection with @index on BELONGS_TO side', () => {
        const commentsField = v2IndexModelMap.Post.fields[2];
        const connectionInfo = processConnectionsV2(
          commentsField,
          v2IndexModelMap.Post,
          v2IndexModelMap,
        ) as any as CodeGenFieldConnectionHasMany;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(v2IndexModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });

    describe('Has one testing', () => {
      it('Should support @hasOne with no explicit primary key', () => {
        const powerSourceField = hasOneNoFieldsModelMap.BatteryCharger.fields[0];
        const connectionInfo = processConnectionsV2(
          powerSourceField,
          hasOneNoFieldsModelMap.BatteryCharger,
          hasOneNoFieldsModelMap,
        ) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_ONE);
        expect(connectionInfo.connectedModel).toEqual(hasOneNoFieldsModelMap.PowerSource);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });
      it('Should support @hasOne with an explicit primary key', () => {
        const powerSourceField = hasOneWithFieldsModelMap.BatteryCharger.fields[2];
        const connectionInfo = processConnectionsV2(
          powerSourceField,
          hasOneWithFieldsModelMap.BatteryCharger,
          hasOneWithFieldsModelMap,
        ) as CodeGenFieldConnectionHasOne;
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
                type: 'ID',
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
                type: 'String',
                isNullable: true,
                isList: false,
                name: 'likeString',
                directives: [],
              },
            ],
          },
        };
        const connectionInfo = processConnectionsV2(modelMap.Post.fields[0], modelMap.Post, modelMap);
        expect(connectionInfo?.kind).toEqual(CodeGenConnectionType.HAS_ONE);
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
        }`;

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
        const connectionInfo = processConnectionsV2(
          projectField,
          belongsToModelMap.Team2,
          belongsToModelMap,
        ) as CodeGenFieldConnectionHasOne;
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
        const connectionInfo = processConnectionsV2(postField, hasManyModelMap.Blog, hasManyModelMap) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Post);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('Should detect second has many', () => {
        const commentField = hasManyModelMap.Post.fields[3];
        const connectionInfo = processConnectionsV2(commentField, hasManyModelMap.Post, hasManyModelMap) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.HAS_MANY);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Comment);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(true);
      });

      it('Should detect first belongsTo', () => {
        const blogField = hasManyModelMap.Post.fields[2];
        const connectionInfo = processConnectionsV2(blogField, hasManyModelMap.Post, hasManyModelMap) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Blog);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });

      it('Should detect second belongsTo', () => {
        const postField = hasManyModelMap.Comment.fields[1];
        const connectionInfo = processConnectionsV2(postField, hasManyModelMap.Comment, hasManyModelMap) as CodeGenFieldConnectionHasOne;
        expect(connectionInfo).toBeDefined();
        expect(connectionInfo.kind).toEqual(CodeGenConnectionType.BELONGS_TO);
        expect(connectionInfo.connectedModel).toEqual(hasManyModelMap.Post);
        expect(connectionInfo.isConnectingFieldAutoCreated).toEqual(false);
      });
    });
  });
});

describe('Connection process with custom Primary Key support tests', () => {
  const createBaseVisitorWithCustomPrimaryKeyEnabled = (schema: string) => {
    const visitorConfig = {
      usePipelinedTransformer: true,
      isTimestampFieldsAdded: true,
      respectPrimaryKeyAttributesOnConnectionField: true,
      transformerVersion: 2,
    };
    const ast = parse(schema);
    const directives = DefaultDirectives.map((directive) => directive.definition).join('\n');
    const builtSchema = buildSchema([schema, directives, scalars].join('\n'));
    const visitor = new AppSyncModelVisitor(
      builtSchema,
      { directives, target: 'general', ...visitorConfig },
      { generate: CodeGenGenerateEnum.code },
    );
    visit(ast, { leave: visitor });
    return visitor;
  };
  describe('hasOne tests', () => {
    it('should return correct connection info in hasOne uni direction', () => {
      const schema = /* GraphQL */ `
        type Project @model {
          projectId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          team: Team @hasOne
        }
        type Team @model {
          teamId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const project: CodeGenModel = modelMap.Project;
      const team: CodeGenModel = modelMap.Team;
      const projectTeamField = project.fields.find((f) => f.name === 'team')!;
      const hasOneRelationInfo = processConnectionsV2(projectTeamField, project, modelMap, false, true);
      expect(hasOneRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: team.fields[0],
        associatedWithFields: [team.fields[0], team.fields[1]],
        targetName: 'projectTeamTeamId',
        targetNames: ['projectTeamTeamId', 'projectTeamName'],
        connectedModel: team,
        isConnectingFieldAutoCreated: true,
      });
    });
    it('should return correct connection info in hasOne/belongsTo bi direction', () => {
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
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const project: CodeGenModel = modelMap.Project;
      const team: CodeGenModel = modelMap.Team;
      const projectTeamField = project.fields.find((f) => f.name === 'team')!;
      const teamProjectField = team.fields.find((f) => f.name === 'project')!;
      const hasOneRelationInfo = processConnectionsV2(projectTeamField, project, modelMap, false, true);
      expect(hasOneRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: teamProjectField,
        associatedWithFields: [teamProjectField],
        targetName: 'projectTeamTeamId',
        targetNames: ['projectTeamTeamId', 'projectTeamName'],
        connectedModel: team,
        isConnectingFieldAutoCreated: true,
      });
      const belongsToRelationInfo = processConnectionsV2(teamProjectField, team, modelMap, false, true);
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'teamProjectProjectId',
        targetNames: ['teamProjectProjectId', 'teamProjectName'],
        connectedModel: project,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });
  });
  describe('hasMany tests', () => {
    it('should return correct connection info in hasMany uni direction', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          postId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }
        type Comment @model {
          commentId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const post: CodeGenModel = modelMap.Post;
      const comment: CodeGenModel = modelMap.Comment;
      const postCommentsField = post.fields.find((f) => f.name === 'comments')!;
      const hasManyRelationInfo = processConnectionsV2(postCommentsField, post, modelMap, false, true);
      const postCommentsPKField: CodeGenField = {
        name: 'postCommentsPostId',
        type: 'ID',
        isNullable: true,
        isList: false,
        directives: [],
      };
      const postCommentsSKField: CodeGenField = {
        name: 'postCommentsTitle',
        type: 'String',
        isNullable: true,
        isList: false,
        directives: [],
      };
      expect(hasManyRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: postCommentsPKField,
        associatedWithFields: [postCommentsPKField, postCommentsSKField],
        connectedModel: comment,
        isConnectingFieldAutoCreated: true,
      });
    });
    it('should return correct connection info in hasMany/belongsTo bi direction when in native platforms', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          postId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }
        type Comment @model {
          commentId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          post: Post @belongsTo
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const post: CodeGenModel = modelMap.Post;
      const comment: CodeGenModel = modelMap.Comment;
      const postCommentsField = post.fields.find((f) => f.name === 'comments')!;
      const commentPostField = comment.fields.find((f) => f.name === 'post')!;
      //Model name field is used in asscociatedWith in native platforms
      const hasManyRelationInfo = processConnectionsV2(postCommentsField, post, modelMap, true, true);
      expect(hasManyRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: commentPostField,
        associatedWithFields: [commentPostField],
        connectedModel: comment,
        isConnectingFieldAutoCreated: true,
      });
      const belongsToRelationInfo = processConnectionsV2(commentPostField, comment, modelMap, false, true);
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'postCommentsPostId',
        targetNames: ['postCommentsPostId', 'postCommentsTitle'],
        connectedModel: post,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });
    it('should return correct connection info in hasMany/belongsTo bi direction when in JS platforms', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          postId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany
        }
        type Comment @model {
          commentId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          post: Post @belongsTo
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const post: CodeGenModel = modelMap.Post;
      const comment: CodeGenModel = modelMap.Comment;
      const postCommentsField = post.fields.find((f) => f.name === 'comments')!;
      const commentPostField = comment.fields.find((f) => f.name === 'post')!;
      const postCommentsPKField: CodeGenField = {
        name: 'postCommentsPostId',
        type: 'ID',
        isNullable: true,
        isList: false,
        directives: [],
      };
      const postCommentsSKField: CodeGenField = {
        name: 'postCommentsTitle',
        type: 'String',
        isNullable: true,
        isList: false,
        directives: [],
      };
      //Model name field is used in asscociatedWith in native platforms
      const hasManyRelationInfo = processConnectionsV2(postCommentsField, post, modelMap, false, true);
      expect(hasManyRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: postCommentsPKField,
        associatedWithFields: [postCommentsPKField, postCommentsSKField],
        connectedModel: comment,
        isConnectingFieldAutoCreated: true,
      });
      const belongsToRelationInfo = processConnectionsV2(commentPostField, comment, modelMap, false, true);
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'postCommentsPostId',
        targetNames: ['postCommentsPostId', 'postCommentsTitle'],
        connectedModel: post,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });
    it('should return correct connection info in hasMany/belongsTo bi direction when index is defined', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          postId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany(indexName: "byPost", fields: ["postId", "title"])
        }
        type Comment @model {
          commentId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          post: Post @belongsTo(fields: ["postId", "postTitle"])
          postId: ID! @index(name: "byPost", sortKeyFields: ["postTitle"])
          postTitle: String!
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const post: CodeGenModel = modelMap.Post;
      const comment: CodeGenModel = modelMap.Comment;
      const postCommentsField = post.fields.find((f) => f.name === 'comments')!;
      const commentPostField = comment.fields.find((f) => f.name === 'post')!;
      const hasManyRelationInfo = processConnectionsV2(postCommentsField, post, modelMap, false, true);
      expect(hasManyRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: commentPostField,
        associatedWithFields: [commentPostField],
        connectedModel: comment,
        isConnectingFieldAutoCreated: false,
      });
      const belongsToRelationInfo = processConnectionsV2(commentPostField, comment, modelMap, false, true);
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'postId',
        targetNames: ['postId', 'postTitle'],
        connectedModel: post,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });
    it('should return correct connection info in hasMany uni direction when index is defined', () => {
      const schema = /* GraphQL */ `
        type Post @model {
          postId: ID! @primaryKey(sortKeyFields: ["title"])
          title: String!
          comments: [Comment] @hasMany(indexName: "byPost", fields: ["postId", "title"])
        }
        type Comment @model {
          commentId: ID! @primaryKey(sortKeyFields: ["content"])
          content: String!
          postId: ID! @index(name: "byPost", sortKeyFields: ["postTitle"])
          postTitle: String!
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const post: CodeGenModel = modelMap.Post;
      const comment: CodeGenModel = modelMap.Comment;
      const postCommentsField = post.fields.find((f) => f.name === 'comments')!;
      const commentPostIdField = comment.fields.find((f) => f.name === 'postId')!;
      const hasManyRelationInfo = processConnectionsV2(postCommentsField, post, modelMap, false, true);
      expect(hasManyRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_MANY,
        associatedWith: commentPostIdField,
        associatedWithFields: [commentPostIdField],
        connectedModel: comment,
        isConnectingFieldAutoCreated: false,
      });
    });
  });

  describe('belongsTo special case tests', () => {
    it('should return correct connection info in multiple hasOne defined in parent', () => {
      const schema = /* GraphQL */ `
        type Project @model {
          projectId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          devTeam: Team @hasOne
          productTeam: Team @hasOne
        }
        type Team @model {
          teamId: ID! @primaryKey(sortKeyFields: ["name"])
          name: String!
          project: Project @belongsTo
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const project: CodeGenModel = modelMap.Project;
      const team: CodeGenModel = modelMap.Team;
      const projectDevTeamField = project.fields.find((f) => f.name === 'devTeam')!;
      const projectProductTeamField = project.fields.find((f) => f.name === 'productTeam')!;
      const teamProjectField = team.fields.find((f) => f.name === 'project')!;
      const hasOneRelationInfoDevTeam = processConnectionsV2(projectDevTeamField, project, modelMap, false, true);
      const hasOneRelationInfoProductTeam = processConnectionsV2(projectProductTeamField, project, modelMap, false, true);
      expect(hasOneRelationInfoDevTeam).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: teamProjectField,
        associatedWithFields: [teamProjectField],
        targetName: 'projectDevTeamTeamId',
        targetNames: ['projectDevTeamTeamId', 'projectDevTeamName'],
        connectedModel: team,
        isConnectingFieldAutoCreated: true,
      });
      expect(hasOneRelationInfoProductTeam).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: teamProjectField,
        associatedWithFields: [teamProjectField],
        targetName: 'projectProductTeamTeamId',
        targetNames: ['projectProductTeamTeamId', 'projectProductTeamName'],
        connectedModel: team,
        isConnectingFieldAutoCreated: true,
      });
      const belongsToRelationInfo = processConnectionsV2(teamProjectField, team, modelMap, false, true);
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'teamProjectProjectId',
        targetNames: ['teamProjectProjectId', 'teamProjectName'],
        connectedModel: project,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });

    it('With shouldUseFieldsInAssociatedWithInHasOne and CPK enabled, should return correct connection info for bi-directional has-one with composite primary key', () => {
      const schema = /* GraphQL */ `
        type CompositeOwner @model {
          lastName: ID! @primaryKey(sortKeyFields: ["firstName"])
          firstName: String!
          compositeDog: CompositeDog @hasOne
        }
        type CompositeDog @model {
          name: ID! @primaryKey(sortKeyFields: ["description"])
          description: String!
          compositeOwner: CompositeOwner @belongsTo
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const compositeOwner: CodeGenModel = modelMap.CompositeOwner;
      const compositeDog: CodeGenModel = modelMap.CompositeDog;
      const hasOneField = compositeOwner.fields.find((f) => f.name === 'compositeDog')!;
      const belongsToField = compositeDog.fields.find((f) => f.name === 'compositeOwner')!;
      const hasOneAssociatedWithFields = compositeDog.fields.filter((f) => f.name === 'name' || f.name === 'description')!;
      const hasOneRelationInfo = processConnectionsV2(hasOneField, compositeOwner, modelMap, false, true, true);
      const belongsToRelationInfo = processConnectionsV2(belongsToField, compositeDog, modelMap, false, true, true);
      expect(hasOneRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: hasOneAssociatedWithFields[0],
        associatedWithFields: hasOneAssociatedWithFields,
        targetName: 'compositeOwnerCompositeDogName',
        targetNames: ['compositeOwnerCompositeDogName', 'compositeOwnerCompositeDogDescription'],
        connectedModel: compositeDog,
        isConnectingFieldAutoCreated: true,
      });
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'compositeDogCompositeOwnerLastName',
        targetNames: ['compositeDogCompositeOwnerLastName', 'compositeDogCompositeOwnerFirstName'],
        connectedModel: compositeOwner,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });

    it('With shouldUseFieldsInAssociatedWithInHasOne and CPK enabled, should return correct connection info for bi-directional has-one without Composite primary key', () => {
      const schema = /* GraphQL */ `
        type BoringOwner @model {
          id: ID!
          name: String
          boringDog: BoringDog @hasOne
        }
        type BoringDog @model {
          id: ID!
          name: String
          boringOwner: BoringOwner @belongsTo
        }
      `;
      const modelMap: CodeGenModelMap = createBaseVisitorWithCustomPrimaryKeyEnabled(schema).models;
      const boringOwner: CodeGenModel = modelMap.BoringOwner;
      const boringDog: CodeGenModel = modelMap.BoringDog;
      const hasOneField = boringOwner.fields.find((f) => f.name === 'boringDog')!;
      const belongsToField = boringDog.fields.find((f) => f.name === 'boringOwner')!;
      const hasOneAssociatedWithFields = boringDog.fields.filter((f) => f.name === 'id')!;
      const hasOneRelationInfo = processConnectionsV2(hasOneField, boringOwner, modelMap, false, true, true);
      const belongsToRelationInfo = processConnectionsV2(belongsToField, boringDog, modelMap, false, true, true);
      expect(hasOneRelationInfo).toEqual({
        kind: CodeGenConnectionType.HAS_ONE,
        associatedWith: hasOneAssociatedWithFields[0],
        associatedWithFields: hasOneAssociatedWithFields,
        targetName: 'boringOwnerBoringDogId',
        targetNames: ['boringOwnerBoringDogId'],
        connectedModel: boringDog,
        isConnectingFieldAutoCreated: true,
      });
      expect(belongsToRelationInfo).toEqual({
        kind: CodeGenConnectionType.BELONGS_TO,
        targetName: 'boringDogBoringOwnerId',
        targetNames: ['boringDogBoringOwnerId'],
        connectedModel: boringOwner,
        isConnectingFieldAutoCreated: false,
        isUsingReferences: false,
      });
    });
  });
});
