"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWarning = void 0;
const chalk_1 = __importDefault(require("chalk"));
const printedWarnings = [];
function printWarning(message) {
    if (!printedWarnings.includes(message)) {
        console.warn(`${chalk_1.default.bgYellow.black('warning:')} ${message}`);
        printedWarnings.push(message);
    }
}
exports.printWarning = printWarning;
//# sourceMappingURL=warn.js.map