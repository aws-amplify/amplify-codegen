"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartDeclarationBlock = void 0;
const visitor_plugin_common_1 = require("@graphql-codegen/visitor-plugin-common");
const strip_indent_1 = __importDefault(require("strip-indent"));
class DartDeclarationBlock {
    constructor() {
        this._name = null;
        this._kind = null;
        this._implementsStr = [];
        this._extendStr = [];
        this._extensionType = null;
        this._comment = null;
        this._annotations = [];
        this._members = [];
        this._methods = [];
        this._blocks = [];
    }
    addBlock(block) {
        this._blocks.push(block);
        return this;
    }
    annotate(annotations) {
        this._annotations = annotations;
        return this;
    }
    asKind(kind) {
        this._kind = kind;
        return this;
    }
    implements(implementsStr) {
        this._implementsStr = implementsStr;
        return this;
    }
    extends(extendsStr) {
        this._extendStr = extendsStr;
        return this;
    }
    extensionOn(extensionType) {
        this._extensionType = extensionType;
        return this;
    }
    withName(name) {
        this._name = typeof name === 'object' ? name.value : name;
        return this;
    }
    withComment(comment) {
        if (comment) {
            this._comment = visitor_plugin_common_1.transformComment(comment, 0);
        }
        return this;
    }
    addClassMember(name, type, value, flags = {}, annotations = []) {
        this._members.push({
            name,
            type,
            value,
            flags: {
                ...flags,
            },
            annotations
        });
        return this;
    }
    addClassMethod(name, returnType, args = [], implementation, flags = {}, annotations = [], comment = '') {
        this._methods.push({
            name,
            returnType,
            args,
            implementation,
            annotations,
            flags: {
                isBlock: true,
                ...flags
            },
            comment
        });
        return this;
    }
    get string() {
        let result = '';
        if (this._kind) {
            let name = '';
            if (this._name) {
                name = this._name;
            }
            let extendsStr = '';
            let implementsStr = '';
            let extensionStr = '';
            let annotatesStr = '';
            if (this._extendStr.length > 0) {
                extendsStr = ` extends ${this._extendStr.join(', ')}`;
            }
            if (this._implementsStr.length > 0) {
                implementsStr = ` implements ${this._implementsStr.join(', ')}`;
            }
            if (this._extensionType) {
                extensionStr = ` on ${this._extensionType}`;
            }
            if (this._annotations.length > 0) {
                annotatesStr = this._annotations.map(a => `@${a}`).join('\n') + '\n';
            }
            result += `${annotatesStr}${this._kind} ${name}${extendsStr}${implementsStr}${extensionStr} `;
        }
        const members = this._members.length
            ? visitor_plugin_common_1.indentMultiline(strip_indent_1.default(this._members.map(member => this.printMember(member) + ';').join('\n')))
            : null;
        const methods = this._methods.length
            ? visitor_plugin_common_1.indentMultiline(strip_indent_1.default(this._methods.map(method => this.printMethod(method)).join('\n\n')))
            : null;
        const blocks = this._blocks.length ? this._blocks.map(b => b._kind ? visitor_plugin_common_1.indentMultiline(b.string) : b.string).join('\n\n') : null;
        const before = this._kind ? '{' : '';
        const after = this._kind ? '}' : '';
        const blockStr = [members, methods, blocks].filter(f => f).join('\n\n');
        result += [before, blockStr, after].filter(f => f).join('\n');
        return (this._comment ? this._comment : '') + result;
    }
    printMember(member) {
        const flags = member.flags || {};
        const annotations = member.annotations || [];
        let annotatesStr = '';
        if (annotations.length) {
            annotatesStr = annotations.map(a => `@${a}`).join('\n') + '\n';
        }
        const components = [
            flags.static ? 'static' : null,
            flags.final ? 'final' : null,
            flags.const ? 'const' : null,
            flags.var ? 'var' : null,
            member.type,
            member.name,
        ].filter(f => f);
        return annotatesStr + components.join(' ') + (member.value ? ` = ${member.value}` : '');
    }
    printMethod(method) {
        const signature = [
            method.flags.static ? 'static' : null,
            method.flags.final ? 'final' : null,
            method.flags.const ? 'const' : null,
            method.returnType,
            method.name,
        ].filter(f => f).join(' ');
        const args = !method.flags.isGetter
            ? `(${method.args.map(arg => this.printMember(arg)).join(', ')})`
            : '';
        const comment = method.comment ? visitor_plugin_common_1.transformComment(method.comment) : '';
        const annotations = method.annotations.map(a => `@${a}\n`).join('');
        const implementation = method.flags.isBlock
            ? [' {', visitor_plugin_common_1.indentMultiline(method.implementation), '}'].join('\n')
            : method.implementation;
        return [
            comment,
            annotations,
            signature,
            args,
            implementation
        ].join('');
    }
}
exports.DartDeclarationBlock = DartDeclarationBlock;
//# sourceMappingURL=dart-declaration-block.js.map