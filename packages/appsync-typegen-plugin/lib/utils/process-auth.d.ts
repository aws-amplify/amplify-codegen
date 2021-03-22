import { CodeGenDirectives, CodeGenDirective } from '../visitors/appsync-visitor';
export declare enum AuthProvider {
    apiKey = "apiKey",
    iam = "iam",
    oidc = "oidc",
    userPools = "userPools"
}
export declare enum AuthStrategy {
    owner = "owner",
    groups = "groups",
    private = "private",
    public = "public"
}
export declare enum AuthModelOperation {
    create = "create",
    update = "update",
    delete = "delete",
    read = "read"
}
export declare enum AuthModelMutation {
    create = "create",
    update = "update",
    delete = "delete"
}
export declare type AuthRule = {
    allow: AuthStrategy;
    provider?: AuthProvider;
    operations: (AuthModelOperation | AuthModelMutation)[];
    groupField?: string;
    ownerField?: string;
    groups?: string[];
    identityField?: string;
    identityClaim?: string;
    groupClaim?: string;
    mutations?: AuthModelMutation[];
};
export declare type AuthDirective = CodeGenDirective & {
    arguments: {
        rules: AuthRule[];
    };
};
export declare function processAuthDirective(directives: CodeGenDirectives): AuthDirective[];
//# sourceMappingURL=process-auth.d.ts.map