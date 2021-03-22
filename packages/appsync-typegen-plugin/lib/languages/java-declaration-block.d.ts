import { StringValueNode, NameNode } from 'graphql';
export declare type Access = 'private' | 'public' | 'protected';
export declare type Kind = 'class' | 'interface' | 'enum';
export declare type MemberFlags = {
    transient?: boolean;
    final?: boolean;
    volatile?: boolean;
    static?: boolean;
    synchronized?: boolean;
};
export declare type ClassMember = {
    value: string;
    name: string;
    access: Access;
    type: string;
    annotations: string[];
    flags: MemberFlags;
};
export declare type ClassMethod = {
    methodAnnotations: string[];
    args: Partial<ClassMember>[];
    implementation: string;
    name: string;
    access: Access;
    returnType: string | null;
    returnTypeAnnotations: string[];
    flags: MemberFlags;
    exception?: string[];
    comment?: string;
};
export declare class JavaDeclarationBlock {
    _name: string | null;
    _extendStr: string[];
    _implementsStr: string[];
    _kind: Kind;
    _access: Access;
    _final: boolean;
    _static: boolean;
    _block: string | null;
    _comment: string | null;
    _annotations: string[];
    _members: ClassMember[];
    _methods: ClassMethod[];
    _nestedClasses: JavaDeclarationBlock[];
    nestedClass(nstCls: JavaDeclarationBlock): JavaDeclarationBlock;
    access(access: Access): JavaDeclarationBlock;
    asKind(kind: Kind): JavaDeclarationBlock;
    final(): JavaDeclarationBlock;
    static(): JavaDeclarationBlock;
    annotate(annotations: string[]): JavaDeclarationBlock;
    withComment(comment: string | StringValueNode | null): JavaDeclarationBlock;
    withBlock(block: string): JavaDeclarationBlock;
    extends(extendStr: string[]): JavaDeclarationBlock;
    implements(implementsStr: string[]): JavaDeclarationBlock;
    withName(name: string | NameNode): JavaDeclarationBlock;
    private printMember;
    private printMethod;
    addClassMember(name: string, type: string, value: string, typeAnnotations?: string[], access?: Access, flags?: MemberFlags): JavaDeclarationBlock;
    addClassMethod(name: string, returnType: string | null, impl: string, args?: Partial<ClassMember>[], returnTypeAnnotations?: string[], access?: Access, flags?: MemberFlags, methodAnnotations?: string[], exception?: string[], comment?: string): JavaDeclarationBlock;
    get string(): string;
}
//# sourceMappingURL=java-declaration-block.d.ts.map