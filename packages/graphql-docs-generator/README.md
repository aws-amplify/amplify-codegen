# GraphQL Docs generator
GraphQL document generator takes a schema and generates all possible statements(queries, mutations and subscription) on that schema. This can act as a starting point for the users who are new to GraphQL.

## Installation and execution
#### Executing from the command line:
```
$ npm install -g @aws-amplify/graphql-docs-generator

$ graphql-docs-generator --schema 'my-graphql-sdl-schema'

$ graphql-docs-generator --schema 'my-graphql-introspection-schema' --maxDepth 2
```

#### Executing from NodeJS or browser environments:

Add a dependency on the `3.1.0-studio-graphql-4.0` version of `@aws-amplify/graphql-docs-generator` in your `package.json` file, install and build.
```
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';

const schema = 'my-graphql-sdl-schema';

// Below are the supported optional customizations and their defaults
const options = {
  maxDepth: 2
};

const generatedResult = generateGraphQLDocuments(schema, options);

// Test logs to demonstrate the output
console.log(generatedResult.queries);
console.log(generatedResult.mutations);
console.log(generatedResult.subscriptions);
console.log(generatedResult.fragments);
```