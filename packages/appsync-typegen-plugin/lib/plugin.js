"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = void 0;
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
const appsync_swift_visitor_1 = require("./visitors/appsync-swift-visitor");
const appsync_json_metadata_visitor_1 = require("./visitors/appsync-json-metadata-visitor");
const appsync_java_visitor_1 = require("./visitors/appsync-java-visitor");
const appsync_typescript_visitor_1 = require("./visitors/appsync-typescript-visitor");
const appsync_javascript_visitor_1 = require("./visitors/appsync-javascript-visitor");
const appsync_dart_visitor_1 = require("./visitors/appsync-dart-visitor");
const plugin = (schema, rawDocuments, config) => {
    let visitor;
    switch (config.target) {
        case 'swift':
            visitor = new appsync_swift_visitor_1.AppSyncSwiftVisitor(schema, config, {
                selectedType: config.selectedType,
                generate: config.generate,
            });
            break;
        case 'java':
            visitor = new appsync_java_visitor_1.AppSyncModelJavaVisitor(schema, config, {
                selectedType: config.selectedType,
                generate: config.generate,
            });
            break;
        case 'metadata':
            visitor = new appsync_json_metadata_visitor_1.AppSyncJSONVisitor(schema, config, {});
            break;
        case 'typescript':
            visitor = new appsync_typescript_visitor_1.AppSyncModelTypeScriptVisitor(schema, config, {});
            break;
        case 'javascript':
            visitor = new appsync_javascript_visitor_1.AppSyncModelJavascriptVisitor(schema, config, {});
            break;
        case 'dart':
            visitor = new appsync_dart_visitor_1.AppSyncModelDartVisitor(schema, config, {
                selectedType: config.selectedType,
                generate: config.generate,
            });
            break;
        default:
            return '';
    }
    if (schema) {
        const schemaStr = utils_1.printSchemaWithDirectives(schema);
        const node = graphql_1.parse(schemaStr);
        graphql_1.visit(node, {
            leave: visitor,
        });
        return visitor.generate();
    }
    return '';
};
exports.plugin = plugin;
//# sourceMappingURL=plugin.js.map