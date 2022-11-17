const fs = require('fs');
const path = require('path');
const { schemas } = require('@aws-amplify/graphql-schema-test-library');

const schemaName = process.argv.slice(2, 3)[0];
if (!schemaName) {
  throw new Error('A schema name must be supplied.');
}
const schema = schemas[schemaName];
if (!schema) {
  throw new Error(`${schemaName} does not exist in the schema test library.\nPossible schemas: ${Object.keys(schemas).join(', ')}`);
}

console.log(schema.sdl);

let projectName = '';
try {
  projectName = fs.readdirSync(path.join('amplify', 'backend', 'api'))[0];
} catch (e) {
  throw new Error('No API found. Follow instructions in README to setup.');
}

const fileContents = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
fs.writeFileSync(path.join('amplify/backend/api', projectName, 'schema.graphql'), fileContents);
