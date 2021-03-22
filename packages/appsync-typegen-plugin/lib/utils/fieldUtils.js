"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFieldFromModel = exports.addFieldToModel = void 0;
function addFieldToModel(model, field) {
    const existingField = model.fields.find(f => f.name === field.name);
    if (!existingField) {
        model.fields.push(field);
    }
}
exports.addFieldToModel = addFieldToModel;
function removeFieldFromModel(model, fieldName) {
    model.fields = model.fields.filter(field => field.name !== fieldName);
}
exports.removeFieldFromModel = removeFieldFromModel;
//# sourceMappingURL=fieldUtils.js.map