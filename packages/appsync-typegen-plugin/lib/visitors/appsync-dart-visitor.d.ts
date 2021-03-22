import { AppSyncModelVisitor, ParsedAppSyncModelConfig, RawAppSyncTypeConfig, CodeGenModel, CodeGenField } from './appsync-visitor';
import { DartDeclarationBlock } from '../languages/dart-declaration-block';
export declare class AppSyncModelDartVisitor<TRawConfig extends RawAppSyncTypeConfig = RawAppSyncTypeConfig, TPluginConfig extends ParsedAppSyncModelConfig = ParsedAppSyncModelConfig> extends AppSyncModelVisitor<TRawConfig, TPluginConfig> {
    generate(): string;
    protected validateReservedKeywords(): void;
    protected generateClassLoader(): string;
    protected generateEnums(): string;
    protected generateModelClasses(): string;
    protected generatePackageHeader(): string;
    protected generateModelClass(model: CodeGenModel): string;
    protected generateModelType(model: CodeGenModel): string;
    protected generateModelField(field: CodeGenField, value: string, classDeclarationBlock: DartDeclarationBlock): void;
    protected generateGetIdMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateConstructor(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateEqualsMethodAndOperator(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateHashCodeMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateToStringMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateCopyWithMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateSerializationMethod(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateModelSchema(model: CodeGenModel, classDeclarationBlock: DartDeclarationBlock): void;
    protected generateQueryField(model: CodeGenModel, field: CodeGenField, declarationBlock: DartDeclarationBlock): void;
    protected getQueryFieldName(field: CodeGenField): string;
    protected generateSchemaField(model: CodeGenModel, declarationBlock: DartDeclarationBlock): void;
    protected generateAuthRules(model: CodeGenModel): string;
    protected generateAddFields(model: CodeGenModel): string;
    protected getNonConnectedField(model: CodeGenModel): CodeGenField[];
    protected formatDartCode(dartCode: string): string;
    protected isFieldRequired(field: CodeGenField): boolean;
}
//# sourceMappingURL=appsync-dart-visitor.d.ts.map