const fs = require('fs');

function readSchemaFromFile(schemaPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  return fs.readFileSync(schemaPath, 'utf8');
}

module.exports = { readSchemaFromFile };
