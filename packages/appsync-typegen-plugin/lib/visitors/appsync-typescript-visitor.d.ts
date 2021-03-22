import { AppSyncModelVisitor, CodeGenEnum, CodeGenField, CodeGenModel, ParsedAppSyncModelConfig, RawAppSyncTypeConfig } from './appsync-visitor';
export interface RawAppSyncModelTypeScriptConfig extends RawAppSyncTypeConfig {
}
export interface ParsedAppSyncModelTypeScriptConfig extends ParsedAppSyncModelConfig {
    isDeclaration: boolean;
}
export declare class AppSyncModelTypeScriptVisitor<TRawConfig extends RawAppSyncModelTypeScriptConfig = RawAppSyncModelTypeScriptConfig, TPluginConfig extends ParsedAppSyncModelTypeScriptConfig = ParsedAppSyncModelTypeScriptConfig> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
    protected SCALAR_TYPE_MAP: {
        [key: string]: string;
    };
    protected IMPORT_STATEMENTS: string[];
    generate(): string;
    protected generateImports(): string;
    protected generateEnumDeclarations(enumObj: CodeGenEnum, exportEnum?: boolean): string;
    protected generateModelDeclaration(modelObj: CodeGenModel, isDeclaration?: boolean): string;
    protected generateModelInitialization(models: CodeGenModel[], includeTypeInfo?: boolean): string;
    protected generateExports(modelsOrEnum: (CodeGenModel | CodeGenEnum)[]): string;
    protected generateModelTypeDeclarationName(model: CodeGenModel): string;
    protected generateModelImportAlias(model: CodeGenModel): string;
    protected generateModelImportName(model: CodeGenModel): string;
    protected generateModelExportName(model: CodeGenModel): string;
    protected getListType(typeStr: string, field: CodeGenField): string;
    protected getNativeType(field: CodeGenField): string;
}
//# sourceMappingURL=appsync-typescript-visitor.d.ts.map