import { NormalizedScalarsMap } from '@graphql-codegen/visitor-plugin-common';
import { GraphQLSchema } from 'graphql';
import { AppSyncModelTypeScriptVisitor } from './appsync-typescript-visitor';
import { CodeGenEnum, CodeGenModel, ParsedAppSyncModelConfig, RawAppSyncTypeConfig } from './appsync-visitor';
export interface RawAppSyncModelJavaScriptConfig extends RawAppSyncTypeConfig {
    isDeclaration?: boolean;
}
export interface ParsedAppSyncModelJavaScriptConfig extends ParsedAppSyncModelConfig {
    isDeclaration: boolean;
}
export declare class AppSyncModelJavascriptVisitor<TRawConfig extends RawAppSyncModelJavaScriptConfig = RawAppSyncModelJavaScriptConfig, TPluginConfig extends ParsedAppSyncModelJavaScriptConfig = ParsedAppSyncModelJavaScriptConfig> extends AppSyncModelTypeScriptVisitor<TRawConfig, TPluginConfig> {
    protected IMPORT_STATEMENTS: string[];
    constructor(schema: GraphQLSchema, rawConfig: TRawConfig, additionalConfig: Partial<TPluginConfig>, defaultScalars?: NormalizedScalarsMap);
    generate(): string;
    protected generateEnumObject(enumObj: CodeGenEnum, exportEnum?: boolean): string;
    protected generateImportsJavaScriptImplementation(): string;
    protected generateModelTypeDeclarationName(model: CodeGenModel): string;
}
//# sourceMappingURL=appsync-javascript-visitor.d.ts.map