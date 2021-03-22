import { NameNode, StringValueNode } from "graphql";
declare type Kind = 'class' | 'interface' | 'enum' | 'extension';
declare type MemberFlags = {
    final?: boolean;
    static?: boolean;
    const?: boolean;
    var?: boolean;
};
declare type ClassMember = {
    name: string;
    type: string;
    value: string;
    flags: MemberFlags;
    annotations: string[];
};
declare type ClassMethod = {
    name: string;
    returnType: string | null;
    args: Partial<ClassMember>[];
    implementation: string;
    flags: MethodFlags;
    annotations: string[];
    comment: string;
};
declare type MethodFlags = MemberFlags & {
    isGetter?: boolean;
    isBlock?: boolean;
};
export declare class DartDeclarationBlock {
    _name: string | null;
    _kind: Kind | null;
    _implementsStr: string[];
    _extendStr: string[];
    _extensionType: string | null;
    _comment: string | null;
    _annotations: string[];
    _members: ClassMember[];
    _methods: ClassMethod[];
    _blocks: DartDeclarationBlock[];
    addBlock(block: DartDeclarationBlock): this;
    annotate(annotations: string[]): DartDeclarationBlock;
    asKind(kind: Kind): DartDeclarationBlock;
    implements(implementsStr: string[]): DartDeclarationBlock;
    extends(extendsStr: string[]): DartDeclarationBlock;
    extensionOn(extensionType: string): DartDeclarationBlock;
    withName(name: string | NameNode): DartDeclarationBlock;
    withComment(comment: string | StringValueNode | null): DartDeclarationBlock;
    addClassMember(name: string, type: string, value: string, flags?: MemberFlags, annotations?: string[]): DartDeclarationBlock;
    addClassMethod(name: string, returnType: string | null, args: Partial<ClassMember>[] | undefined, implementation: string, flags?: MethodFlags, annotations?: string[], comment?: string): DartDeclarationBlock;
    get string(): string;
    private printMember;
    private printMethod;
}
export {};
//# sourceMappingURL=dart-declaration-block.d.ts.map