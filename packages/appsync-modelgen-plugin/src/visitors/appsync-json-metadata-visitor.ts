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
  CodeGenUnion,
  CodeGenInterface,
} from './appsync-visitor';
import { METADATA_SCALAR_MAP } from '../scalars';
export type JSONSchema = {
  models: JSONSchemaModels;
  enums: JSONSchemaEnums;
  nonModels: JSONSchemaTypes;
  interfaces: JSONSchemaInterfaces;
  unions: JSONSchemaUnions;
  version: string;
  codegenVersion: string;
};
export type JSONSchemaModels = Record<string, JSONSchemaModel>;
export type JSONSchemaTypes = Record<string, JSONSchemaNonModel>;
export type JSONSchemaInterfaces = Record<string, JSONSchemaInterface>;
export type JSONSchemaUnions = Record<string, JSONSchemaUnion>;
export type JSONSchemaNonModel = {
  name: string;
  fields: JSONModelFields;
};
export type JSONSchemaInterface = {
  name: string;
  fields: JSONModelFields;
};
export type JSONSchemaUnion = {
  name: string;
  types: JSONModelFieldType[];
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

type JSONModelFieldType = keyof typeof METADATA_SCALAR_MAP | { model: string } | { enum: string } | { nonModel: string } | { interface: string } | { union: string };
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

export interface RawAppSyncModelMetadataConfig extends RawAppSyncModelConfig {
  /**
   * @name metadataTarget
   * @type string
   * @description required, the language target for generated code
   *
   * @example
   * ```yml
   * generates:
   * Models:
   * config:
   *    target: 'metadata'
   *    metadataTarget: 'typescript'
   *  plugins:
   *    - amplify-codegen-appsync-model-plugin
   * ```
   * metadataTarget: 'javascript'| 'typescript' | 'typedeclration'
   */
  metadataTarget?: string;
}

export interface ParsedAppSyncModelMetadataConfig extends ParsedAppSyncModelConfig {
  metadataTarget: string;
}
export class AppSyncJSONVisitor<
  TRawConfig extends RawAppSyncModelMetadataConfig = RawAppSyncModelMetadataConfig,
  TPluginConfig extends ParsedAppSyncModelMetadataConfig = ParsedAppSyncModelMetadataConfig
> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
  constructor(
    schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: Partial<TPluginConfig>,
    defaultScalars: NormalizedScalarsMap = DEFAULT_SCALARS,
  ) {
    super(schema, rawConfig, additionalConfig, defaultScalars);
    this._parsedConfig.metadataTarget = rawConfig.metadataTarget || 'javascript';
  }
  generate(): string {
    // TODO: Remove us, leaving in to be explicit on why this flag is here.
    const shouldUseModelNameFieldInHasManyAndBelongsTo = false;
    // This flag is going to be used to tight-trigger on JS implementations only.
    const shouldImputeKeyForUniDirectionalHasMany = true;
    const shouldUseFieldsInAssociatedWithInHasOne = true;

    this.processDirectives(
      shouldUseModelNameFieldInHasManyAndBelongsTo,
      shouldImputeKeyForUniDirectionalHasMany,
      shouldUseFieldsInAssociatedWithInHasOne
    );

    if (this._parsedConfig.metadataTarget === 'typescript') {
      return this.generateTypeScriptMetadata();
    } else if (this._parsedConfig.metadataTarget === 'javascript') {
      return this.generateJavaScriptMetadata();
    } else if (this._parsedConfig.metadataTarget === 'typeDeclaration') {
      return this.generateTypeDeclaration();
    }
    throw new Error(`Unsupported metadataTarget ${this._parsedConfig.metadataTarget}. Supported targets are javascript and typescript`);
  }

  protected generateTypeScriptMetadata(): string {
    const metadataObj = this.generateMetadata();
    const metadata: string[] = [`import { Schema } from "@aws-amplify/datastore";`, ''];
    metadata.push(`export const schema: Schema = ${JSON.stringify(metadataObj, null, 4)};`);
    return metadata.join('\n');
  }

  protected generateJavaScriptMetadata(): string {
    const metadataObj = this.generateMetadata();
    const metadata: string[] = [];
    metadata.push(`export const schema = ${JSON.stringify(metadataObj, null, 4)};`);
    return metadata.join('\n');
  }

  protected generateTypeDeclaration() {
    return `import type { Schema, SchemaNonModel, ModelField, ModelFieldType } from '@aws-amplify/datastore';

type Replace<T, R> = Omit<T, keyof R> & R;
type WithFields = { fields: Record<string, ModelField> };
type SchemaTypes = Record<string, WithFields>;

export type ExtendModelFieldType = ModelField['type'] | { interface: string } | { union: string };
export type ExtendModelField = Replace<ModelField, { type: ExtendModelFieldType }>;
export type ExtendType<T extends WithFields> = Replace<T, { fields: Record<string, ExtendModelField> }>
export type ExtendFields<Types extends SchemaTypes | undefined> = {
  [TypeName in keyof Types]: ExtendType<Types[TypeName]>
}

type ExtendFieldsAll<T> = {
    [K in keyof T]: T[K] extends SchemaTypes | undefined ? ExtendFields<T[K]> : T[K];
};

export declare const schema: ExtendFieldsAll<Schema & {
    interfaces: Schema['nonModels'];
    unions?: Record<string, {name: string, types: ExtendModelFieldType[]}>;
}>;`;
  }

  protected generateJSONMetadata(): string {
    const metadata = this.generateMetadata();
    return JSON.stringify(metadata, null, 4);
  }

  protected generateMetadata(): JSONSchema {
    const result: JSONSchema = {
      models: {},
      enums: {},
      nonModels: {},
      interfaces: {},
      unions: {},
      // This is hard-coded for the schema version purpose instead of codegen version
      // To avoid the failure of validation method checkCodegenSchema in JS Datastore
      // The hard code is starting from amplify codegen major version 4
      codegenVersion: '3.4.4',
      version: this.computeVersion(),
    };

    const models = Object.values(this.getSelectedModels()).reduce((acc, model: CodeGenModel) => {
      return { ...acc, [model.name]: this.generateModelMetadata(model) };
    }, {});

    const nonModels = Object.values(this.getSelectedNonModels()).reduce((acc, nonModel: CodeGenModel) => {
      return { ...acc, [nonModel.name]: this.generateNonModelMetadata(nonModel) };
    }, {});

    const interfaces = Object.values(this.getSelectedInterfaces()).reduce((acc, codegenInterface: CodeGenInterface) => {
      return { ...acc, [codegenInterface.name]: this.generateInterfaceMetadata(codegenInterface) };
    }, {});

    const unions = Object.values(this.getSelectedUnions()).reduce((acc, union: CodeGenUnion) => {
      return { ...acc, [union.name]: this.generateUnionMetadata(union) };
    }, {});

    const enums = Object.values(this.enumMap).reduce((acc, enumObj) => {
      const enumV = this.generateEnumMetadata(enumObj);
      return { ...acc, [this.getEnumName(enumObj)]: enumV };
    }, {});
    return { ...result, models, nonModels: nonModels, enums, interfaces, unions };
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
      fields: this.generateFieldsMetadata(nonModel.fields)
    };
  }

  private generateInterfaceMetadata(codeGenInterface: CodeGenInterface): JSONSchemaInterface {
    return {
      name: codeGenInterface.name,
      fields: this.generateFieldsMetadata(codeGenInterface.fields),
    };
  }

  private generateUnionMetadata(codeGenUnion: CodeGenUnion): JSONSchemaUnion {
    return {
      name: codeGenUnion.name,
      types: codeGenUnion.typeNames.map(t => this.getType(t))
    };
  }

  private generateEnumMetadata(enumObj: CodeGenEnum): JSONSchemaEnum {
    return {
      name: enumObj.name,
      values: Object.values(enumObj.values),
    };
  }

  private generateFieldsMetadata(fields: CodeGenField[]): JSONModelFields {
    return fields.reduce((acc: JSONModelFields, field: CodeGenField) => {
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
    }, {})
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
    if (gqlType in this.interfaceMap) {
      return { interface: this.interfaceMap[gqlType].name };
    }
    if (gqlType in this.unionMap) {
      return { union: this.unionMap[gqlType].name };
    }
    if (gqlType in this.modelMap) {
      return { model: gqlType };
    }
    throw new Error(`Unknown type ${gqlType}`);
  }
}
