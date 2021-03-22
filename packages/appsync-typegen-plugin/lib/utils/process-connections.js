"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processConnections = exports.getConnectedField = exports.makeConnectionAttributeName = exports.DEFAULT_HASH_KEY_FIELD = exports.CodeGenConnectionType = void 0;
const change_case_1 = require("change-case");
var CodeGenConnectionType;
(function (CodeGenConnectionType) {
    CodeGenConnectionType["HAS_ONE"] = "HAS_ONE";
    CodeGenConnectionType["BELONGS_TO"] = "BELONGS_TO";
    CodeGenConnectionType["HAS_MANY"] = "HAS_MANY";
})(CodeGenConnectionType = exports.CodeGenConnectionType || (exports.CodeGenConnectionType = {}));
exports.DEFAULT_HASH_KEY_FIELD = 'id';
function getDirective(fieldOrModel) {
    return (directiveName) => {
        return fieldOrModel.directives.find(d => d.name === directiveName);
    };
}
function makeConnectionAttributeName(type, field) {
    return field ? change_case_1.camelCase([type, field, 'id'].join('_')) : change_case_1.camelCase([type, 'id'].join('_'));
}
exports.makeConnectionAttributeName = makeConnectionAttributeName;
function getConnectedField(field, model, connectedModel) {
    const connectionInfo = getDirective(field)('connection');
    if (!connectionInfo) {
        throw new Error(`The ${field.name} on model ${model.name} is not connected`);
    }
    const connectionName = connectionInfo.arguments.name;
    const keyName = connectionInfo.arguments.keyName;
    const connectionFields = connectionInfo.arguments.fields;
    if (connectionFields) {
        let keyDirective;
        if (keyName) {
            keyDirective = connectedModel.directives.find(dir => {
                return dir.name === 'key' && dir.arguments.name === keyName;
            });
            if (!keyDirective) {
                throw new Error(`Error processing @connection directive on ${model.name}.${field.name}, @key directive with name ${keyName} was not found in connected model ${connectedModel.name}`);
            }
        }
        else {
            keyDirective = connectedModel.directives.find(dir => {
                return dir.name === 'key' && typeof dir.arguments.name === 'undefined';
            });
        }
        const connectedFieldName = keyDirective ? keyDirective.arguments.fields[0] : exports.DEFAULT_HASH_KEY_FIELD;
        const otherSideConnectedField = connectedModel.fields.find(f => {
            return f.directives.find(d => {
                return d.name === 'connection' && d.arguments.fields && d.arguments.fields[0] === connectedFieldName;
            });
        });
        if (otherSideConnectedField) {
            return otherSideConnectedField;
        }
        const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);
        if (!connectedField) {
            throw new Error(`Can not find key field ${connectedFieldName} in ${connectedModel}`);
        }
        return connectedField;
    }
    else if (connectionName) {
        const connectedField = connectedModel.fields.find(f => f.directives.find(d => d.name === 'connection' && d.arguments.name === connectionName && f !== field));
        if (!connectedField) {
            throw new Error(`Can not find key field with connection name ${connectionName} in ${connectedModel}`);
        }
        return connectedField;
    }
    const connectedFieldName = makeConnectionAttributeName(model.name, field.name);
    const connectedField = connectedModel.fields.find(f => f.name === connectedFieldName);
    return connectedField
        ? connectedField
        : {
            name: connectedFieldName,
            directives: [],
            type: 'ID',
            isList: false,
            isNullable: true,
        };
}
exports.getConnectedField = getConnectedField;
function processConnections(field, model, modelMap) {
    const connectionDirective = field.directives.find(d => d.name === 'connection');
    if (connectionDirective) {
        const otherSide = modelMap[field.type];
        const connectionFields = connectionDirective.arguments.fields || [];
        const otherSideField = getConnectedField(field, model, otherSide);
        const isNewField = !otherSide.fields.includes(otherSideField);
        const isConnectingFieldAutoCreated = connectionFields.length === 0;
        if (!isNewField) {
            if (field.isList && !otherSideField.isList) {
                return {
                    kind: CodeGenConnectionType.HAS_MANY,
                    associatedWith: otherSideField,
                    isConnectingFieldAutoCreated,
                    connectedModel: otherSide,
                };
            }
            else if (!field.isList && otherSideField.isList) {
                if (connectionFields.length > 1) {
                    throw new Error('DataStore only support one key in field');
                }
                return {
                    kind: CodeGenConnectionType.BELONGS_TO,
                    connectedModel: otherSide,
                    isConnectingFieldAutoCreated,
                    targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
                };
            }
            else if (!field.isList && !otherSideField.isList) {
                if (!field.isNullable && otherSideField.isNullable) {
                    return {
                        kind: CodeGenConnectionType.BELONGS_TO,
                        connectedModel: otherSide,
                        isConnectingFieldAutoCreated,
                        targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
                    };
                }
                else if (field.isNullable && !otherSideField.isNullable) {
                    return {
                        kind: CodeGenConnectionType.HAS_ONE,
                        associatedWith: otherSideField,
                        connectedModel: otherSide,
                        isConnectingFieldAutoCreated,
                        targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
                    };
                }
                else {
                    throw new Error(`DataStore does not support 1 to 1 connection with both sides of connection as optional field: ${model.name}.${field.name}`);
                }
            }
        }
        else {
            if (field.isList) {
                const connectionFieldName = makeConnectionAttributeName(model.name, field.name);
                const existingConnectionField = otherSide.fields.find(f => f.name === connectionFieldName);
                return {
                    kind: CodeGenConnectionType.HAS_MANY,
                    connectedModel: otherSide,
                    isConnectingFieldAutoCreated,
                    associatedWith: existingConnectionField || {
                        name: connectionFieldName,
                        type: 'ID',
                        isList: false,
                        isNullable: true,
                        directives: [],
                    },
                };
            }
            else {
                if (connectionFields.length > 1) {
                    throw new Error('DataStore only support one key in field');
                }
                return {
                    kind: CodeGenConnectionType.BELONGS_TO,
                    connectedModel: otherSide,
                    isConnectingFieldAutoCreated,
                    targetName: connectionFields[0] || makeConnectionAttributeName(model.name, field.name),
                };
            }
        }
    }
}
exports.processConnections = processConnections;
//# sourceMappingURL=process-connections.js.map