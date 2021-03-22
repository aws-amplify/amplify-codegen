"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONNECTION_RELATIONSHIP_IMPORTS = exports.LOADER_IMPORT_PACKAGES = exports.NON_MODEL_CLASS_IMPORT_PACKAGES = exports.ENUM_IMPORT_PACKAGES = exports.MODEL_AUTH_CLASS_IMPORT_PACKAGES = exports.MODEL_CLASS_IMPORT_PACKAGES = exports.getModelClassImports = exports.LOADER_CLASS_NAME = exports.GENERATED_PACKAGE_NAME = void 0;
exports.GENERATED_PACKAGE_NAME = 'com.amplifyframework.datastore.generated.model';
exports.LOADER_CLASS_NAME = 'AmplifyModelProvider';
const JAVA_UTIL_PACKAGES = ['java.util.List', 'java.util.UUID', 'java.util.Objects'];
const ANDROIDX_CORE_PACKAGES = ['androidx.core.util.ObjectsCompat'];
const AMPLIFY_FRAMEWORK_PACKAGES = [
    'com.amplifyframework.core.model.Model',
    'com.amplifyframework.core.model.annotations.Index',
    'com.amplifyframework.core.model.annotations.ModelConfig',
    'com.amplifyframework.core.model.annotations.ModelField',
    'com.amplifyframework.core.model.query.predicate.QueryField',
];
const AMPLIFY_FRAMEWORK_AUTH_PACKAGES_ONLY = [
    'com.amplifyframework.core.model.AuthStrategy',
    'com.amplifyframework.core.model.ModelOperation',
    'com.amplifyframework.core.model.annotations.AuthRule',
];
const AMPLIFY_FRAMEWORK_STATIC_PACKAGES = ['static com.amplifyframework.core.model.query.predicate.QueryField.field'];
function getModelClassImports(usingAuth = false) {
    if (usingAuth) {
        const AMPLIFY_MERGED_FRAMEWORK_PACKAGES = AMPLIFY_FRAMEWORK_PACKAGES.concat(AMPLIFY_FRAMEWORK_AUTH_PACKAGES_ONLY).sort();
        return [
            ...JAVA_UTIL_PACKAGES,
            '',
            ...ANDROIDX_CORE_PACKAGES,
            '',
            ...AMPLIFY_MERGED_FRAMEWORK_PACKAGES,
            '',
            ...AMPLIFY_FRAMEWORK_STATIC_PACKAGES,
            '',
        ];
    }
    else {
        return [
            ...JAVA_UTIL_PACKAGES,
            '',
            ...ANDROIDX_CORE_PACKAGES,
            '',
            ...AMPLIFY_FRAMEWORK_PACKAGES,
            '',
            ...AMPLIFY_FRAMEWORK_STATIC_PACKAGES,
            '',
        ];
    }
}
exports.getModelClassImports = getModelClassImports;
exports.MODEL_CLASS_IMPORT_PACKAGES = getModelClassImports();
exports.MODEL_AUTH_CLASS_IMPORT_PACKAGES = getModelClassImports(true);
exports.ENUM_IMPORT_PACKAGES = ['com.amplifyframework.core.model.ModelEnum;', ''];
exports.NON_MODEL_CLASS_IMPORT_PACKAGES = ['androidx.core.util.ObjectsCompat', '', 'java.util.Objects', 'java.util.List', ''];
exports.LOADER_IMPORT_PACKAGES = [
    'com.amplifyframework.util.Immutable',
    'com.amplifyframework.core.model.Model',
    'com.amplifyframework.core.model.ModelProvider',
    '',
    'java.util.Arrays',
    'java.util.HashSet',
    'java.util.Set',
];
exports.CONNECTION_RELATIONSHIP_IMPORTS = {
    BELONGS_TO: 'com.amplifyframework.core.model.annotations.BelongsTo',
    HAS_MANY: 'com.amplifyframework.core.model.annotations.HasMany',
    HAS_ONE: 'com.amplifyframework.core.model.annotations.HasOne',
};
//# sourceMappingURL=java-config.js.map