const fs = require('fs');
const { schemas } = require('@aws-amplify/graphql-schema-test-library');

const schemaName = process.argv.slice(2, 3)[0];
if (!schemaName) {
  throw new Error('A schema name must be supplied.');
}
const schema = schemas[schemaName];
if (!schema) {
  throw new Error(`${schemaName} does not exist in the schema test library.`);
}

const projectName = 'tsjo0dz';

console.log(`${schemaName}: ${schema.description}`);
console.log(schema.sdl);

const fileContents = `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n${schema.sdl}`;
fs.writeFileSync(`amplify/backend/api/${projectName}/schema.graphql`, fileContents);
