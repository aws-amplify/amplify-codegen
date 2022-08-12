import { DEFAULT_SCALARS, NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';
import { GraphQLSchema } from 'graphql';
import { CodeGenConnectionType } from '../utils/process-connections';
import {
  AppSyncModelVisitor,
  CodeGenField,
  CodeGenModel,
  ParsedAppSyncModelConfig,
  RawAppSyncModelConfig,
  CodeGenEnum,
} from './appsync-visitor';
import { METADATA_SCALAR_MAP } from '../scalars';
import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

export type JSONSchema = {
  models: JSONSchemaModels;
  enums: JSONSchemaEnums;
  nonModels: JSONSchemaTypes;
  version: string;
};

export type JSONSchemaModels = Record<string, JSONSchemaModel>;

export type JSONSchemaTypes = Record<string, JSONSchemaNonModel>;

export type JSONSchemaNonModel = {
  name: string;
  fields: JSONModelFields;
};

type JSONSchemaModel = {
  name: string;
  attributes?: JSONModelAttributes;
  fields: JSONModelFields;
  pluralName: String;
  syncable?: boolean;
};

type JSONSchemaEnums = Record<string, JSONSchemaEnum>;

type JSONSchemaEnum = {
  name: string;
  values: string[];
};

type JSONModelAttributes = JSONModelAttribute[];

type JSONModelAttribute = { type: string; properties?: Record<string, any> };

type JSONModelFields = Record<string, JSONModelField>;

type AssociationBaseType = {
  connectionType: CodeGenConnectionType;
};

export type AssociationHasMany = AssociationBaseType & {
  connectionType: CodeGenConnectionType.HAS_MANY;
  associatedWith: string;
};

type AssociationHasOne = AssociationHasMany & {
  connectionType: CodeGenConnectionType.HAS_ONE;
  targetName: string;
};

type AssociationBelongsTo = AssociationBaseType & {
  targetName: string;
};

type AssociationType = AssociationHasMany | AssociationHasOne | AssociationBelongsTo;

type JSONModelFieldType = keyof typeof METADATA_SCALAR_MAP | { model: string } | { enum: string } | { nonModel: string };

type JSONModelField = {
  name: string;
  type: JSONModelFieldType;
  isArray: boolean;
  isRequired?: boolean;
  isArrayNullable?: boolean;
  isReadOnly?: boolean;
  attributes?: JSONModelFieldAttributes;
  association?: AssociationType;
};

type JSONModelFieldAttributes = JSONModelFieldAttribute[];

type JSONModelFieldAttribute = JSONModelAttribute;

export interface RawAppSyncModelMetadataConfig extends RawAppSyncModelConfig {}

export interface ParsedAppSyncModelMetadataConfig extends ParsedAppSyncModelConfig {
  metadataTarget: string;
}

export class AppSyncModelIntrospectionVisitor<
  TRawConfig extends RawAppSyncModelMetadataConfig = RawAppSyncModelMetadataConfig,
  TPluginConfig extends ParsedAppSyncModelMetadataConfig = ParsedAppSyncModelMetadataConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  schemaValidator: Ajv.ValidateFunction;

  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DEFAULT_SCALARS,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);

    const modelIntrospectionSchemaText = fs.readFileSync(path.join(__dirname, '..', '..', 'resources', 'ModelIntrospection.schema.json'), 'utf8');
    const modelIntrospectionSchema = JSON.parse(modelIntrospectionSchemaText);
    this.schemaValidator = new Ajv().compile(modelIntrospectionSchema); // options can be passed, e.g. {allErrors: true}
  }

  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = false;
    this.processDirectives(shouldUseModelNameFieldInHasManyAndBelongsTo);
    const modelIntrospectionSchema = this.generateModelIntrospection();

    // Validate
    const valid = this.schemaValidator(modelIntrospectionSchema)
    if (!valid) {
      console.log(this.schemaValidator.errors);
    }

    // Return
    return JSON.stringify(modelIntrospectionSchema, null, 4);
  }

  protected generateModelIntrospection(): JSONSchema {
    const result: JSONSchema = {
      models: {},
      enums: {},
      nonModels: {},
      version: this.computeVersion(),
    };

    const models = Object.values(this.getSelectedModels()).reduce((acc, model: CodeGenModel) => {
      return { ...acc, [model.name]: this.generateModelMetadata(model) };
    }, {});

    const nonModels = Object.values(this.getSelectedNonModels()).reduce((acc, nonModel: CodeGenModel) => {
      return { ...acc, [nonModel.name]: this.generateNonModelMetadata(nonModel) };
    }, {});

    const enums = Object.values(this.enumMap).reduce((acc, enumObj) => {
      const enumV = this.generateEnumMetadata(enumObj);
      return { ...acc, [this.getEnumName(enumObj)]: enumV };
    }, {});
    return { ...result, models, nonModels: nonModels, enums }
  }

  private getFieldAssociation(field: CodeGenField): AssociationType | void {
    if (field.connectionInfo) {
      const { connectionInfo } = field;
      const connectionAttribute: any = { connectionType: connectionInfo.kind };
      if (connectionInfo.kind === CodeGenConnectionType.HAS_MANY) {
        if (this.isCustomPKEnabled()) {
          connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
        } else {
          connectionAttribute.associatedWith = this.getFieldName(connectionInfo.associatedWith);
        }
      } else if (connectionInfo.kind === CodeGenConnectionType.HAS_ONE) {
        if (this.isCustomPKEnabled()) {
          connectionAttribute.associatedWith = connectionInfo.associatedWithFields.map(f => this.getFieldName(f));
          connectionAttribute.targetNames = connectionInfo.targetNames;
        } else {
          connectionAttribute.associatedWith = this.getFieldName(connectionInfo.associatedWith);
          connectionAttribute.targetName = connectionInfo.targetName;
        }
      } else {
        if (this.isCustomPKEnabled()) {
          connectionAttribute.targetNames = connectionInfo.targetNames;
        } else {
          connectionAttribute.targetName = connectionInfo.targetName;
        }
      }
      return connectionAttribute;
    }
  }

  private generateModelAttributes(model: CodeGenModel): JSONModelAttributes {
    return model.directives.map(d => ({
      type: d.name,
      properties: d.arguments,
    }));
  }

  private generateModelMetadata(model: CodeGenModel): JSONSchemaModel {
    return {
      ...this.generateNonModelMetadata(model),
      syncable: true,
      pluralName: this.pluralizeModelName(model),
      attributes: this.generateModelAttributes(model),
    };
  }

  private generateNonModelMetadata(nonModel: CodeGenModel): JSONSchemaNonModel {
    return {
      name: this.getModelName(nonModel),
      fields: nonModel.fields.reduce((acc: JSONModelFields, field: CodeGenField) => {
        const fieldMeta: JSONModelField = {
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
        acc[fieldMeta.name] = fieldMeta;
        return acc;
      }, {}),
    };
  }

  private generateEnumMetadata(enumObj: CodeGenEnum): JSONSchemaEnum {
    return {
      name: enumObj.name,
      values: Object.values(enumObj.values),
    };
  }

  private getType(gqlType: string): JSONModelFieldType {
    // Todo: Handle unlisted scalars
    if (gqlType in METADATA_SCALAR_MAP) {
      return METADATA_SCALAR_MAP[gqlType as keyof typeof METADATA_SCALAR_MAP];
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
}
