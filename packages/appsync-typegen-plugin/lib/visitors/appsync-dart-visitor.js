"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncModelDartVisitor = void 0;
const appsync_visitor_1 = require("./appsync-visitor");
const dart_declaration_block_1 = require("../languages/dart-declaration-block");
const process_connections_1 = require("../utils/process-connections");
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const process_auth_1 = require("../utils/process-auth");
const warn_1 = require("../utils/warn");
const dart_config_1 = require("../configs/dart-config");
const dart_style_1 = __importDefault(require("dart-style"));
const generateLicense_1 = require("../utils/generateLicense");
const lower_case_first_1 = require("lower-case-first");
class AppSyncModelDartVisitor extends appsync_visitor_1.AppSyncModelVisitor {
    generate() {
        this.processDirectives();
        this.validateReservedKeywords();
        if (this._parsedConfig.generate === appsync_visitor_1.CodeGenGenerateEnum.loader) {
            return this.generateClassLoader();
        }
        else if (this.selectedTypeIsEnum()) {
            return this.generateEnums();
        }
        return this.generateModelClasses();
    }
    validateReservedKeywords() {
        Object.entries({ ...this.models, ...this.nonModels }).forEach(([name, obj]) => {
            if (dart_config_1.DART_RESERVED_KEYWORDS.includes(name)) {
                throw new Error(`Type name '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
            }
            obj.fields.forEach(field => {
                const fieldName = this.getFieldName(field);
                if (dart_config_1.DART_RESERVED_KEYWORDS.includes(fieldName)) {
                    throw new Error(`Field name '${fieldName}' in type '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
                }
            });
        });
        Object.entries(this.enums).forEach(([name, enumVal]) => {
            if (dart_config_1.DART_RESERVED_KEYWORDS.includes(name)) {
                throw new Error(`Enum name '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
            }
            Object.values(enumVal.values).forEach(val => {
                if (dart_config_1.DART_RESERVED_KEYWORDS.includes(val)) {
                    throw new Error(`Enum value '${val}' in enum '${name}' is a reserved word in dart. Please use a non-reserved name instead.`);
                }
            });
        });
    }
    generateClassLoader() {
        const result = [];
        const modelNames = Object.keys(this.modelMap).sort();
        const exportClasses = [...modelNames, ...Object.keys(this.enumMap)].sort();
        const license = generateLicense_1.generateLicense();
        result.push(license);
        result.push(dart_config_1.IGNORE_FOR_FILE);
        const packageImports = [
            'package:amplify_datastore_plugin_interface/amplify_datastore_plugin_interface',
            ...modelNames
        ];
        const packageExports = [...exportClasses];
        const classDeclarationBlock = new dart_declaration_block_1.DartDeclarationBlock()
            .asKind('class')
            .withName(dart_config_1.LOADER_CLASS_NAME)
            .implements([`${dart_config_1.LOADER_CLASS_NAME}Interface`])
            .addClassMember('version', 'String', `"${this.computeVersion()}"`, undefined, ['override'])
            .addClassMember('modelSchemas', 'List<ModelSchema>', `[${modelNames.map(m => `${m}.schema`).join(', ')}]`, undefined, ['override'])
            .addClassMember('_instance', dart_config_1.LOADER_CLASS_NAME, `${dart_config_1.LOADER_CLASS_NAME}()`, { static: true, final: true })
            .addClassMethod('get instance', dart_config_1.LOADER_CLASS_NAME, [], ' => _instance;', { isBlock: false, isGetter: true, static: true });
        if (modelNames.length) {
            const getModelTypeImplStr = [
                'switch(modelName) {',
                ...modelNames.map(modelName => {
                    return [
                        `case "${modelName}": {`,
                        `return ${modelName}.classType;`,
                        '}',
                        'break;'
                    ].join('\n');
                }),
                'default: {',
                'throw Exception("Failed to find model in model provider for model name: " + modelName);',
                '}',
                '}'
            ].join('\n');
            classDeclarationBlock.addClassMethod('getModelTypeByModelName', 'ModelType', [{ type: 'String', name: 'modelName' }], getModelTypeImplStr);
        }
        result.push(packageImports.map(p => `import '${p}.dart';`).join('\n'));
        result.push(packageExports.map(p => `export '${p}.dart';`).join('\n'));
        result.push(classDeclarationBlock.string);
        return this.formatDartCode(result.join('\n\n'));
    }
    generateEnums() {
        const result = [];
        const license = generateLicense_1.generateLicense();
        result.push(license);
        result.push(dart_config_1.IGNORE_FOR_FILE);
        Object.entries(this.getSelectedEnums()).forEach(([name, enumVal]) => {
            const body = Object.values(enumVal.values).join(',\n');
            result.push([
                `enum ${name} {`,
                visitor_plugin_common_1.indentMultiline(body),
                '}'
            ].join('\n'));
        });
        return this.formatDartCode(result.join('\n\n'));
    }
    generateModelClasses() {
        const result = [];
        const license = generateLicense_1.generateLicense();
        result.push(license);
        result.push(dart_config_1.IGNORE_FOR_FILE);
        const packageImports = this.generatePackageHeader();
        result.push(packageImports);
        Object.entries(this.getSelectedModels()).forEach(([name, model]) => {
            const modelDeclaration = this.generateModelClass(model);
            const modelType = this.generateModelType(model);
            result.push(modelDeclaration);
            result.push(modelType);
        });
        return this.formatDartCode(result.join('\n\n'));
    }
    generatePackageHeader() {
        let usingCollection = false;
        let usingOtherClass = false;
        Object.entries(this.getSelectedModels()).forEach(([name, model]) => {
            model.fields.forEach(f => {
                if (f.isList) {
                    usingCollection = true;
                }
                if (this.isModelType(f) || this.isEnumType(f)) {
                    usingOtherClass = true;
                }
            });
        });
        return [
            ...dart_config_1.BASE_IMPORT_PACKAGES,
            usingCollection ? dart_config_1.COLLECTION_PACKAGE : '',
            usingOtherClass ? `${dart_config_1.LOADER_CLASS_NAME}.dart` : ''
        ].filter(f => f).sort().map(pckg => `import '${pckg}';`).join('\n') + '\n';
    }
    generateModelClass(model) {
        const classDeclarationBlock = new dart_declaration_block_1.DartDeclarationBlock()
            .asKind('class')
            .withName(this.getModelName(model))
            .extends(['Model'])
            .withComment(`This is an auto generated class representing the ${model.name} type in your schema.`)
            .annotate(['immutable']);
        classDeclarationBlock.addClassMember('classType', '', `const ${this.getModelName(model)}Type()`, { static: true, const: true });
        model.fields.forEach(field => {
            this.generateModelField(field, '', classDeclarationBlock);
        });
        classDeclarationBlock.addClassMethod('getInstanceType', '', [], ' => classType;', { isBlock: false }, ['override']);
        this.generateGetIdMethod(model, classDeclarationBlock);
        this.generateConstructor(model, classDeclarationBlock);
        this.generateEqualsMethodAndOperator(model, classDeclarationBlock);
        this.generateHashCodeMethod(model, classDeclarationBlock);
        this.generateToStringMethod(model, classDeclarationBlock);
        this.generateCopyWithMethod(model, classDeclarationBlock);
        this.generateSerializationMethod(model, classDeclarationBlock);
        this.generateModelSchema(model, classDeclarationBlock);
        return classDeclarationBlock.string;
    }
    generateModelType(model) {
        const modelName = this.getModelName(model);
        const classDeclarationBlock = new dart_declaration_block_1.DartDeclarationBlock()
            .asKind('class')
            .withName(`${modelName}Type`)
            .extends([`ModelType<${modelName}>`]);
        classDeclarationBlock.addClassMethod(`${modelName}Type`, '', [], ';', { const: true, isBlock: false });
        classDeclarationBlock.addClassMethod('fromJson', modelName, [{ name: 'jsonData', type: 'Map<String, dynamic>' }], `return ${modelName}.fromJson(jsonData);`, undefined, ['override']);
        return classDeclarationBlock.string;
    }
    generateModelField(field, value, classDeclarationBlock) {
        const fieldType = this.getNativeType(field);
        const fieldName = this.getFieldName(field);
        classDeclarationBlock.addClassMember(fieldName, fieldType, value, { final: true });
    }
    generateGetIdMethod(model, declarationBlock) {
        declarationBlock.addClassMethod('getId', 'String', [], 'return id;', {}, ['override']);
    }
    generateConstructor(model, declarationBlock) {
        const args = `{${model.fields.map(f => `${this.isFieldRequired(f) ? '@required ' : ''}this.${this.getFieldName(f)}`).join(', ')}}`;
        declarationBlock.addClassMethod(`${this.getModelName(model)}._internal`, '', [{ name: args }], ';', { const: true, isBlock: false });
        const returnParamStr = model.fields.map(field => {
            const fieldName = this.getFieldName(field);
            if (fieldName === 'id') {
                return 'id: id == null ? UUID.getUUID() : id';
            }
            else if (field.isList) {
                return `${fieldName}: ${fieldName} != null ? List.unmodifiable(${fieldName}) : ${fieldName}`;
            }
            else {
                return `${fieldName}: ${fieldName}`;
            }
        }).join(',\n');
        const factoryImpl = [
            `return ${this.getModelName(model)}._internal(`,
            visitor_plugin_common_1.indentMultiline(`${returnParamStr});`)
        ].join('\n');
        const factoryParam = `{${model.fields.map(f => `${this.getFieldName(f) !== 'id' && this.isFieldRequired(f) ? '@required ' : ''}${this.getNativeType(f)} ${this.getFieldName(f)}`).join(', ')}}`;
        declarationBlock.addClassMethod(this.getModelName(model), 'factory', [{ name: factoryParam }], factoryImpl);
    }
    generateEqualsMethodAndOperator(model, declarationBlock) {
        declarationBlock.addClassMethod('equals', 'bool', [{ name: 'other', type: 'Object' }], 'return this == other;');
        const equalImpl = [
            'if (identical(other, this)) return true;',
            `return other is ${this.getModelName(model)} &&`,
            visitor_plugin_common_1.indentMultiline(`${model.fields.map(f => {
                const fieldName = this.getFieldName(f);
                return f.isList
                    ? `DeepCollectionEquality().equals(${fieldName}, other.${fieldName})`
                    : `${fieldName} == other.${fieldName}`;
            }).join(' &&\n')};`)
        ].join('\n');
        declarationBlock.addClassMethod('operator ==', 'bool', [{ name: 'other', type: 'Object' }], equalImpl, undefined, ['override']);
    }
    generateHashCodeMethod(model, declarationBlock) {
        declarationBlock.addClassMethod(`get hashCode`, `int`, undefined, ' => toString().hashCode;', { isGetter: true, isBlock: false }, ['override']);
    }
    generateToStringMethod(model, declarationBlock) {
        const fields = this.getNonConnectedField(model);
        declarationBlock.addClassMethod('toString', 'String', [], [
            'var buffer = new StringBuffer();',
            '',
            `buffer.write("${this.getModelName(model)} {");`,
            ...fields.map((field, index) => {
                const fieldDelimiter = ', ';
                const fieldName = this.getFieldName(field);
                let toStringVal = '';
                if (this.isEnumType(field)) {
                    if (field.isList) {
                        toStringVal = `${fieldName}?.map((e) => enumToString(e)).toString()`;
                    }
                    else {
                        toStringVal = `(${fieldName} != null ? enumToString(${fieldName}) : "null")`;
                    }
                }
                else {
                    const fieldNativeType = this.getNativeType(field);
                    switch (fieldNativeType) {
                        case 'String':
                            toStringVal = `"$${fieldName}"`;
                            break;
                        case this.scalars['AWSDate']:
                        case this.scalars['AWSTime']:
                        case this.scalars['AWSDateTime']:
                            toStringVal = `(${fieldName} != null ? ${fieldName}.format() : "null")`;
                            break;
                        default:
                            toStringVal = `(${fieldName} != null ? ${fieldName}.toString() : "null")`;
                    }
                }
                if (index !== fields.length - 1) {
                    return `buffer.write("${fieldName}=" + ${toStringVal} + "${fieldDelimiter}");`;
                }
                return `buffer.write("${fieldName}=" + ${toStringVal});`;
            }),
            `buffer.write("}");`,
            '',
            'return buffer.toString();'
        ].join('\n'), undefined, ['override']);
    }
    generateCopyWithMethod(model, declarationBlock) {
        const copyParam = `{${model.fields.map(f => `${this.getNativeType(f)} ${this.getFieldName(f)}`).join(', ')}}`;
        declarationBlock.addClassMethod('copyWith', this.getModelName(model), [{ name: copyParam }], [
            `return ${this.getModelName(model)}(`,
            visitor_plugin_common_1.indentMultiline(`${model.fields.map(field => {
                const fieldName = this.getFieldName(field);
                return `${fieldName}: ${fieldName} ?? this.${fieldName}`;
            }).join(',\n')});`)
        ].join('\n'));
    }
    generateSerializationMethod(model, declarationBlock) {
        const serializationImpl = `\n: ${visitor_plugin_common_1.indentMultiline(model.fields.map(field => {
            const fieldName = this.getFieldName(field);
            if (this.isModelType(field)) {
                if (field.isList) {
                    return [
                        `${fieldName} = json['${fieldName}'] is List`,
                        visitor_plugin_common_1.indent(`? (json['${fieldName}'] as List)`),
                        visitor_plugin_common_1.indent(`.map((e) => ${this.getNativeType({ ...field, isList: false })}.fromJson(new Map<String, dynamic>.from(e)))`, 2),
                        visitor_plugin_common_1.indent(`.toList()`, 2),
                        visitor_plugin_common_1.indent(`: null`)
                    ].join('\n');
                }
                return [
                    `${fieldName} = json['${fieldName}'] != null`,
                    visitor_plugin_common_1.indent(`? ${this.getNativeType(field)}.fromJson(new Map<String, dynamic>.from(json['${fieldName}']))`),
                    visitor_plugin_common_1.indent(`: null`)
                ].join('\n');
            }
            if (this.isEnumType(field)) {
                if (field.isList) {
                    return [
                        `${fieldName} = json['${fieldName}'] is List`,
                        visitor_plugin_common_1.indent(`? (json['${fieldName}'] as List)`),
                        visitor_plugin_common_1.indent(`.map((e) => enumFromString<${field.type}>(e, ${field.type}.values))`, 2),
                        visitor_plugin_common_1.indent(`.toList()`, 2),
                        visitor_plugin_common_1.indent(`: null`)
                    ].join('\n');
                }
                return `${fieldName} = enumFromString<${field.type}>(json['${fieldName}'], ${field.type}.values)`;
            }
            const fieldNativeType = this.getNativeType({ ...field, isList: false });
            switch (fieldNativeType) {
                case this.scalars['AWSDate']:
                case this.scalars['AWSTime']:
                case this.scalars['AWSDateTime']:
                    return field.isList
                        ? `${fieldName} = (json['${fieldName}'] as List)?.map((e) => ${fieldNativeType}.fromString(e))?.toList()`
                        : `${fieldName} = json['${fieldName}'] != null ? ${fieldNativeType}.fromString(json['${fieldName}']) : null`;
                case this.scalars['AWSTimestamp']:
                    return field.isList
                        ? `${fieldName} = (json['${fieldName}'] as List)?.map((e) => ${fieldNativeType}.fromSeconds(e))?.toList()`
                        : `${fieldName} = json['${fieldName}'] != null ? ${fieldNativeType}.fromSeconds(json['${fieldName}']) : null`;
                case this.scalars['Int']:
                    return field.isList
                        ? `${fieldName} = (json['${fieldName}'] as List<dynamic>)?.map((dynamic e) => e is double ? e.toInt() : e as int)?.toList()`
                        : `${fieldName} = json['${fieldName}']`;
                default:
                    return field.isList
                        ? `${fieldName} = json['${fieldName}']?.cast<${this.getNativeType({ ...field, isList: false })}>()`
                        : `${fieldName} = json['${fieldName}']`;
            }
        }).join(',\n')).trim()};`;
        declarationBlock.addClassMethod(`${this.getModelName(model)}.fromJson`, ``, [{ name: 'json', type: 'Map<String, dynamic>' }], visitor_plugin_common_1.indentMultiline(serializationImpl), { isBlock: false });
        const toJsonFields = model.fields.map(field => {
            const fieldName = this.getFieldName(field);
            if (this.isModelType(field)) {
                if (field.isList) {
                    return `'${fieldName}': ${fieldName}?.map((e) => e?.toJson())?.toList()`;
                }
                return `'${fieldName}': ${fieldName}?.toJson()`;
            }
            if (this.isEnumType(field)) {
                if (field.isList) {
                    return `'${fieldName}': ${fieldName}?.map((e) => enumToString(e))?.toList()`;
                }
                return `'${fieldName}': enumToString(${fieldName})`;
            }
            const fieldNativeType = this.getNativeType({ ...field, isList: false });
            switch (fieldNativeType) {
                case this.scalars['AWSDate']:
                case this.scalars['AWSTime']:
                case this.scalars['AWSDateTime']:
                    return field.isList
                        ? `'${fieldName}': ${fieldName}?.map((e) => e.format()).toList()`
                        : `'${fieldName}': ${fieldName}?.format()`;
                case this.scalars['AWSTimestamp']:
                    return field.isList
                        ? `'${fieldName}': ${fieldName}?.map((e) => e.toSeconds()).toList()`
                        : `'${fieldName}': ${fieldName}?.toSeconds()`;
                default:
                    return `'${fieldName}': ${fieldName}`;
            }
        }).join(', ');
        const deserializationImpl = [
            ' => {',
            visitor_plugin_common_1.indentMultiline(toJsonFields),
            '};',
        ].join('\n');
        declarationBlock.addClassMethod('toJson', 'Map<String, dynamic>', [], deserializationImpl, { isBlock: false });
    }
    generateModelSchema(model, classDeclarationBlock) {
        const schemaDeclarationBlock = new dart_declaration_block_1.DartDeclarationBlock();
        model.fields.forEach(field => {
            this.generateQueryField(model, field, schemaDeclarationBlock);
        });
        this.generateSchemaField(model, schemaDeclarationBlock);
        classDeclarationBlock.addBlock(schemaDeclarationBlock);
    }
    generateQueryField(model, field, declarationBlock) {
        const fieldName = this.getFieldName(field);
        const queryFieldName = this.getQueryFieldName(field);
        let value = `QueryField(fieldName: "${fieldName}")`;
        if (this.isModelType(field)) {
            const modelName = this.getNativeType({ ...field, isList: false });
            value = [
                'QueryField(',
                visitor_plugin_common_1.indent(`fieldName: "${fieldName}",`),
                visitor_plugin_common_1.indent(`fieldType: ModelFieldType(ModelFieldTypeEnum.model, ofModelName: (${modelName}).toString()))`)
            ].join('\n');
        }
        else if (fieldName === 'id') {
            value = `QueryField(fieldName: "${lower_case_first_1.lowerCaseFirst(model.name)}.id")`;
        }
        declarationBlock.addClassMember(queryFieldName, 'QueryField', value, { static: true, final: true });
    }
    getQueryFieldName(field) {
        return this.getFieldName(field).toUpperCase();
    }
    generateSchemaField(model, declarationBlock) {
        const schema = [
            'Model.defineSchema(define: (ModelSchemaDefinition modelSchemaDefinition) {',
            visitor_plugin_common_1.indentMultiline([
                `modelSchemaDefinition.name = "${this.getModelName(model)}";\nmodelSchemaDefinition.pluralName = "${this.pluralizeModelName(model)}";`,
                this.generateAuthRules(model),
                this.generateAddFields(model)
            ].filter(f => f).join('\n\n')),
            '})'
        ].join('\n');
        declarationBlock.addClassMember('schema', '', schema, { static: true, var: true });
    }
    generateAuthRules(model) {
        const authDirectives = model.directives.filter(d => d.name === 'auth');
        if (authDirectives.length) {
            const rules = [];
            authDirectives.forEach(directive => {
                var _a;
                (_a = directive.arguments) === null || _a === void 0 ? void 0 : _a.rules.forEach(rule => {
                    var _a;
                    const authRule = [];
                    const authStrategy = `authStrategy: AuthStrategy.${rule.allow.toUpperCase()}`;
                    switch (rule.allow) {
                        case process_auth_1.AuthStrategy.owner:
                            authRule.push(authStrategy);
                            authRule.push(`ownerField: "${rule.ownerField}"`);
                            authRule.push(`identityClaim: "${rule.identityClaim}"`);
                            break;
                        case process_auth_1.AuthStrategy.private:
                        case process_auth_1.AuthStrategy.public:
                            authRule.push(authStrategy);
                            break;
                        case process_auth_1.AuthStrategy.groups:
                            authRule.push(authStrategy);
                            authRule.push(`groupClaim: "${rule.groupClaim}"`);
                            if (rule.groups) {
                                authRule.push(`groups: [ ${(_a = rule.groups) === null || _a === void 0 ? void 0 : _a.map(group => `"${group}"`).join(', ')} ]`);
                            }
                            else {
                                authRule.push(`groupsField: "${rule.groupField}"`);
                            }
                            break;
                        default:
                            warn_1.printWarning(`Model has auth with authStrategy ${rule.allow} of which is not yet supported`);
                            return '';
                    }
                    authRule.push(['operations: [',
                        visitor_plugin_common_1.indentMultiline(rule.operations.map(op => `ModelOperation.${op.toUpperCase()}`).join(',\n')),
                        ']'
                    ].join('\n'));
                    rules.push(`AuthRule(\n${visitor_plugin_common_1.indentMultiline(authRule.join(',\n'))})`);
                });
            });
            if (rules.length) {
                return ['modelSchemaDefinition.authRules = [', visitor_plugin_common_1.indentMultiline(rules.join(',\n')), '];'].join('\n');
            }
        }
        return '';
    }
    generateAddFields(model) {
        if (model.fields.length) {
            const fieldsToAdd = [];
            model.fields.forEach(field => {
                const fieldName = this.getFieldName(field);
                const modelName = this.getModelName(model);
                const queryFieldName = this.getQueryFieldName(field);
                let fieldParam = '';
                if (fieldName === 'id') {
                    fieldsToAdd.push('ModelFieldDefinition.id()');
                }
                else if (field.connectionInfo) {
                    const connectedModelName = this.getNativeType({ ...field, isList: false });
                    switch (field.connectionInfo.kind) {
                        case process_connections_1.CodeGenConnectionType.HAS_ONE:
                            fieldParam = [
                                `key: ${modelName}.${queryFieldName}`,
                                `isRequired: ${!field.isNullable}`,
                                `ofModelName: (${connectedModelName}).toString()`,
                                `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`
                            ].join(',\n');
                            fieldsToAdd.push(['ModelFieldDefinition.hasOne(', visitor_plugin_common_1.indentMultiline(fieldParam), ')'].join('\n'));
                            break;
                        case process_connections_1.CodeGenConnectionType.HAS_MANY:
                            fieldParam = [
                                `key: ${modelName}.${queryFieldName}`,
                                `isRequired: ${!field.isNullable}`,
                                `ofModelName: (${connectedModelName}).toString()`,
                                `associatedKey: ${connectedModelName}.${this.getQueryFieldName(field.connectionInfo.associatedWith)}`
                            ].join(',\n');
                            fieldsToAdd.push(['ModelFieldDefinition.hasMany(', visitor_plugin_common_1.indentMultiline(fieldParam), ')'].join('\n'));
                            break;
                        case process_connections_1.CodeGenConnectionType.BELONGS_TO:
                            fieldParam = [
                                `key: ${modelName}.${queryFieldName}`,
                                `isRequired: ${!field.isNullable}`,
                                `targetName: "${field.connectionInfo.targetName}"`,
                                `ofModelName: (${connectedModelName}).toString()`
                            ].join(',\n');
                            fieldsToAdd.push(['ModelFieldDefinition.belongsTo(', visitor_plugin_common_1.indentMultiline(fieldParam), ')'].join('\n'));
                            break;
                    }
                }
                else {
                    const ofType = this.isEnumType(field)
                        ? '.enumeration'
                        : (field.type in dart_config_1.typeToEnumMap
                            ? dart_config_1.typeToEnumMap[field.type]
                            : '.string');
                    const ofTypeStr = field.isList
                        ? `ofType: ModelFieldType(ModelFieldTypeEnum.collection, ofModelName: describeEnum(ModelFieldTypeEnum${ofType}))`
                        : `ofType: ModelFieldType(ModelFieldTypeEnum${ofType})`;
                    fieldParam = [
                        `key: ${modelName}.${queryFieldName}`,
                        `isRequired: ${this.isFieldRequired(field)}`,
                        field.isList ? 'isArray: true' : '',
                        ofTypeStr
                    ].filter(f => f).join(',\n');
                    fieldsToAdd.push(['ModelFieldDefinition.field(', visitor_plugin_common_1.indentMultiline(fieldParam), ')'].join('\n'));
                }
            });
            return fieldsToAdd.map(field => `modelSchemaDefinition.addField(${field});`).join('\n\n');
        }
        return '';
    }
    getNonConnectedField(model) {
        return model.fields.filter(f => {
            if (!f.connectionInfo) {
                return true;
            }
            if (f.connectionInfo.kind == process_connections_1.CodeGenConnectionType.BELONGS_TO) {
                return true;
            }
        });
    }
    formatDartCode(dartCode) {
        const result = dart_style_1.default.formatCode(dartCode);
        if (result.error) {
            throw new Error(result.error);
        }
        return result.code || '';
    }
    isFieldRequired(field) {
        return !((field.isNullable && !field.isList) || field.isListNullable);
    }
}
exports.AppSyncModelDartVisitor = AppSyncModelDartVisitor;
//# sourceMappingURL=appsync-dart-visitor.js.map