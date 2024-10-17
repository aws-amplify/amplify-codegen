import { CodeGenConnectionType, Field, FieldAttribute, FieldType, PrimaryKeyInfo, SchemaConversationRoute, SchemaModel, SchemaMutation, SchemaSubscription } from '../interfaces/introspection';
import { pascalCase } from 'change-case';
import { plural } from 'pluralize';
import { CodeGenMutation } from '../visitors/appsync-visitor';

/**
 * Generates metadata for a conversation model based on a mutation object.
 * @param mutationObj - The mutation object to generate conversation metadata from.
 * @param generateGraphQLOperationMetadata - A function to generate GraphQL operation metadata.
 * @returns The generated conversation route schema.
 */
export function processConversationRoute(
  mutationObj: CodeGenMutation,
  generateGraphQLOperationMetadata: <T extends CodeGenMutation, V extends SchemaMutation>(operationObj: T) => V
): SchemaConversationRoute {
  const routeName = pascalCase(mutationObj.name);
  const conversationModelName = `Conversation${routeName}`;
  const conversationMessageModelName = `ConversationMessage${routeName}`;

  return {
    name: mutationObj.name,
    models: {
      [conversationModelName]: generateConversationModel(conversationModelName, conversationMessageModelName),
      [conversationMessageModelName]: generateConversationMessageModel(conversationModelName, conversationMessageModelName),
    },
    nonModels: {},
    enums: {
      ConversationParticipantRole: {
        name: 'ConversationParticipantRole',
        values: ['user', 'assistant'],
      }
    },
    conversation: {
      modelName: conversationModelName
    },
    message: {
      modelName: conversationMessageModelName,
      send: {
        ...generateGraphQLOperationMetadata<CodeGenMutation, SchemaMutation>(mutationObj),
        type: { model: conversationMessageModelName }
      },
      subscribe: generateSubscriptionMetadata(routeName, conversationMessageModelName),
    }
  };
}

/**
 * Generates a conversation model schema.
 * @param modelName - The name of the conversation model.
 * @param messageModelName - The name of the associated message model.
 * @returns The generated conversation model schema.
 */
function generateConversationModel(modelName: string, messageModelName: string): SchemaModel {
  return {
    name: modelName,
    fields: {
      id: generateField('id', 'ID', { isRequired: true }),
      name: generateField('name', 'String'),
      metadata: generateField('metadata', 'AWSJSON'),
      messages: generateMessagesField(messageModelName),
      createdAt: generateTimestampField('createdAt'),
      updatedAt: generateTimestampField('updatedAt'),
    },
    syncable: true,
    pluralName: plural(modelName),
    attributes: [
      {
        type: 'model',
        properties: {
          subscriptions: { level: 'off' },
          mutations: { update: null }
        }
      },
      generateAuthAttribute()
    ],
    primaryKeyInfo: generatePrimaryKeyInfo(),
  };
}

/**
 * Generates a conversation message model schema.
 * @param conversationModelName - The name of the associated conversation model.
 * @param modelName - The name of the message model.
 * @returns The generated conversation message model schema.
 */
function generateConversationMessageModel(conversationModelName: string, modelName: string): SchemaModel {
  return {
    name: modelName,
    fields: {
      id: generateField('id', 'ID', { isRequired: true }),
      conversationId: generateField('conversationId', 'ID', { isRequired: true }),
      conversation: generateConversationField(conversationModelName),
      role: generateField('role', { enum: 'ConversationParticipantRole' }),
      content: generateField('content', { nonModel: 'ContentBlock' }, { isArray: true }),
      aiContext: generateField('aiContext', 'AWSJSON'),
      toolConfiguration: generateField('toolConfiguration', { nonModel: 'ToolConfiguration' }, { isArray: true, isArrayNullable: true }),
      createdAt: generateTimestampField('createdAt'),
      updatedAt: generateTimestampField('updatedAt'),
    },
    syncable: true,
    pluralName: plural(modelName),
    attributes: [
      {
        type: 'model',
        properties: {
          subscriptions: {}
        }
      },
      generateAuthAttribute()
    ],
    primaryKeyInfo: generatePrimaryKeyInfo(),
  };
}

// Helper functions for generating common field structures

function generateField(name: string, type: FieldType, options: { isRequired?: boolean; isArray?: boolean; isArrayNullable?: boolean, isReadOnly?: boolean } = {}): Field {
  const { isRequired = false, isArray = false, isArrayNullable, isReadOnly } = options;
  return {
    name,
    type,
    attributes: [],
    isArray,
    isRequired,
    isReadOnly,
    ...(isArray && { isArrayNullable }),
  };
}

function generateTimestampField(name: string): Field {
  return {
    ...generateField(name, 'AWSDateTime', { isReadOnly: true }),
    isReadOnly: true,
  };
}

function generateMessagesField(messageModelName: string): Field {
  return {
    ...generateField('messages', { model: messageModelName }, { isArray: true, isArrayNullable: true }),
    association: {
      connectionType: CodeGenConnectionType.HAS_MANY,
      associatedWith: ['conversationId']
    }
  };
}

function generateConversationField(conversationModelName: string): Field {
  return {
    ...generateField('conversation', { model: conversationModelName }),
    association: {
      connectionType: CodeGenConnectionType.BELONGS_TO,
      targetNames: ['conversationId']
    }
  };
}

function generateAuthAttribute(): FieldAttribute {
  return {
    type: 'auth',
    properties: {
      rules: [
        {
          provider: 'userPools',
          ownerField: 'owner',
          allow: 'owner',
          identityClaim: 'cognito:username',
          operations: ['create', 'update', 'delete', 'read']
        }
      ]
    }
  };
}

function generatePrimaryKeyInfo(): PrimaryKeyInfo {
  return {
    isCustomPrimaryKey: false,
    primaryKeyFieldName: 'id',
    sortKeyFieldNames: []
  };
}

function generateSubscriptionMetadata(routeName: string, modelName: string): SchemaSubscription {
  return {
    isArray: false,
    isRequired: false,
    name: `onCreateAssistantResponse${routeName}`,
    type: { nonModel: 'ConversationMessageStreamPart' },
    arguments: {
      'conversationId': {
        name: 'conversationId',
        isArray: false,
        isRequired: true,
        type: 'ID',
      },
    }
  };
}
