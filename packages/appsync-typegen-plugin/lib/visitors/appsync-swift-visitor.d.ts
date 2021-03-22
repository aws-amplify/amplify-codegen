import { SwiftDeclarationBlock } from '../languages/swift-declaration-block';
import { AppSyncModelVisitor, CodeGenField, CodeGenModel } from './appsync-visitor';
export declare class AppSyncSwiftVisitor extends AppSyncModelVisitor {
    protected modelExtensionImports: string[];
    protected imports: string[];
    generate(): string;
    generateStruct(): string;
    generateEnums(): string;
    generateNonModelType(): string;
    generateSchema(): string;
    generateCodingKeys(name: string, model: CodeGenModel, extensionDeclaration: SwiftDeclarationBlock): void;
    generateModelSchema(name: string, model: CodeGenModel, extensionDeclaration: SwiftDeclarationBlock): void;
    protected generateClassLoader(): string;
    private getInitBody;
    protected getListType(typeStr: string, field: CodeGenField): string;
    private generateFieldSchema;
    private getSwiftModelTypeName;
    protected getEnumValue(value: string): string;
    protected isFieldRequired(field: CodeGenField): boolean;
    protected generateAuthRules(model: CodeGenModel): string;
}
//# sourceMappingURL=appsync-swift-visitor.d.ts.map