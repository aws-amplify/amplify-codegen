"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptDeclarationBlock = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
function isStringValueNode(node) {
    return node && typeof node === 'object' && node.kind === 'StringValue';
}
function transformComment(comment, indentLevel = 0) {
    if (!comment || comment === '') {
        return '';
    }
    if (isStringValueNode(comment)) {
        comment = comment.value;
    }
    comment = comment.split('*/').join('*\\/');
    const lines = comment.split('\n');
    return lines
        .map((line, index) => {
        const isLast = lines.length === index + 1;
        const isFirst = index === 0;
        if (isFirst && isLast) {
            return visitor_plugin_common_1.indent(`// ${comment} */\n`, indentLevel);
        }
        return visitor_plugin_common_1.indent(`${isFirst ? '/*' : ''} * ${line}${isLast ? '\n */\n' : ''}`, indentLevel);
    })
        .join('\n');
}
class TypeScriptDeclarationBlock {
    constructor() {
        this._name = '';
        this._kind = 'class';
        this._extends = [];
        this._properties = [];
        this._methods = [];
        this._flags = {
            isDeclaration: false,
            shouldExport: false,
        };
        this._comments = '';
        this._block = '';
        this._enumValues = {};
    }
    withName(name) {
        this._name = name;
        return this;
    }
    export(shouldExport = true) {
        this._flags.shouldExport = shouldExport;
        return this;
    }
    withComment(comment) {
        this._comments = transformComment(comment);
        return this;
    }
    withBlock(block) {
        this._block = block;
        return this;
    }
    asKind(kind) {
        this._kind = kind;
        return this;
    }
    withFlag(flags) {
        this._flags = { ...this._flags, ...flags };
        return this;
    }
    addEnumValue(name, value) {
        if (this._kind !== 'enum') {
            throw new Error('Can not add enum values for non enum kind');
        }
        this._enumValues[name] = value !== undefined ? value : name;
    }
    withEnumValues(values) {
        if (Array.isArray(values)) {
            values.forEach(val => this.addEnumValue(val));
        }
        else {
            Object.entries(values).forEach(([name, val]) => this.addEnumValue(name, val));
        }
        return this;
    }
    addProperty(name, type, value, access = 'DEFAULT', flags = {}) {
        if (this._kind === 'enum') {
            throw new Error('Can not add property to enum kind');
        }
        this._properties.push({
            name,
            type,
            flags,
            access,
            value,
        });
    }
    addClassMethod(name, returnType, implmentation, args = [], access = 'DEFAULT', flags = {}, comment = '') {
        if (this._kind === 'enum') {
            throw new Error('Can not add method to enum kind');
        }
        this._methods.push({
            name,
            returnType,
            implmentation,
            args,
            flags,
            access,
            comment: transformComment(comment),
        });
    }
    get string() {
        switch (this._kind) {
            case 'interface':
                return this.generateInterface();
            case 'class':
                return this.generateClass();
            case 'enum':
                return this.generateEnum();
        }
    }
    generateEnum() {
        if (this._kind !== 'enum') {
            throw new Error(`generateEnum called for non enum kind(${this._kind})`);
        }
        const header = ['export', 'enum', this._name].join(' ');
        const body = Object.entries(this._enumValues)
            .map(([name, value]) => `${name} = "${value}"`)
            .join(',\n');
        return [`${header} {`, visitor_plugin_common_1.indentMultiline(body), '}'].join('\n');
    }
    generateClass() {
        const header = [
            this._flags.shouldExport ? 'export' : '',
            this._flags.isDeclaration ? 'declare' : '',
            'class',
            this._name,
            '{',
        ];
        if (this._extends.length) {
            header.push(['extends', this._extends.join(', ')].join(' '));
        }
        const body = [this.generateProperties(), this.generateMethods()];
        return [`${header.filter(h => h).join(' ')}`, visitor_plugin_common_1.indentMultiline(body.join('\n')), '}'].join('\n');
    }
    generateProperties() {
        const props = this._properties.map(prop => {
            const result = [];
            if (prop.access !== 'DEFAULT') {
                result.push(prop.access);
            }
            if (prop.flags && prop.flags.readonly) {
                result.push('readonly');
            }
            result.push(this.generatePropertyName(prop));
            if (prop.value) {
                result.push(` = ${prop.type};`);
            }
            return result.join(' ');
        });
        return props.map(propDeclaration => `${propDeclaration};`).join('\n');
    }
    generateMethods() {
        const methods = this._methods.map(method => {
            const methodAccessAndName = [];
            if (method.access !== 'DEFAULT') {
                methodAccessAndName.push(method.access);
            }
            if (method.flags.static) {
                methodAccessAndName.push('static');
            }
            methodAccessAndName.push(method.name);
            const args = method.args
                .map(arg => {
                return `${arg.name}${arg.type ? `: ${arg.type}` : ''}`;
            })
                .join(', ');
            const returnType = method.returnType ? `: ${method.returnType}` : '';
            const methodHeaderStr = `${methodAccessAndName.join(' ')}(${args})${returnType}`;
            if (this._flags.isDeclaration) {
                return `${methodHeaderStr};`;
            }
            return [`${methodHeaderStr}`, '{', method.implmentation ? visitor_plugin_common_1.indentMultiline(method.implmentation) : '', '}'].join('\n');
        });
        return methods.join('\n');
    }
    generateInterface() {
        throw new Error('Not implemented yet');
    }
    generatePropertyName(property) {
        let propertyName = property.name;
        if (property.flags.optional) {
            propertyName = `${propertyName}?`;
        }
        return property.type ? `${propertyName}: ${property.type}` : propertyName;
    }
}
exports.TypeScriptDeclarationBlock = TypeScriptDeclarationBlock;
//# sourceMappingURL=typescript-declaration-block.js.map