const fs = require('fs');
const { extname } = require('path');

function loadSchema(schemaPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  return fs.readFileSync(schemaPath, 'utf8');
}

function isSDLSchema(schemaPath) {
  if (extname(schemaPath) === '.json') {
    return false;
  }
  return true;
}

module.exports = { loadSchema, isSDLSchema };
