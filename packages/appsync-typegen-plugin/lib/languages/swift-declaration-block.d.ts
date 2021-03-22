import { NameNode, StringValueNode } from 'graphql';
export declare function escapeKeywords(keyword: string): string;
export declare enum ListType {
    ARRAY = "ARRAY",
    LIST = "LIST"
}
export declare type Access = 'private' | 'public' | 'DEFAULT';
export declare type VariableFlags = {
    isList?: boolean;
    listType?: ListType;
    variable?: boolean;
    isEnum?: boolean;
};
export declare type StructFlags = VariableFlags & {
    optional?: boolean;
    static?: boolean;
};
export declare type PropertyFlags = StructFlags;
export declare type MethodFlags = {
    static?: boolean;
};
export declare type DeclarationFlag = {
    final?: boolean;
};
export declare type Kind = 'class' | 'struct' | 'extension' | 'enum';
export declare type VariableDeclaration = {
    value: string | undefined;
    name: string;
    type: string;
    flags: VariableFlags;
};
export declare type StructProperty = VariableDeclaration & {
    access: Access;
    comment?: string;
    getter?: string;
    setter?: string;
    flags: PropertyFlags;
};
export declare type MethodArgument = VariableDeclaration & {
    flags: PropertyFlags;
};
export declare type StructMethod = {
    args: MethodArgument[];
    implementation: string;
    name: string;
    access: Access;
    returnType: string | null;
    flags: MethodFlags;
    comment: string;
};
export declare class SwiftDeclarationBlock {
    _name: string;
    _kind: Kind;
    _protocols: string[];
    _access: Access;
    _properties: StructProperty[];
    _methods: StructMethod[];
    _comment: string;
    _block: string[];
    _enumValues: {
        [name: string]: string;
    };
    _flags: DeclarationFlag;
    access(access: Access): SwiftDeclarationBlock;
    final(isFinal?: boolean): SwiftDeclarationBlock;
    withComment(comment: string | StringValueNode | null): SwiftDeclarationBlock;
    withName(name: string | NameNode): SwiftDeclarationBlock;
    withBlock(block: string): SwiftDeclarationBlock;
    appendBlock(block: string): SwiftDeclarationBlock;
    asKind(kind: Kind): SwiftDeclarationBlock;
    addProperty(name: string, type: string, value?: string, access?: Access, flags?: PropertyFlags, comment?: string, getter?: string, setter?: string): SwiftDeclarationBlock;
    withProtocols(protocols: string[]): SwiftDeclarationBlock;
    addEnumValue(name: string, value?: string): SwiftDeclarationBlock;
    addClassMethod(name: string, returnType: string | null, implementation: string, args?: MethodArgument[], access?: Access, flags?: MethodFlags, comment?: string): SwiftDeclarationBlock;
    get string(): string;
    private generateEnumStr;
    private generateStructOrExtensionStr;
    private generateArgsStr;
    private generatePropertiesStr;
    private getAccessStr;
    mergeSections(sections: string[], insertNewLine?: boolean, joinStr?: string): string;
    private getListType;
}
//# sourceMappingURL=swift-declaration-block.d.ts.map