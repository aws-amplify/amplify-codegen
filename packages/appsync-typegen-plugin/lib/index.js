"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToSchema = void 0;
__exportStar(require("./plugin"), exports);
__exportStar(require("./preset"), exports);
const addToSchema = (config) => {
    const result = [];
    if (config.scalars) {
        if (typeof config.scalars === 'string') {
            result.push(config.scalars);
        }
        else {
            result.push(...Object.keys(config.scalars).map(scalar => `scalar ${scalar}`));
        }
    }
    if (config.directives) {
        if (typeof config.directives === 'string') {
            result.push(config.directives);
        }
    }
    return result.join('\n');
};
exports.addToSchema = addToSchema;
//# sourceMappingURL=index.js.map