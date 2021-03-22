"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFieldName = void 0;
const change_case_1 = require("change-case");
function validateFieldName(models) {
    Object.entries(models).forEach(([modelName, model]) => {
        let validateMap = {};
        model.fields.forEach(field => {
            const key = change_case_1.camelCase(field.name);
            if (key in validateMap) {
                throw new Error(`Fields "${field.name}" and "${validateMap[key]}" in ${model.name} cannot be used at the same time which will result in the duplicate builder method.`);
            }
            validateMap[key] = field.name;
        });
    });
}
exports.validateFieldName = validateFieldName;
//# sourceMappingURL=validate-field-name.js.map