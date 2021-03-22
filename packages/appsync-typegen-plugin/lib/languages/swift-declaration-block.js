"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwiftDeclarationBlock = exports.ListType = exports.escapeKeywords = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
function isStringValueNode(node) {
    return node && typeof node === 'object' && node.kind === 'StringValue';
}
const reservedKeywords = [
    '_COLUMN_',
    '_FILE_',
    '_FUNCTION_',
    '_LINE_',
    'as',
    'associativity',
    'break',
    'case',
    'Class',
    'continue',
    'convenience',
    'default',
    'deinit',
    'didSet',
    'do',
    'dynamic',
    'dynamicType',
    'else',
    'Enum',
    'extension',
    'fallthrough',
    'false',
    'final',
    'for',
    'Func',
    'get',
    'if',
    'import',
    'in',
    'infix',
    'Init',
    'inout',
    'internal',
    'is',
    'lazy',
    'left',
    'Let',
    'mutating',
    'nil',
    'none',
    'nonmutating',
    'operator',
    'optional',
    'override',
    'postfix',
    'precedence',
    'prefix',
    'private',
    'protocol',
    'Protocol',
    'public',
    'required',
    'return',
    'right',
    'self',
    'Self',
    'set',
    'static',
    'struct',
    'subscript',
    'super',
    'switch',
    'Type',
    'typealias',
    'true',
    'unknown',
    'unowned',
    'var',
    'weak',
    'where',
    'while',
    'willSet',
];
function escapeKeywords(keyword) {
    if (reservedKeywords.includes(keyword)) {
        return `\`${keyword}\``;
    }
    return keyword;
}
exports.escapeKeywords = escapeKeywords;
function transformComment(comment, indentLevel = 0) {
    if (isStringValueNode(comment)) {
        comment = comment.value;
    }
    if (!comment || comment === '') {
        return '';
    }
    const lines = comment.split('\n');
    return lines
        .map((line, index) => {
        const isLast = lines.length === index + 1;
        const isFirst = index === 0;
        if (isFirst && isLast) {
            return visitor_plugin_common_1.indent(`// ${comment} \n`, indentLevel);
        }
        line = line.split('*/').join('*\\/');
        return visitor_plugin_common_1.indent(`${isFirst ? '/*' : ''} * ${line}${isLast ? '\n */\n' : ''}`, indentLevel);
    })
        .join('\n');
}
var ListType;
(function (ListType) {
    ListType["ARRAY"] = "ARRAY";
    ListType["LIST"] = "LIST";
})(ListType = exports.ListType || (exports.ListType = {}));
class SwiftDeclarationBlock {
    constructor() {
        this._name = '';
        this._kind = 'struct';
        this._protocols = [];
        this._access = 'DEFAULT';
        this._properties = [];
        this._methods = [];
        this._comment = '';
        this._block = [];
        this._enumValues = {};
        this._flags = { final: false };
    }
    access(access) {
        this._access = access;
        return this;
    }
    final(isFinal = true) {
        this._flags.final = isFinal;
        return this;
    }
    withComment(comment) {
        if (comment) {
            this._comment = transformComment(comment, 0);
        }
        return this;
    }
    withName(name) {
        this._name = typeof name === 'object' ? name.value : name;
        return this;
    }
    withBlock(block) {
        this._block = [block];
        return this;
    }
    appendBlock(block) {
        this._block.push(block);
        return this;
    }
    asKind(kind) {
        this._kind = kind;
        return this;
    }
    addProperty(name, type, value, access = 'public', flags = {}, comment, getter, setter) {
        this._properties.push({
            name,
            type,
            value,
            access,
            flags: {
                optional: false,
                ...flags,
            },
            comment,
            getter,
            setter,
        });
        return this;
    }
    withProtocols(protocols) {
        this._protocols = protocols;
        return this;
    }
    addEnumValue(name, value) {
        if (this._kind !== 'enum') {
            throw new Error(`Can not add enum values for block type ${this._kind}`);
        }
        this._enumValues[name] = value || name;
        return this;
    }
    addClassMethod(name, returnType, implementation, args = [], access = 'public', flags = {}, comment = '') {
        this._methods.push({
            name,
            returnType,
            implementation: implementation,
            args,
            access,
            flags,
            comment: transformComment(comment),
        });
        return this;
    }
    get string() {
        if (this._kind === 'enum') {
            return this.generateEnumStr();
        }
        return this.generateStructOrExtensionStr();
    }
    generateEnumStr() {
        const declarationHead = this.mergeSections([
            this._comment,
            this.getAccessStr(),
            this._kind,
            `${escapeKeywords(this._name)}${this._protocols.length ? `: ${this._protocols.join(', ')}` : ''}`,
            '{',
        ], false, ' ');
        const enumValues = this.mergeSections(Object.entries(this._enumValues).map(([name, val]) => ['case', escapeKeywords(name), ...(name !== val ? ['=', `"${val}"`] : [])].join(' ')), false);
        const declarationFoot = '}';
        return this.mergeSections([declarationHead, visitor_plugin_common_1.indentMultiline(enumValues), declarationFoot], false);
    }
    generateStructOrExtensionStr() {
        const properties = this.mergeSections([...this._properties.map(prop => this.generatePropertiesStr(prop))], false);
        const methods = this.mergeSections(this._methods.map(method => {
            const argsStr = this.generateArgsStr(method.args);
            const argWithParenthesis = argsStr.length ? ['(', visitor_plugin_common_1.indentMultiline(argsStr).trim(), ')'].join('') : '()';
            const methodHeader = this.mergeSections([
                method.access === 'DEFAULT' ? '' : method.access,
                method.flags.static ? 'static' : '',
                ['init', 'deinit'].includes(method.name) ? '' : 'func',
                `${escapeKeywords(method.name)}${argWithParenthesis}`,
                method.returnType ? `-> ${method.returnType}` : '',
                '{',
            ], false, ' ');
            const methodFooter = '}';
            return this.mergeSections([method.comment, methodHeader, visitor_plugin_common_1.indentMultiline(method.implementation), methodFooter], false);
        }), false);
        const declarationHead = this.mergeSections([
            this._flags.final ? 'final' : '',
            this.getAccessStr(),
            this._kind,
            `${escapeKeywords(this._name)}${this._protocols.length ? `: ${this._protocols.join(', ')}` : ''}`,
            '{',
        ], false, ' ');
        const declarationBody = visitor_plugin_common_1.indentMultiline(this.mergeSections([...this._block, properties, methods]));
        const declarationFoot = '}';
        return this.mergeSections([this._comment, declarationHead, declarationBody, declarationFoot], false);
    }
    generateArgsStr(args) {
        const res = args.reduce((acc, arg) => {
            const val = arg.value ? arg.value : arg.flags.isList ? '[]' : arg.flags.optional ? 'nil' : null;
            const type = arg.flags.isList ? this.getListType(arg) : escapeKeywords(arg.type);
            acc.push([escapeKeywords(arg.name), ': ', type, arg.flags.optional ? '?' : '', val ? ` = ${val}` : ''].join(''));
            return acc;
        }, []);
        return res.length > 1 ? visitor_plugin_common_1.indentMultiline(res.join(',\n')) : res.join(',');
    }
    generatePropertiesStr(prop) {
        const propertyTypeName = prop.flags.isList ? this.getListType(prop) : prop.type;
        const propertyType = propertyTypeName ? `: ${propertyTypeName}${prop.flags.optional ? '?' : ''}` : '';
        let resultArr = [
            prop.access === 'DEFAULT' ? '' : prop.access,
            prop.flags.static ? 'static' : '',
            prop.flags.variable ? 'var' : 'let',
            `${escapeKeywords(prop.name)}${propertyType}`,
        ];
        const getterStr = prop.getter ? `{\n${visitor_plugin_common_1.indentMultiline(prop.getter)} \n}` : null;
        const setterStr = prop.setter ? `{\n${visitor_plugin_common_1.indentMultiline(prop.setter)} \n}` : null;
        let getterSetterStr = '';
        if (setterStr) {
            getterSetterStr = this.mergeSections(['{', visitor_plugin_common_1.indentMultiline(`set: ${setterStr}`), getterStr ? visitor_plugin_common_1.indentMultiline(`get: ${getterStr}`) : '', '}'], false);
        }
        else if (getterStr) {
            getterSetterStr = visitor_plugin_common_1.indentMultiline(getterStr);
        }
        resultArr.push(getterSetterStr);
        if (prop.value) {
            resultArr.push('=');
            resultArr.push(prop.value);
        }
        const propDeclaration = resultArr.filter(r => !!r).join(' ');
        return this.mergeSections([prop.comment ? `${transformComment(prop.comment)}` : '', propDeclaration], false);
    }
    getAccessStr() {
        return this._access === 'DEFAULT' ? '' : this._access;
    }
    mergeSections(sections, insertNewLine = true, joinStr = '\n') {
        return sections
            .filter(section => !!section)
            .map(section => (insertNewLine ? `${section}\n` : section))
            .join(joinStr)
            .trim();
    }
    getListType(typeDeclaration) {
        if (typeDeclaration.flags.listType === ListType.LIST) {
            return `List<${escapeKeywords(typeDeclaration.type)}>`;
        }
        return `[${escapeKeywords(typeDeclaration.type)}]`;
    }
}
exports.SwiftDeclarationBlock = SwiftDeclarationBlock;
//# sourceMappingURL=swift-declaration-block.js.map