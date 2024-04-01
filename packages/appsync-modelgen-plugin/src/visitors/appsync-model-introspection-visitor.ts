import { DEFAULT_SCALARS, NormalizedScalarsMap } from "@graphql-codegen/visitor-plugin-common";
import { GraphQLSchema } from "graphql";
import { AssociationType, Field, Fields, FieldType, ModelAttribute, ModelIntrospectionSchema, PrimaryKeyInfo, SchemaEnum, SchemaModel, SchemaNonModel } from "../interfaces/introspection";
import { METADATA_SCALAR_MAP } from "../scalars";
import { CodeGenConnectionType } from "../utils/process-connections";
import { RawAppSyncModelConfig, ParsedAppSyncModelConfig, AppSyncModelVisitor, CodeGenEnum, CodeGenField, CodeGenModel, CodeGenPrimaryKeyType } from "./appsync-visitor";
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export interface RawAppSyncModelIntrospectionConfig extends RawAppSyncModelConfig {};
export interface ParsedAppSyncModelIntrospectionConfig extends ParsedAppSyncModelConfig {};
export class AppSyncModelIntrospectionVisitor<
  TRawConfig extends RawAppSyncModelIntrospectionConfig = RawAppSyncModelIntrospectionConfig,
  TPluginConfig extends ParsedAppSyncModelIntrospectionConfig = ParsedAppSyncModelIntrospectionConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  private readonly introspectionVersion = 1;
  private schemaValidator: Ajv.ValidateFunction;
  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DEFAULT_SCALARS,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);
    const modelIntrospectionSchemaText = fs.readFileSync(path.join(__dirname, '..', '..', 'schemas', 'introspection', this.introspectionVersion.toString(), 'ModelIntrospectionSchema.json'), 'utf8');
    const modelIntrospectionSchema = JSON.parse(modelIntrospectionSchemaText);
    this.schemaValidator = new Ajv().compile(modelIntrospectionSchema);
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
    if (!this.schemaValidator(modelIntrosepctionSchema)) {
      throw new Error(`Data did not validate against the supplied schema. Underlying errors were ${JSON.stringify(this.schemaValidator.errors)}`);
    }
    return JSON.stringify(modelIntrosepctionSchema, null, 4);
  }

  protected generateModelIntrospectionSchema(): ModelIntrospectionSchema {
    const result: ModelIntrospectionSchema = {
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
    return { ...result, models, nonModels, enums };
  }

  private getFieldAssociation(field: CodeGenField): AssociationType | void {
    if (field.connectionInfo) {
      const { connectionInfo } = field;
      const connectionAttribute: any = { connectionType: connectionInfo.kind };
      if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
        connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
      } else if (connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
          connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
          connectionAttribute.targetNames = connectionInfo.targetNames;
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
        const fieldMeta: Field = {
          name: this.getFieldName(field),
          isArray: field.isList,
          type: this.getType(field.type),
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

  protected getType(gqlType: string): FieldType {
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
    throw new Error(`Unknown type ${gqlType}`);
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
}