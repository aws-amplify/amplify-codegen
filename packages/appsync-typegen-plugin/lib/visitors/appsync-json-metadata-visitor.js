"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncJSONVisitor = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const process_connections_1 = require("../utils/process-connections");
const appsync_visitor_1 = require("./appsync-visitor");
const scalars_1 = require("../scalars");
class AppSyncJSONVisitor extends appsync_visitor_1.AppSyncModelVisitor {
    constructor(schema, rawConfig, additionalConfig, defaultScalars = visitor_plugin_common_1.DEFAULT_SCALARS) {
        super(schema, rawConfig, additionalConfig, defaultScalars);
        this._parsedConfig.metadataTarget = rawConfig.metadataTarget || 'javascript';
    }
    generate() {
        this.processDirectives();
        if (this._parsedConfig.metadataTarget === 'typescript') {
            return this.generateTypeScriptMetadata();
        }
        else if (this._parsedConfig.metadataTarget === 'javascript') {
            return this.generateJavaScriptMetadata();
        }
        else if (this._parsedConfig.metadataTarget === 'typeDeclaration') {
            return this.generateTypeDeclaration();
        }
        throw new Error(`Unsupported metadataTarget ${this._parsedConfig.metadataTarget}. Supported targets are javascript and typescript`);
    }
    generateTypeScriptMetadata() {
        const metadataObj = this.generateMetadata();
        const metadata = [`import { Schema } from "@aws-amplify/datastore";`, ''];
        metadata.push(`export const schema: Schema = ${JSON.stringify(metadataObj, null, 4)};`);
        return metadata.join('\n');
    }
    generateJavaScriptMetadata() {
        const metadataObj = this.generateMetadata();
        const metadata = [];
        metadata.push(`export const schema = ${JSON.stringify(metadataObj, null, 4)};`);
        return metadata.join('\n');
    }
    generateTypeDeclaration() {
        return ["import { Schema } from '@aws-amplify/datastore';", '', 'export declare const schema: Schema;'].join('\n');
    }
    generateJSONMetadata() {
        const metadata = this.generateMetadata();
        return JSON.stringify(metadata, null, 4);
    }
    generateMetadata() {
        const result = {
            models: {},
            enums: {},
            nonModels: {},
            version: this.computeVersion(),
        };
        const models = Object.values(this.getSelectedModels()).reduce((acc, model) => {
            return { ...acc, [model.name]: this.generateModelMetadata(model) };
        }, {});
        const nonModels = Object.values(this.getSelectedNonModels()).reduce((acc, nonModel) => {
            return { ...acc, [nonModel.name]: this.generateNonModelMetadata(nonModel) };
        }, {});
        const enums = Object.values(this.enumMap).reduce((acc, enumObj) => {
            const enumV = this.generateEnumMetadata(enumObj);
            return { ...acc, [this.getEnumName(enumObj)]: enumV };
        }, {});
        return { ...result, models, nonModels: nonModels, enums };
    }
    getFieldAssociation(field) {
        if (field.connectionInfo) {
            const { connectionInfo } = field;
            const connectionAttribute = { connectionType: connectionInfo.kind };
            if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_MANY) {
                connectionAttribute.associatedWith = this.getFieldName(connectionInfo.associatedWith);
            }
            else if (connectionInfo.kind === process_connections_1.CodeGenConnectionType.HAS_ONE) {
                connectionAttribute.associatedWith = this.getFieldName(connectionInfo.associatedWith);
                connectionAttribute.targetName = connectionInfo.targetName;
            }
            else {
                connectionAttribute.targetName = connectionInfo.targetName;
            }
            return connectionAttribute;
        }
    }
    generateModelAttributes(model) {
        return model.directives.map(d => ({
            type: d.name,
            properties: d.arguments,
        }));
    }
    generateModelMetadata(model) {
        return {
            ...this.generateNonModelMetadata(model),
            syncable: true,
            pluralName: this.pluralizeModelName(model),
            attributes: this.generateModelAttributes(model),
        };
    }
    generateNonModelMetadata(nonModel) {
        return {
            name: this.getModelName(nonModel),
            fields: nonModel.fields.reduce((acc, field) => {
                const fieldMeta = {
                    name: this.getFieldName(field),
                    isArray: field.isList,
                    type: this.getType(field.type),
                    isRequired: !field.isNullable,
                    attributes: [],
                };
                if (field.isListNullable !== undefined) {
                    fieldMeta.isArrayNullable = field.isListNullable;
                }
                const association = this.getFieldAssociation(field);
                if (association) {
                    fieldMeta.association = association;
                }
                acc[fieldMeta.name] = fieldMeta;
                return acc;
            }, {}),
        };
    }
    generateEnumMetadata(enumObj) {
        return {
            name: enumObj.name,
            values: Object.values(enumObj.values),
        };
    }
    getType(gqlType) {
        if (gqlType in scalars_1.METADATA_SCALAR_MAP) {
            return scalars_1.METADATA_SCALAR_MAP[gqlType];
        }
        if (gqlType in this.enumMap) {
            return { enum: this.enumMap[gqlType].name };
        }
        if (gqlType in this.nonModelMap) {
            return { nonModel: gqlType };
        }
        if (gqlType in this.modelMap) {
            return { model: gqlType };
        }
        throw new Error(`Unknown type ${gqlType}`);
    }
}
exports.AppSyncJSONVisitor = AppSyncJSONVisitor;
//# sourceMappingURL=appsync-json-metadata-visitor.js.map