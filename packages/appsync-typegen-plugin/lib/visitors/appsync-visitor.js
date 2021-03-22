"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncModelVisitor = exports.CodeGenGenerateEnum = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const change_case_1 = require("change-case");
const pluralize_1 = require("pluralize");
const crypto_1 = __importDefault(require("crypto"));
const graphql_1 = require("graphql");
const fieldUtils_1 = require("../utils/fieldUtils");
const get_type_info_1 = require("../utils/get-type-info");
const process_connections_1 = require("../utils/process-connections");
const sort_1 = require("../utils/sort");
const warn_1 = require("../utils/warn");
const process_auth_1 = require("../utils/process-auth");
var CodeGenGenerateEnum;
(function (CodeGenGenerateEnum) {
    CodeGenGenerateEnum["metadata"] = "metadata";
    CodeGenGenerateEnum["code"] = "code";
    CodeGenGenerateEnum["loader"] = "loader";
})(CodeGenGenerateEnum = exports.CodeGenGenerateEnum || (exports.CodeGenGenerateEnum = {}));
class AppSyncModelVisitor extends visitor_plugin_common_1.BaseVisitor {
    constructor(_schema, rawConfig, additionalConfig, defaultScalars = visitor_plugin_common_1.DEFAULT_SCALARS) {
        super(rawConfig, {
            ...additionalConfig,
            scalars: visitor_plugin_common_1.buildScalars(_schema, rawConfig.scalars || '', defaultScalars),
        });
        this._schema = _schema;
        this.READ_ONLY_FIELDS = ['id'];
        this.SCALAR_TYPE_MAP = {};
        this.modelMap = {};
        this.nonModelMap = {};
        this.enumMap = {};
        this.typesToSkip = [];
        const typesUsedInDirectives = [];
        if (rawConfig.directives) {
            const directiveSchema = graphql_1.parse(rawConfig.directives);
            directiveSchema.definitions.forEach((definition) => {
                if (definition.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION || definition.kind === graphql_1.Kind.INPUT_OBJECT_TYPE_DEFINITION) {
                    typesUsedInDirectives.push(definition.name.value);
                }
            });
        }
        this.typesToSkip = [this._schema.getQueryType(), this._schema.getMutationType(), this._schema.getSubscriptionType()]
            .filter(t => t)
            .map(t => (t && t.name) || '');
        this.typesToSkip.push(...typesUsedInDirectives);
    }
    ObjectTypeDefinition(node, index, parent) {
        if (this.typesToSkip.includes(node.name.value)) {
            return;
        }
        const directives = this.getDirectives(node.directives);
        const fields = node.fields;
        if (directives.find(directive => directive.name === 'model')) {
            const model = {
                name: node.name.value,
                type: 'model',
                directives,
                fields,
            };
            this.ensureIdField(model);
            this.sortFields(model);
            this.modelMap[node.name.value] = model;
        }
        else {
            const nonModel = {
                name: node.name.value,
                type: 'model',
                directives,
                fields,
            };
            this.nonModelMap[node.name.value] = nonModel;
        }
    }
    FieldDefinition(node) {
        const directive = this.getDirectives(node.directives);
        return {
            name: node.name.value,
            directives: directive,
            ...get_type_info_1.getTypeInfo(node.type, this._schema),
        };
    }
    EnumTypeDefinition(node) {
        if (this.typesToSkip.includes(node.name.value)) {
            return;
        }
        const enumName = this.getEnumName(node.name.value);
        const values = node.values
            ? node.values.reduce((acc, val) => {
                acc[this.getEnumValue(val.name.value)] = val.name.value;
                return acc;
            }, {})
            : {};
        this.enumMap[node.name.value] = {
            name: enumName,
            type: 'enum',
            values,
        };
    }
    processDirectives() {
        this.processConnectionDirective();
        this.processAuthDirectives();
    }
    generate() {
        this.processDirectives();
        return '';
    }
    getDirectives(directives) {
        if (directives) {
            return directives.map(d => ({
                name: d.name.value,
                arguments: this.getDirectiveArguments(d),
            }));
        }
        return [];
    }
    getDirectiveArguments(directive) {
        const directiveArguments = {};
        if (directive.arguments) {
            directive.arguments.reduce((acc, arg) => {
                directiveArguments[arg.name.value] = graphql_1.valueFromASTUntyped(arg.value);
                return directiveArguments;
            }, directiveArguments);
        }
        return directiveArguments;
    }
    getSelectedModels() {
        if (this._parsedConfig.selectedType) {
            const selectedModel = this.modelMap[this._parsedConfig.selectedType];
            return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
        }
        return this.modelMap;
    }
    getSelectedNonModels() {
        if (this._parsedConfig.selectedType) {
            const selectedModel = this.nonModelMap[this._parsedConfig.selectedType];
            return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
        }
        return this.nonModelMap;
    }
    getSelectedEnums() {
        if (this._parsedConfig.selectedType) {
            const selectedModel = this.enumMap[this._parsedConfig.selectedType];
            return selectedModel ? { [this._parsedConfig.selectedType]: selectedModel } : {};
        }
        return this.enumMap;
    }
    selectedTypeIsEnum() {
        if (this._parsedConfig && this._parsedConfig.selectedType) {
            if (this._parsedConfig.selectedType in this.enumMap) {
                return true;
            }
        }
        return false;
    }
    selectedTypeIsNonModel() {
        if (this._parsedConfig && this._parsedConfig.selectedType) {
            if (this._parsedConfig.selectedType in this.nonModelMap) {
                return true;
            }
        }
        return false;
    }
    getNativeType(field) {
        const typeName = field.type;
        let typeNameStr = '';
        if (typeName in this.scalars) {
            typeNameStr = this.scalars[typeName];
        }
        else if (this.isModelType(field)) {
            typeNameStr = this.getModelName(this.modelMap[typeName]);
        }
        else if (this.isEnumType(field)) {
            typeNameStr = this.getEnumName(this.enumMap[typeName]);
        }
        else if (this.isNonModelType(field)) {
            typeNameStr = this.getNonModelName(this.nonModelMap[typeName]);
        }
        else {
            throw new Error(`Unknown type ${typeName} for field ${field.name}. Did you forget to add the @model directive`);
        }
        return field.isList ? this.getListType(typeNameStr, field) : typeNameStr;
    }
    getListType(typeStr, field) {
        return `List<${typeStr}>`;
    }
    getFieldName(field) {
        return field.name;
    }
    getEnumName(enumField) {
        if (typeof enumField === 'string') {
            return change_case_1.pascalCase(enumField);
        }
        return change_case_1.pascalCase(enumField.name);
    }
    getModelName(model) {
        return model.name;
    }
    getNonModelName(model) {
        return model.name;
    }
    getEnumValue(value) {
        return change_case_1.constantCase(value);
    }
    isEnumType(field) {
        const typeName = field.type;
        return typeName in this.enumMap;
    }
    isModelType(field) {
        const typeName = field.type;
        return typeName in this.modelMap;
    }
    isNonModelType(field) {
        const typeName = field.type;
        return typeName in this.nonModelMap;
    }
    computeVersion() {
        const typeArr = [];
        Object.values({ ...this.modelMap, ...this.nonModelMap }).forEach((obj) => {
            const directives = obj.directives.filter(dir => dir.name === 'key');
            const fields = obj.fields
                .map((field) => {
                const fieldDirectives = field.directives.filter(field => field.name === 'connection');
                return {
                    name: field.name,
                    directives: fieldDirectives,
                    type: field.type,
                    isNullable: field.isNullable,
                    isList: field.isList,
                    isListNullable: field.isListNullable,
                };
            })
                .sort((a, b) => sort_1.sortFields(a, b));
            typeArr.push({
                name: obj.name,
                directives,
                fields,
            });
        });
        typeArr.sort(sort_1.sortFields);
        return crypto_1.default
            .createHash('MD5')
            .update(JSON.stringify(typeArr))
            .digest()
            .toString('hex');
    }
    sortFields(model) {
        model.fields = model.fields.reduce((acc, field) => {
            if (field.name === 'id') {
                acc.unshift(field);
            }
            else {
                acc.push(field);
            }
            return acc;
        }, []);
    }
    ensureIdField(model) {
        const idField = model.fields.find(field => field.name === 'id');
        if (idField) {
            if (idField.type !== 'ID') {
                throw new Error(`id field on ${model.name} should be of type ID`);
            }
            idField.isNullable = false;
        }
        else {
            model.fields.splice(0, 0, {
                name: 'id',
                type: 'ID',
                isNullable: false,
                isList: false,
                directives: [],
            });
        }
    }
    processConnectionDirective() {
        Object.values(this.modelMap).forEach(model => {
            model.fields.forEach(field => {
                const connectionInfo = process_connections_1.processConnections(field, model, this.modelMap);
                if (connectionInfo) {
                    if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_MANY || connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_ONE) {
                        fieldUtils_1.addFieldToModel(connectionInfo.connectedModel, connectionInfo.associatedWith);
                    }
                    else if (connectionInfo.targetName !== 'id') {
                        fieldUtils_1.removeFieldFromModel(model, connectionInfo.targetName);
                    }
                    field.connectionInfo = connectionInfo;
                }
            });
            const modelTypes = Object.values(this.modelMap).map(model => model.name);
            model.fields = model.fields.filter(field => {
                const fieldType = field.type;
                const connectionInfo = field.connectionInfo;
                if (modelTypes.includes(fieldType) && connectionInfo === undefined) {
                    warn_1.printWarning(`Model ${model.name} has field ${field.name} of type ${field.type} but its not connected. Add a @connection directive if want to connect them.`);
                    return false;
                }
                return true;
            });
        });
    }
    processAuthDirectives() {
        Object.values(this.modelMap).forEach(model => {
            const filteredDirectives = model.directives.filter(d => d.name !== 'auth');
            const authDirectives = process_auth_1.processAuthDirective(model.directives);
            model.directives = [...filteredDirectives, ...authDirectives];
            model.fields.forEach(field => {
                const nonAuthDirectives = field.directives.filter(d => d.name != 'auth');
                const authDirectives = process_auth_1.processAuthDirective(field.directives);
                field.directives = [...nonAuthDirectives, ...authDirectives];
            });
        });
    }
    pluralizeModelName(model) {
        return pluralize_1.plural(model.name);
    }
    get models() {
        return this.modelMap;
    }
    get enums() {
        return this.enumMap;
    }
    get nonModels() {
        return this.nonModelMap;
    }
}
exports.AppSyncModelVisitor = AppSyncModelVisitor;
//# sourceMappingURL=appsync-visitor.js.map