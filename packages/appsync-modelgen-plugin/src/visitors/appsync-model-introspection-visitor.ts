import { DEFAULT_SCALARS, NormalizedScalarsMap } from "@graphql-codegen/visitor-plugin-common";
import { GraphQLSchema } from "graphql";
import { Argument, AssociationType, Field, Fields, FieldType, ModelAttribute, ModelIntrospectionSchema, PrimaryKeyInfo, SchemaEnum, SchemaModel, SchemaMutation, SchemaNonModel, SchemaQuery, SchemaSubscription, Input, InputFieldType, SchemaConversationRoute } from "../interfaces/introspection";
import { METADATA_SCALAR_MAP } from "../scalars";
import { CodeGenConnectionType } from "../utils/process-connections";
import { RawAppSyncModelConfig, ParsedAppSyncModelConfig, AppSyncModelVisitor, CodeGenEnum, CodeGenField, CodeGenModel, CodeGenPrimaryKeyType, CodeGenQuery, CodeGenSubscription, CodeGenMutation, CodeGenInputObject, CodeGenInputObjectMap } from "./appsync-visitor";
import { pascalCase } from "change-case";
import { plural } from "pluralize";

const validateModelIntrospectionSchema = require('../validate-cjs');

type UnionFieldType = { union: string };
type InterfaceFieldType = { interface: string };

