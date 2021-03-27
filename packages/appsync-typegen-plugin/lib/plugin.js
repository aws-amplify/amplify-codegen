'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.plugin = void 0;
const typescript_1 = require('./typescript');
const legacyIR_1 = require('./compiler/legacyIR');
const loading_1 = require('./loading');
exports.plugin = (schema, rawDocuments, config) => {
  const document = loading_1.loadAndMergeQueryDocuments(config.temp, '');
  const context = legacyIR_1.compileToLegacyIR(schema, document, {
    addTypename: true,
  });
  let output = typescript_1.generateSource(context);
  return output;
};
//# sourceMappingURL=plugin.js.map
