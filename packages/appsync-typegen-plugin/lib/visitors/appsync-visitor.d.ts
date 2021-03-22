import { BaseVisitor, NormalizedScalarsMap, ParsedConfig, RawConfig } from '@graphql-codegen/visitor-plugin-common';
import { EnumTypeDefinitionNode, FieldDefinitionNode, GraphQLNamedType, GraphQLSchema, ObjectTypeDefinitionNode } from 'graphql';
import { CodeGenFieldConnection } from '../utils/process-connections';
export declare enum CodeGenGenerateEnum {
    metadata = "metadata",
    code = "code",
    loader = "loader"
}
export interface RawAppSyncTypeConfig extends RawConfig {
    target: string;
    selectedType?: string;
    generate?: CodeGenGenerateEnum;
    directives?: string;
}
export interface ParsedAppSyncModelConfig extends ParsedConfig {
    selectedType?: string;
    generate?: CodeGenGenerateEnum;
}
export declare type CodeGenArgumentsMap = Record<string, any>;
export declare type CodeGenDirective = {
    name: string;
    arguments: CodeGenArgumentsMap;
};
export declare type CodeGenDirectives = CodeGenDirective[];
export declare type CodeGenField = TypeInfo & {
    name: string;
    directives: CodeGenDirectives;
    connectionInfo?: CodeGenFieldConnection;
};
export declare type TypeInfo = {
    type: string;
    isList: boolean;
    isNullable: boolean;
    isListNullable?: boolean;
    baseType?: GraphQLNamedType | null;
};
export declare type CodeGenModel = {
    name: string;
    type: 'model';
    directives: CodeGenDirectives;
    fields: CodeGenField[];
};
export declare type CodeGenEnum = {
    name: string;
    type: 'enum';
    values: CodeGenEnumValueMap;
};
export declare type CodeGenModelMap = {
    [modelName: string]: CodeGenModel;
};
export declare type CodeGenEnumValueMap = {
    [enumConvertedName: string]: string;
};
export declare type CodeGenEnumMap = Record<string, CodeGenEnum>;
export declare class AppSyncModelVisitor<TRawConfig extends RawAppSyncTypeConfig = RawAppSyncTypeConfig, TPluginConfig extends ParsedAppSyncModelConfig = ParsedAppSyncModelConfig> extends BaseVisitor<TRawConfig, TPluginConfig> {
    protected _schema: GraphQLSchema;
    protected READ_ONLY_FIELDS: string[];
    protected SCALAR_TYPE_MAP: Record<string, string>;
    protected modelMap: CodeGenModelMap;
    protected nonModelMap: CodeGenModelMap;
    protected enumMap: CodeGenEnumMap;
    protected typesToSkip: string[];
    constructor(_schema: GraphQLSchema, rawConfig: TRawConfig, additionalConfig: Partial<TPluginConfig>, defaultScalars?: NormalizedScalarsMap);
    ObjectTypeDefinition(node: ObjectTypeDefinitionNode, index?: string | number, parent?: any): void;
    FieldDefinition(node: FieldDefinitionNode): CodeGenField;
    EnumTypeDefinition(node: EnumTypeDefinitionNode): void;
    processDirectives(): void;
    generate(): string;
    private getDirectives;
    private getDirectiveArguments;
    protected getSelectedModels(): CodeGenModelMap;
    protected getSelectedNonModels(): CodeGenModelMap;
    protected getSelectedEnums(): CodeGenEnumMap;
    protected selectedTypeIsEnum(): boolean;
    protected selectedTypeIsNonModel(): boolean;
    protected getNativeType(field: CodeGenField): string;
    protected getListType(typeStr: string, field: CodeGenField): string;
    protected getFieldName(field: CodeGenField): string;
    protected getEnumName(enumField: CodeGenEnum | string): string;
    protected getModelName(model: CodeGenModel): string;
    protected getNonModelName(model: CodeGenModel): string;
    protected getEnumValue(value: string): string;
    protected isEnumType(field: CodeGenField): boolean;
    protected isModelType(field: CodeGenField): boolean;
    protected isNonModelType(field: CodeGenField): boolean;
    protected computeVersion(): string;
    protected sortFields(model: CodeGenModel): void;
    protected ensureIdField(model: CodeGenModel): void;
    protected processConnectionDirective(): void;
    protected processAuthDirectives(): void;
    protected pluralizeModelName(model: CodeGenModel): string;
    get models(): CodeGenModelMap;
    get enums(): Record<string, CodeGenEnum>;
    get nonModels(): CodeGenModelMap;
}
//# sourceMappingURL=appsync-visitor.d.ts.map