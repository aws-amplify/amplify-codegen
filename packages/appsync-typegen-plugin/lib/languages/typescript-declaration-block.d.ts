import { StringValueNode } from 'graphql';
export declare type Access = 'private' | 'public' | 'DEFAULT' | 'protected';
export declare type VariableFlag = {
    readonly?: boolean;
    static?: boolean;
};
export declare type VariableDeclaration = {
    name: string;
    type: string;
    flags?: VariableFlag;
    value?: string;
};
export declare type PropertyFlag = VariableFlag & {
    optional?: boolean;
};
export declare type Property = VariableDeclaration & {
    access: Access;
    flags: PropertyFlag;
};
export declare type MethodArguments = VariableDeclaration;
export declare type MethodFlag = {
    static?: boolean;
};
export declare type Method = {
    name: string;
    args: MethodArguments[];
    access: Access;
    returnType: string | null;
    flags: MethodFlag;
    implmentation: string | null;
    comment: string;
};
export declare type EnumValues = {
    [name: string]: string;
};
export declare type DeclarationKind = 'class' | 'enum' | 'interface';
export declare type DeclarationFlags = {
    isDeclaration?: boolean;
    shouldExport?: boolean;
};
export declare class TypeScriptDeclarationBlock {
    protected _name: string;
    protected _kind: DeclarationKind;
    protected _extends: string[];
    protected _properties: Property[];
    protected _methods: Method[];
    protected _flags: DeclarationFlags;
    protected _comments: string;
    protected _block: string;
    protected _enumValues: EnumValues;
    withName(name: string): TypeScriptDeclarationBlock;
    export(shouldExport?: boolean): TypeScriptDeclarationBlock;
    withComment(comment: string | StringValueNode): TypeScriptDeclarationBlock;
    withBlock(block: string): TypeScriptDeclarationBlock;
    asKind(kind: DeclarationKind): TypeScriptDeclarationBlock;
    withFlag(flags: Partial<DeclarationFlags>): TypeScriptDeclarationBlock;
    addEnumValue(name: string, value?: string): void;
    withEnumValues(values: {
        [name: string]: string;
    } | string[]): TypeScriptDeclarationBlock;
    addProperty(name: string, type: string, value?: string, access?: Access, flags?: PropertyFlag): void;
    addClassMethod(name: string, returnType: string | null, implmentation: string | null, args?: MethodArguments[], access?: Access, flags?: MethodFlag, comment?: string): void;
    get string(): string;
    protected generateEnum(): string;
    protected generateClass(): string;
    protected generateProperties(): string;
    protected generateMethods(): string;
    protected generateInterface(): string;
    protected generatePropertyName(property: Property): string;
}
//# sourceMappingURL=typescript-declaration-block.d.ts.map