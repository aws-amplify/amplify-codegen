import { createGenerator, Config, Definition } from 'ts-json-schema-generator';
import fs from 'fs-extra';
import path from 'path';

// Interface types are expected to be exported as "typeName" in the file
type TypeDef = {
  typeName: string;
  category: string;
  path: string;
};

// paths are relative to the package root
const schemaFilesRoot = './schemas';

// defines the type names and the paths to the TS files that define them
const typeDefs: TypeDef[] = [
  {
    typeName: 'ModelIntrospectionSchema',
    category: 'introspection',
    path: './src/interfaces/introspection/*.ts',
  },
];

const schemaFileName = (typeName: string) => `${typeName}.json`;
const forceFlag = '--overwrite';
const force = process.argv.includes(forceFlag);

// schema generation configs. See https://www.npmjs.com/package/ts-json-schema-generator

typeDefs.forEach(typeDef => {
  const config = { path: typeDef.path, type: typeDef.typeName, expose: "all", topRef: false } as Config;
  const typeSchema = createGenerator(config).createSchema(config.type)
  const version = (typeSchema.properties!.version as Definition).const! as number;
  const schemaFilePath = path.resolve(path.join(schemaFilesRoot, typeDef.category, version.toString(), schemaFileName(typeDef.typeName)));
  if (!force && fs.existsSync(schemaFilePath)) {
    console.error(`Schema version ${version} already exists for type ${typeDef.typeName}.`);
    console.info('The interface version must be bumped after any changes.');
    console.info(`Use the ${forceFlag} flag to overwrite existing versions`);
    console.info('Skipping this schema');
    return;
  }
  fs.ensureFileSync(schemaFilePath);
  fs.writeFileSync(schemaFilePath, JSON.stringify(typeSchema, undefined, 4) + '\n');
  console.log(`Schema version ${version} written for type ${typeDef.typeName}.`);
});


