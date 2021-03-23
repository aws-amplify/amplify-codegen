const path = require('path');
const fs = require('fs-extra');
const glob = require('glob-all');

export function loadSchema(apiResourcePath) {
  const schemaFilePath = path.join(apiResourcePath, 'schema.graphql');
  const schemaDirectory = path.join(apiResourcePath, 'schema');
  if (fs.pathExistsSync(schemaFilePath)) {
    return fs.readFileSync(schemaFilePath, 'utf8');
  }
  if (fs.pathExistsSync(schemaDirectory) && fs.lstatSync(schemaDirectory).isDirectory()) {
    // search recursively for graphql schema files inside `schema` directory
    const schemas = glob.sync([path.join(schemaDirectory, '**/*.graphql')]);
    return schemas.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  }
  throw new Error('Could not load the schema');
}

export async function validateSchema(context) {
  try {
    await context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', {
      noConfig: true,
      forceCompile: true,
      dryRun: true,
      disableResolverOverrides: true,
    });
  } catch (err) {
    context.print.error(err.toString());
  }
}
