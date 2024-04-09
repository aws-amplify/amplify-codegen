import Ajv from 'ajv';
import modelIntrospectionSchema from '../schemas/introspection/1/ModelIntrospectionSchema.json'
import { join } from 'path';
import { writeFileSync } from 'fs';

const standaloneCode = require("ajv/dist/standalone").default

const ajv = new Ajv({ code: { source: true } });
const validate = ajv.compile(modelIntrospectionSchema);

let moduleCode = standaloneCode(ajv, validate)

// Now you can write the module code to file
writeFileSync(join(__dirname, "../src/validate-cjs.js"), moduleCode)