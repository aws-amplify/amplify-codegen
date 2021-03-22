import { NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';
import { GraphQLSchema } from 'graphql';
import { CodeGenConnectionType } from '../utils/process-connections';
import { AppSyncModelVisitor, ParsedAppSyncModelConfig, RawAppSyncTypeConfig } from './appsync-visitor';
import { METADATA_SCALAR_MAP } from '../scalars';
export declare type JSONSchema = {
    models: JSONSchemaModels;
    enums: JSONSchemaEnums;
    nonModels: JSONSchemaTypes;
    version: string;
};
export declare type JSONSchemaModels = Record<string, JSONSchemaModel>;
export declare type JSONSchemaTypes = Record<string, JSONSchemaNonModel>;
export declare type JSONSchemaNonModel = {
    name: string;
    fields: JSONModelFields;
};
declare type JSONSchemaModel = {
    name: string;
    attributes?: JSONModelAttributes;
    fields: JSONModelFields;
    pluralName: String;
    syncable?: boolean;
};
declare type JSONSchemaEnums = Record<string, JSONSchemaEnum>;
declare type JSONSchemaEnum = {
    name: string;
    values: string[];
};
declare type JSONModelAttributes = JSONModelAttribute[];
declare type JSONModelAttribute = {
    type: string;
    properties?: Record<string, any>;
};
declare type JSONModelFields = Record<string, JSONModelField>;
declare type AssociationBaseType = {
    connectionType: CodeGenConnectionType;
};
export declare type AssociationHasMany = AssociationBaseType & {
    connectionType: CodeGenConnectionType.HAS_MANY;
    associatedWith: string;
};
declare type AssociationHasOne = AssociationHasMany & {
    connectionType: CodeGenConnectionType.HAS_ONE;
    targetName: string;
};
declare type AssociationBelongsTo = AssociationBaseType & {
    targetName: string;
};
declare type AssociationType = AssociationHasMany | AssociationHasOne | AssociationBelongsTo;
declare type JSONModelFieldType = keyof typeof METADATA_SCALAR_MAP | {
    model: string;
} | {
    enum: string;
} | {
    nonModel: string;
};
declare type JSONModelField = {
    name: string;
    type: JSONModelFieldType;
    isArray: boolean;
    isRequired?: boolean;
    isArrayNullable?: boolean;
    attributes?: JSONModelFieldAttributes;
    association?: AssociationType;
};
declare type JSONModelFieldAttributes = JSONModelFieldAttribute[];
declare type JSONModelFieldAttribute = JSONModelAttribute;
export interface RawAppSyncModelMetadataConfig extends RawAppSyncTypeConfig {
    metadataTarget?: string;
}
export interface ParsedAppSyncModelMetadataConfig extends ParsedAppSyncModelConfig {
    metadataTarget: string;
}
export declare class AppSyncJSONVisitor<TRawConfig extends RawAppSyncModelMetadataConfig = RawAppSyncModelMetadataConfig, TPluginConfig extends ParsedAppSyncModelMetadataConfig = ParsedAppSyncModelMetadataConfig> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
    constructor(schema: GraphQLSchema, rawConfig: TRawConfig, additionalConfig: Partial<TPluginConfig>, defaultScalars?: NormalizedScalarsMap);
    generate(): string;
    protected generateTypeScriptMetadata(): string;
    protected generateJavaScriptMetadata(): string;
    protected generateTypeDeclaration(): string;
    protected generateJSONMetadata(): string;
    protected generateMetadata(): JSONSchema;
    private getFieldAssociation;
    private generateModelAttributes;
    private generateModelMetadata;
    private generateNonModelMetadata;
    private generateEnumMetadata;
    private getType;
}
export {};
//# sourceMappingURL=appsync-json-metadata-visitor.d.ts.map