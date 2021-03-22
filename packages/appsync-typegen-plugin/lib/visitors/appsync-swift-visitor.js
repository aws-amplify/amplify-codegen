"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncSwiftVisitor = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const change_case_1 = require("change-case");
const lower_case_first_1 = require("lower-case-first");
const swift_config_1 = require("../configs/swift-config");
const swift_declaration_block_1 = require("../languages/swift-declaration-block");
const process_connections_1 = require("../utils/process-connections");
const appsync_visitor_1 = require("./appsync-visitor");
const process_auth_1 = require("../utils/process-auth");
const warn_1 = require("../utils/warn");
class AppSyncSwiftVisitor extends appsync_visitor_1.AppSyncModelVisitor {
    constructor() {
        super(...arguments);
        this.modelExtensionImports = ['import Amplify', 'import Foundation'];
        this.imports = ['import Amplify', 'import Foundation'];
    }
    generate() {
        this.processDirectives();
        const code = [`// swiftlint:disable all`];
        if (this._parsedConfig.generate === appsync_visitor_1.CodeGenGenerateEnum.metadata) {
            code.push(this.generateSchema());
        }
        else if (this._parsedConfig.generate === appsync_visitor_1.CodeGenGenerateEnum.loader) {
            code.push(this.generateClassLoader());
        }
        else if (this.selectedTypeIsEnum()) {
            code.push(this.generateEnums());
        }
        else if (this.selectedTypeIsNonModel()) {
            code.push(this.generateNonModelType());
        }
        else {
            code.push(this.generateStruct());
        }
        return code.join('\n');
    }
    generateStruct() {
        let result = [...this.imports, ''];
        Object.entries(this.getSelectedModels()).forEach(([name, obj]) => {
            const structBlock = new swift_declaration_block_1.SwiftDeclarationBlock()
                .withName(this.getModelName(obj))
                .access('public')
                .withProtocols(['Model']);
            Object.entries(obj.fields).forEach(([fieldName, field]) => {
                const fieldType = this.getNativeType(field);
                const isVariable = field.name !== 'id';
                const listType = field.connectionInfo ? swift_declaration_block_1.ListType.LIST : swift_declaration_block_1.ListType.ARRAY;
                structBlock.addProperty(this.getFieldName(field), fieldType, undefined, 'public', {
                    optional: !this.isFieldRequired(field),
                    isList: field.isList,
                    variable: isVariable,
                    isEnum: this.isEnumType(field),
                    listType: field.isList ? listType : undefined,
                });
            });
            const initImpl = this.getInitBody(obj.fields);
            structBlock.addClassMethod('init', null, initImpl, obj.fields.map(field => {
                const listType = field.connectionInfo ? swift_declaration_block_1.ListType.LIST : swift_declaration_block_1.ListType.ARRAY;
                return {
                    name: this.getFieldName(field),
                    type: this.getNativeType(field),
                    value: field.name === 'id' ? 'UUID().uuidString' : undefined,
                    flags: {
                        optional: field.isNullable,
                        isList: field.isList,
                        isEnum: this.isEnumType(field),
                        listType: field.isList ? listType : undefined,
                    },
                };
            }), 'public', {});
            result.push(structBlock.string);
        });
        return result.join('\n');
    }
    generateEnums() {
        const result = [...this.imports, ''];
        Object.entries(this.getSelectedEnums()).forEach(([name, enumValue]) => {
            const enumDeclaration = new swift_declaration_block_1.SwiftDeclarationBlock()
                .asKind('enum')
                .access('public')
                .withProtocols(['String', 'EnumPersistable'])
                .withName(this.getEnumName(enumValue));
            Object.entries(enumValue.values).forEach(([name, value]) => {
                enumDeclaration.addEnumValue(name, value);
            });
            result.push(enumDeclaration.string);
        });
        return result.join('\n');
    }
    generateNonModelType() {
        let result = [...this.imports, ''];
        Object.entries(this.getSelectedNonModels()).forEach(([name, obj]) => {
            const structBlock = new swift_declaration_block_1.SwiftDeclarationBlock()
                .withName(this.getModelName(obj))
                .access('public')
                .withProtocols(['Embeddable']);
            Object.values(obj.fields).forEach(field => {
                const fieldType = this.getNativeType(field);
                structBlock.addProperty(this.getFieldName(field), fieldType, undefined, 'DEFAULT', {
                    optional: !this.isFieldRequired(field),
                    isList: field.isList,
                    variable: true,
                    isEnum: this.isEnumType(field),
                    listType: field.isList ? swift_declaration_block_1.ListType.ARRAY : undefined,
                });
            });
            result.push(structBlock.string);
        });
        return result.join('\n');
    }
    generateSchema() {
        let result = [...this.modelExtensionImports, ''];
        Object.values(this.getSelectedModels())
            .filter(m => m.type === 'model')
            .forEach(model => {
            const schemaDeclarations = new swift_declaration_block_1.SwiftDeclarationBlock().asKind('extension').withName(this.getModelName(model));
            this.generateCodingKeys(this.getModelName(model), model, schemaDeclarations),
                this.generateModelSchema(this.getModelName(model), model, schemaDeclarations);
            result.push(schemaDeclarations.string);
        });
        Object.values(this.getSelectedNonModels()).forEach(model => {
            const schemaDeclarations = new swift_declaration_block_1.SwiftDeclarationBlock().asKind('extension').withName(this.getNonModelName(model));
            this.generateCodingKeys(this.getNonModelName(model), model, schemaDeclarations),
                this.generateModelSchema(this.getNonModelName(model), model, schemaDeclarations);
            result.push(schemaDeclarations.string);
        });
        return result.join('\n');
    }
    generateCodingKeys(name, model, extensionDeclaration) {
        const codingKeyEnum = new swift_declaration_block_1.SwiftDeclarationBlock()
            .asKind('enum')
            .access('public')
            .withName('CodingKeys')
            .withProtocols(['String', 'ModelKey'])
            .withComment('MARK: - CodingKeys');
        model.fields.forEach(field => codingKeyEnum.addEnumValue(this.getFieldName(field), field.name));
        extensionDeclaration.appendBlock(codingKeyEnum.string);
        extensionDeclaration.addProperty('keys', '', 'CodingKeys.self', 'public', {
            static: true,
            variable: false,
        });
    }
    generateModelSchema(name, model, extensionDeclaration) {
        const keysName = lower_case_first_1.lowerCaseFirst(model.name);
        const fields = model.fields.map(field => {
            return this.generateFieldSchema(field, keysName);
        });
        const authRules = this.generateAuthRules(model);
        const closure = [
            '{ model in',
            `let ${keysName} = ${this.getModelName(model)}.keys`,
            '',
            ...(authRules.length ? [`model.authRules = ${authRules}`, ''] : []),
            `model.pluralName = "${this.pluralizeModelName(model)}"`,
            '',
            'model.fields(',
            visitor_plugin_common_1.indentMultiline(fields.join(',\n')),
            ')',
            '}',
        ].join('\n');
        extensionDeclaration.addProperty('schema', '', `defineSchema ${visitor_plugin_common_1.indentMultiline(closure).trim()}`, 'public', { static: true, variable: false }, ' MARK: - ModelSchema');
    }
    generateClassLoader() {
        const structList = Object.values(this.modelMap).map(typeObj => {
            return `${this.getModelName(typeObj)}.self`;
        });
        const result = [...this.modelExtensionImports, ''];
        const classDeclaration = new swift_declaration_block_1.SwiftDeclarationBlock()
            .access('public')
            .withName('AmplifyModels')
            .asKind('class')
            .withProtocols(['AmplifyModelRegistration'])
            .final()
            .withComment('Contains the set of classes that conforms to the `Model` protocol.');
        classDeclaration.addProperty('version', 'String', `"${this.computeVersion()}"`, 'public', {});
        const body = structList.map(modelClass => `ModelRegistry.register(modelType: ${modelClass})`).join('\n');
        classDeclaration.addClassMethod('registerModels', null, body, [{ type: 'ModelRegistry.Type', name: 'registry', flags: {}, value: undefined }], 'public', {});
        result.push(classDeclaration.string);
        return result.join('\n');
    }
    getInitBody(fields) {
        let result = fields.map(field => {
            const fieldName = swift_declaration_block_1.escapeKeywords(this.getFieldName(field));
            return visitor_plugin_common_1.indent(`self.${fieldName} = ${fieldName}`);
        });
        return result.join('\n');
    }
    getListType(typeStr, field) {
        return `${typeStr}`;
    }
    generateFieldSchema(field, modelKeysName) {
        if (field.type === 'ID' && field.name === 'id') {
            return `.id()`;
        }
        let ofType;
        const isEnumType = this.isEnumType(field);
        const isModelType = this.isModelType(field);
        const isNonModelType = this.isNonModelType(field);
        const name = `${modelKeysName}.${this.getFieldName(field)}`;
        const typeName = this.getSwiftModelTypeName(field);
        const { connectionInfo } = field;
        const isRequired = this.isFieldRequired(field) ? '.required' : '.optional';
        if (connectionInfo) {
            if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_MANY) {
                return `.hasMany(${name}, is: ${isRequired}, ofType: ${typeName}, associatedWith: ${this.getModelName(connectionInfo.connectedModel)}.keys.${this.getFieldName(connectionInfo.associatedWith)})`;
            }
            if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_ONE) {
                return `.hasOne(${name}, is: ${isRequired}, ofType: ${typeName}, associatedWith: ${this.getModelName(connectionInfo.connectedModel)}.keys.${this.getFieldName(connectionInfo.associatedWith)}, targetName: "${connectionInfo.targetName}")`;
            }
            if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.BELONGS_TO) {
                return `.belongsTo(${name}, is: ${isRequired}, ofType: ${typeName}, targetName: "${connectionInfo.targetName}")`;
            }
        }
        if (field.isList) {
            if (isModelType) {
                ofType = `.collection(of: ${this.getSwiftModelTypeName(field)})`;
            }
            else {
                ofType = `.embeddedCollection(of: ${this.getSwiftModelTypeName(field)})`;
            }
        }
        else {
            if (isEnumType) {
                ofType = `.enum(type: ${typeName})`;
            }
            else if (isModelType) {
                ofType = `.model(${typeName})`;
            }
            else if (isNonModelType) {
                ofType = `.embedded(type: ${typeName})`;
            }
            else {
                ofType = typeName;
            }
        }
        const args = [`${name}`, `is: ${isRequired}`, `ofType: ${ofType}`].filter(arg => arg).join(', ');
        return `.field(${args})`;
    }
    getSwiftModelTypeName(field) {
        if (this.isEnumType(field)) {
            return `${this.getEnumName(field.type)}.self`;
        }
        if (this.isModelType(field)) {
            return `${this.getModelName(this.modelMap[field.type])}.self`;
        }
        if (this.isNonModelType(field)) {
            return `${this.getNonModelName(this.nonModelMap[field.type])}.self`;
        }
        if (field.type in swift_config_1.schemaTypeMap) {
            if (field.isList) {
                return `${this.getNativeType(field)}.self`;
            }
            return swift_config_1.schemaTypeMap[field.type];
        }
        return '.string';
    }
    getEnumValue(value) {
        return change_case_1.camelCase(value);
    }
    isFieldRequired(field) {
        if (field.connectionInfo && field.connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_MANY) {
            return false;
        }
        return !field.isNullable;
    }
    generateAuthRules(model) {
        const authDirectives = model.directives.filter(d => d.name === 'auth');
        const rules = [];
        authDirectives.forEach(directive => {
            var _a;
            (_a = directive.arguments) === null || _a === void 0 ? void 0 : _a.rules.forEach(rule => {
                var _a, _b;
                const authRule = [];
                switch (rule.allow) {
                    case process_auth_1.AuthStrategy.owner:
                        authRule.push('allow: .owner');
                        authRule.push(`ownerField: "${rule.ownerField}"`);
                        authRule.push(`identityClaim: "${rule.identityClaim}"`);
                        break;
                    case process_auth_1.AuthStrategy.groups:
                        authRule.push('allow: .groups');
                        authRule.push(`groupClaim: "${rule.groupClaim}"`);
                        if (rule.groups) {
                            authRule.push(`groups: [${(_a = rule.groups) === null || _a === void 0 ? void 0 : _a.map(group => `"${group}"`).join(', ')}]`);
                        }
                        else {
                            authRule.push(`groupsField: "${rule.groupField}"`);
                        }
                        break;
                    default:
                        warn_1.printWarning(`Model ${model.name} has auth with authStrategy ${rule.allow} of which is not yet supported in DataStore.`);
                        return;
                }
                authRule.push(`operations: [${(_b = rule.operations) === null || _b === void 0 ? void 0 : _b.map(op => `.${op}`).join(', ')}]`);
                rules.push(`rule(${authRule.join(', ')})`);
            });
        });
        if (rules.length) {
            return ['[', `${visitor_plugin_common_1.indentMultiline(rules.join(',\n'))}`, ']'].join('\n');
        }
        return '';
    }
}
exports.AppSyncSwiftVisitor = AppSyncSwiftVisitor;
//# sourceMappingURL=appsync-swift-visitor.js.map