export interface RawAppSyncModelIntrospectionConfig extends RawAppSyncModelConfig { };
export interface ParsedAppSyncModelIntrospectionConfig extends ParsedAppSyncModelConfig { };
export class AppSyncModelIntrospectionVisitor<
  TRawConfig extends RawAppSyncModelIntrospectionConfig = RawAppSyncModelIntrospectionConfig,
  TPluginConfig extends ParsedAppSyncModelIntrospectionConfig = ParsedAppSyncModelIntrospectionConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  private readonly introspectionVersion = 1;
  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DEFAULT_SCALARS,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);
  }

  generate(): string {
    const shouldUseModelNameFieldInHasManyAndBelongsTo = false;
    // This flag is going to be used to tight-trigger on JS implementations only.
    const shouldImputeKeyForUniDirectionalHasMany = true;
    const shouldUseFieldsInAssociatedWithInHasOne = true;
    this.processDirectives(
      shouldUseModelNameFieldInHasManyAndBelongsTo,
      shouldImputeKeyForUniDirectionalHasMany,
      shouldUseFieldsInAssociatedWithInHasOne
    );

    const modelIntrosepctionSchema = this.generateModelIntrospectionSchema();
    if (!validateModelIntrospectionSchema(modelIntrosepctionSchema)) {
      throw new Error(`Data did not validate against the supplied schema. Underlying errors were ${JSON.stringify(validateModelIntrospectionSchema.errors)}`);
    }
    return JSON.stringify(modelIntrosepctionSchema, null, 4);
  }

  protected generateModelIntrospectionSchema(): ModelIntrospectionSchema {
    let result: ModelIntrospectionSchema = {
      version: this.introspectionVersion,
      models: {},
      enums: {},
      nonModels: {},
    };

    const models = Object.values(this.getSelectedModels()).reduce((acc, model: CodeGenModel) => {
      return { ...acc, [model.name]: this.generateModelMetadata(model) };
    }, {});
    const nonModels = Object.values(this.getSelectedNonModels()).reduce((acc, nonModel: CodeGenModel) => {
      return { ...acc, [nonModel.name]: this.generateNonModelMetadata(nonModel) };
    }, {});
    const enums = Object.values(this.enumMap).reduce((acc, enumObj) => {
      return { ...acc, [this.getEnumName(enumObj)]: this.generateEnumMetadata(enumObj) };
    }, {});
    result = { ...result, models, nonModels, enums };
    const queries = Object.values(this.queryMap).reduce((acc, queryObj: CodeGenQuery) => {
      // Skip the field if the field type is union/interface
      // TODO: Remove this skip once these types are supported for stakeholder usages
      const fieldType = this.getType(queryObj.type) as any;
      if (this.isUnionFieldType(fieldType) || this.isInterfaceFieldType(fieldType)) {
        return acc;
      }
      return { ...acc, [queryObj.name]: this.generateGraphQLOperationMetadata<CodeGenQuery, SchemaQuery>(queryObj) };
    }, {})
    const mutations = Object.values(this.mutationMap).reduce((acc, mutationObj: CodeGenMutation) => {
      // Skip the field if the field type is union/interface
      // TODO: Remove this skip once these types are supported for stakeholder usages
      const fieldType = this.getType(mutationObj.type) as any;
      if (this.isUnionFieldType(fieldType) || this.isInterfaceFieldType(fieldType) || mutationObj.directives.find((directive) => directive.name === 'conversation')) {
        return acc;
      }
      return { ...acc, [mutationObj.name]: this.generateGraphQLOperationMetadata<CodeGenMutation, SchemaMutation>(mutationObj) };
    }, {});
    const conversations = Object.values(this.mutationMap).reduce((acc, mutationObj: CodeGenMutation) => {
      if (!mutationObj.directives.find((directive) => directive.name === 'conversation')) {
        return acc;
      }
      return { ...acc, [mutationObj.name]: this.generateConversationMetadata(mutationObj) }
    }, {});
    const subscriptions = Object.values(this.subscriptionMap).reduce((acc, subscriptionObj: CodeGenSubscription) => {
      // Skip the field if the field type is union/interface
      // TODO: Remove this skip once these types are supported for stakeholder usages
      const fieldType = this.getType(subscriptionObj.type) as any;
      if (this.isUnionFieldType(fieldType) || this.isInterfaceFieldType(fieldType)) {
        return acc;
      }
      return { ...acc, [subscriptionObj.name]: this.generateGraphQLOperationMetadata<CodeGenSubscription, SchemaSubscription>(subscriptionObj) };
    }, {});
    const inputs = Object.values(this.inputObjectMap).reduce((acc, inputObj: CodeGenInputObject) => {
      return { ...acc, [inputObj.name]: this.generateGraphQLInputMetadata(inputObj) };
    }, {});
    if (Object.keys(queries).length > 0) {
      result = { ...result, queries };
    }
    if (Object.keys(mutations).length > 0) {
      result = { ...result, mutations };
    }
    if (Object.keys(conversations).length > 0) {
      result = { ...result, conversations }
    }
    if (Object.keys(subscriptions).length > 0) {
      result = { ...result, subscriptions };
    }
    if (Object.keys(inputs).length > 0) {
      result = { ...result, inputs }
    }
    return result;
  }

  private getFieldAssociation(field: CodeGenField): AssociationType | void {
    if (field.connectionInfo) {
      const { connectionInfo } = field;
      const connectionAttribute: any = { connectionType: connectionInfo.kind };
      if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
        connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
      } else if (connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
        connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
        connectionAttribute.targetNames = connectionInfo.targetNames ?? [];
      } else {
        connectionAttribute.targetNames = connectionInfo.targetNames;
      }
      return connectionAttribute;
    }
  }

  private generateModelAttributes(model: CodeGenModel): ModelAttribute[] {
    return model.directives.map(d => ({
      type: d.name,
      properties: d.arguments,
    }));
  }
  private generateModelMetadata(model: CodeGenModel): SchemaModel {
    return {
      ...this.generateNonModelMetadata(model),
      syncable: true,
      pluralName: this.pluralizeModelName(model),
      attributes: this.generateModelAttributes(model),
      primaryKeyInfo: this.generateModelPrimaryKeyInfo(model),
    };
  }

  private generateNonModelMetadata(nonModel: CodeGenModel): SchemaNonModel {
    return {
      name: this.getModelName(nonModel),
      fields: nonModel.fields.reduce((acc: Fields, field: CodeGenField) => {
        // Skip the field if the field type is union/interface
        // TODO: Remove this skip once these types are supported for stakeholder usages
        const fieldType = this.getType(field.type) as any;
        if (this.isUnionFieldType(fieldType) || this.isInterfaceFieldType(fieldType)) {
          return acc;
        }
        const fieldMeta: Field = {
          name: this.getFieldName(field),
          isArray: field.isList,
          type: fieldType,
          isRequired: !field.isNullable,
          attributes: [],
        };

        if (field.isListNullable !== undefined) {
          fieldMeta.isArrayNullable = field.isListNullable;
        }

        if (field.isReadOnly !== undefined) {
          fieldMeta.isReadOnly = field.isReadOnly;
        }

        const association: AssociationType | void = this.getFieldAssociation(field);
        if (association) {
          fieldMeta.association = association;
        }
        acc[field.name] = fieldMeta;
        return acc;
      }, {}),
    };
  }
  private generateEnumMetadata(enumObj: CodeGenEnum): SchemaEnum {
    return {
      name: enumObj.name,
      values: Object.values(enumObj.values),
    };
  }

  /**
   * Generate GraqhQL input object type metadata in model introspection schema from the codegen MIPR
   * @param inputObj input type object
   * @returns input type object metadata in model introspection schema
   */
  private generateGraphQLInputMetadata(inputObj: CodeGenInputObject): Input {
    return {
      name: inputObj.name,
      attributes: inputObj.inputValues.reduce((acc, param) => {
        const arg: Argument = {
          name: param.name,
          isArray: param.isList,
          type: this.getType(param.type) as InputFieldType,
          isRequired: !param.isNullable
        };
        if (param.isListNullable !== undefined) {
          arg.isArrayNullable = param.isListNullable;
        }
        return { ...acc, [param.name]: arg };
      }, {}),
    }
  }

  /**
   * Generate GraqhQL operation (query/mutation/subscription) metadata in model introspection schema from the codegen MIPR
   * @param operationObj operation object
   * @returns operation metadata in model introspection schema
   */
  private generateGraphQLOperationMetadata<T extends CodeGenField, V extends Field>(operationObj: T): V {
    const operationMeta = {
      name: operationObj.name,
      isArray: operationObj.isList,
      type: this.getType(operationObj.type),
      isRequired: !operationObj.isNullable,
    }
    if (operationObj.isListNullable !== undefined) {
      (operationMeta as V).isArrayNullable = operationObj.isListNullable;
    }
    if (operationObj.parameters && operationObj.parameters.length > 0) {
      (operationMeta as V).arguments = operationObj.parameters.reduce((acc, param) => {
        const arg: Argument = {
          name: param.name,
          isArray: param.isList,
          type: this.getType(param.type) as InputFieldType,
          isRequired: !param.isNullable
        };
        if (param.isListNullable !== undefined) {
          arg.isArrayNullable = param.isListNullable;
        }
        return { ...acc, [param.name]: arg };
      }, {})
    }
    return operationMeta as V;
  }

  private generateConversationMetadata(mutationObj: CodeGenMutation): SchemaConversationRoute {
    const routeName = pascalCase(mutationObj.name)
    const conversationModelName = `Conversation${routeName}`;
    const pluarlizedConversationModelName = plural(conversationModelName);
    const conversationMessageModelName = `ConversationMessage${routeName}`;
    const pluarlizedConversationMessageModelName = plural(conversationMessageModelName);
    // TODO: clean up schema model definition. Use utilities and/or move to a separate function.
    // The conversation / conversation message model definitions shouldn't be repeated here.
    // There should be a single source of truth within the transformer that's imported here -
    // similar to how the directive definitions work today.
    const conversationModel: SchemaModel = {
      name: conversationModelName,
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: []
        },
        name: {
          name: 'name',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: []
        },
        metadata: {
          name: 'metadata',
          isArray: false,
          type: 'AWSJSON',
          isRequired: false,
          attributes: []
        },
        messages: {
          name: 'messages',
          isArray: true,
          type: {
            model: conversationMessageModelName
          },
          isRequired: false,
          attributes: [],
          isArrayNullable: true,
          association: {
            connectionType: CodeGenConnectionType.HAS_MANY,
            associatedWith: [
              'sessionId'
            ]
          }
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true
        }
      },
      syncable: true,
      pluralName: pluarlizedConversationModelName,
      attributes: [
        {
          type: 'model',
          properties: {
            subscriptions: {
              level: 'off'
            },
            mutations: {
              update: null
            }
          }
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                provider: 'userPools',
                ownerField: 'owner',
                allow: 'owner',
                identityClaim: 'cognito:username',
                operations: [
                  'create',
                  'update',
                  'delete',
                  'read'
                ]
              }
            ]
          }
        }
      ],
      primaryKeyInfo: {
        isCustomPrimaryKey: false,
        primaryKeyFieldName: 'id',
        sortKeyFieldNames: []
      }
    }

    const conversationMessageModel: SchemaModel = {
      name: conversationMessageModelName,
      fields: {
        id: {
          name: 'id',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: []
        },
        sessionId: {
          name: 'sessionId',
          isArray: false,
          type: 'ID',
          isRequired: true,
          attributes: []
        },
        session: {
          name: 'session',
          isArray: false,
          type: {
            model: conversationModelName
          },
          isRequired: false,
          attributes: [],
          association: {
            connectionType: CodeGenConnectionType.BELONGS_TO,
            targetNames: [
              'sessionId'
            ]
          }
        },
        sender: {
          name: 'sender',
          isArray: false,
          type: {
            enum: 'ConversationMessageSender'
          },
          isRequired: false,
          attributes: []
        },
        content: {
          name: 'content',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: []
        },
        context: {
          name: 'context',
          isArray: false,
          type: 'AWSJSON',
          isRequired: false,
          attributes: []
        },
        uiComponents: {
          name: 'uiComponents',
          isArray: true,
          type: 'AWSJSON',
          isRequired: false,
          attributes: [],
          isArrayNullable: true
        },
        assistantContent: {
          name: 'assistantContent',
          isArray: false,
          type: 'String',
          isRequired: false,
          attributes: []
        },
        createdAt: {
          name: 'createdAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true
        },
        updatedAt: {
          name: 'updatedAt',
          isArray: false,
          type: 'AWSDateTime',
          isRequired: false,
          attributes: [],
          isReadOnly: true
        }
      },
      syncable: true,
      pluralName: pluarlizedConversationMessageModelName,
      attributes: [
        {
          type: 'model',
          properties: {
            subscriptions: {},
            mutations: {
              update: null
            }
          }
        },
        {
          type: 'auth',
          properties: {
            rules: [
              {
                provider: 'userPools',
                ownerField: 'owner',
                allow: 'owner',
                identityClaim: 'cognito:username',
                operations: [
                  'create',
                  'update',
                  'delete',
                  'read'
                ]
              }
            ]
          }
        }
      ],
      primaryKeyInfo: {
        isCustomPrimaryKey: false,
        primaryKeyFieldName: 'id',
        sortKeyFieldNames: []
      }
    };

    const route: SchemaConversationRoute = {
      name: mutationObj.name,
      models: {
        [conversationModelName]: conversationModel,
        [conversationMessageModelName]: conversationMessageModel
      },
      nonModels: {},
      enums: {
        ConversationMessageSender: {
          name: 'ConversationMessageSender',
          values: ['user', 'assistant'],
        }
      },
      conversation: {
        modelName: conversationModelName
      },
      message: {
        modelName: conversationMessageModelName,
        send: { ...this.generateGraphQLOperationMetadata<CodeGenMutation, SchemaMutation>(mutationObj), type: { model: conversationMessageModelName } },
        subscribe: {
          isArray: false,
          isRequired: false,
          name: `onCreateAssistantResponse${routeName}`,
          type: { model: `ConversationMessage${routeName}` },
          arguments: {
            'sessionId': {
              name: 'sessionId',
              isArray: false,
              isRequired: true,
              type: 'ID',
            },
          }
        }
      }
    };


    return route;
  }


  protected getType(gqlType: string): FieldType | InputFieldType | UnionFieldType | InterfaceFieldType {
    // Todo: Handle unlisted scalars
    if (gqlType in METADATA_SCALAR_MAP) {
      return METADATA_SCALAR_MAP[gqlType] as FieldType;
    }
    if (gqlType in this.enumMap) {
      return { enum: this.enumMap[gqlType].name };
    }
    if (gqlType in this.nonModelMap) {
      return { nonModel: gqlType };
    }
    if (gqlType in this.modelMap) {
      return { model: gqlType };
    }
    if (gqlType in this.inputObjectMap) {
      return { input: gqlType }
    }
    if (gqlType in this.unionMap) {
      return { union: gqlType }
    }
    if (gqlType in this.interfaceMap) {
      return { interface: gqlType }
    }
    throw new Error(`Unknown type ${gqlType} found during model introspection schema generation`);
  }

  private generateModelPrimaryKeyInfo(model: CodeGenModel): PrimaryKeyInfo {
    const primaryKeyField = this.getModelPrimaryKeyField(model);
    if (primaryKeyField && primaryKeyField.primaryKeyInfo) {
      const { primaryKeyType, sortKeyFields } = primaryKeyField.primaryKeyInfo;
      return {
        isCustomPrimaryKey: primaryKeyType === CodeGenPrimaryKeyType.CustomId,
        primaryKeyFieldName: this.getFieldName(primaryKeyField),
        sortKeyFieldNames: sortKeyFields.map(field => this.getFieldName(field))
      };
    }
    throw new Error(`No primary key found for model ${model.name}`);
  }

  private isUnionFieldType = (obj: any): obj is UnionFieldType => {
    return typeof obj === 'object' && typeof obj.union === 'string';
  }
  private isInterfaceFieldType = (obj: any): obj is InterfaceFieldType => {
    return typeof obj === 'object' && typeof obj.interface === 'string';
  }
}
