"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAuthDirective = exports.AuthModelMutation = exports.AuthModelOperation = exports.AuthStrategy = exports.AuthProvider = void 0;
var AuthProvider;
(function (AuthProvider) {
    AuthProvider["apiKey"] = "apiKey";
    AuthProvider["iam"] = "iam";
    AuthProvider["oidc"] = "oidc";
    AuthProvider["userPools"] = "userPools";
})(AuthProvider = exports.AuthProvider || (exports.AuthProvider = {}));
var AuthStrategy;
(function (AuthStrategy) {
    AuthStrategy["owner"] = "owner";
    AuthStrategy["groups"] = "groups";
    AuthStrategy["private"] = "private";
    AuthStrategy["public"] = "public";
})(AuthStrategy = exports.AuthStrategy || (exports.AuthStrategy = {}));
var AuthModelOperation;
(function (AuthModelOperation) {
    AuthModelOperation["create"] = "create";
    AuthModelOperation["update"] = "update";
    AuthModelOperation["delete"] = "delete";
    AuthModelOperation["read"] = "read";
})(AuthModelOperation = exports.AuthModelOperation || (exports.AuthModelOperation = {}));
var AuthModelMutation;
(function (AuthModelMutation) {
    AuthModelMutation["create"] = "create";
    AuthModelMutation["update"] = "update";
    AuthModelMutation["delete"] = "delete";
})(AuthModelMutation = exports.AuthModelMutation || (exports.AuthModelMutation = {}));
const DEFAULT_GROUP_CLAIM = 'cognito:groups';
const DEFAULT_IDENTITY_CLAIM = 'username';
const DEFAULT_OPERATIONS = [AuthModelOperation.create, AuthModelOperation.update, AuthModelOperation.delete, AuthModelOperation.read];
const DEFAULT_AUTH_PROVIDER = AuthProvider.userPools;
const DEFAULT_OWNER_FIELD = 'owner';
const DEFAULT_GROUPS_FIELD = 'groups';
function processAuthDirective(directives) {
    const authDirectives = directives.filter(d => d.name === 'auth');
    return authDirectives.map(d => {
        const authRules = d.arguments.rules || [];
        const processedRules = authRules
            .filter((rule) => !(rule.allow === AuthStrategy.groups && rule.groupField))
            .map((rule) => {
            const operations = rule.operations || rule.mutations || DEFAULT_OPERATIONS;
            const identityClaim = rule.identityClaim || rule.identityField || DEFAULT_IDENTITY_CLAIM;
            if (rule.allow === AuthStrategy.owner) {
                return {
                    provider: DEFAULT_AUTH_PROVIDER,
                    ownerField: rule.ownerField ? rule.ownerField : DEFAULT_OWNER_FIELD,
                    ...rule,
                    identityClaim: identityClaim === 'username' ? 'cognito:username' : identityClaim,
                    operations,
                };
            }
            else if (rule.allow === AuthStrategy.groups) {
                return {
                    groupClaim: DEFAULT_GROUP_CLAIM,
                    provider: DEFAULT_AUTH_PROVIDER,
                    ...rule,
                    groupField: rule.groups ? undefined : rule.groupField || DEFAULT_GROUPS_FIELD,
                    operations,
                };
            }
            return { ...rule, operations };
        });
        return {
            ...d,
            arguments: {
                ...d.arguments,
                rules: processedRules,
            },
        };
    });
}
exports.processAuthDirective = processAuthDirective;
//# sourceMappingURL=process-auth.js.map