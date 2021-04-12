'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.indent = exports.wrap = exports.block = exports.join = void 0;
function join(maybeArray, separator) {
  return maybeArray ? maybeArray.filter(x => x).join(separator || '') : '';
}
exports.join = join;
function block(array) {
  return array && array.length !== 0 ? indent('{\n' + join(array, '\n')) + '\n}' : '{}';
}
exports.block = block;
function wrap(start, maybeString, end) {
  return maybeString ? start + maybeString + (end || '') : '';
}
exports.wrap = wrap;
function indent(maybeString) {
  return maybeString && maybeString.replace(/\n/g, '\n  ');
}
exports.indent = indent;
//# sourceMappingURL=printing.js.map
