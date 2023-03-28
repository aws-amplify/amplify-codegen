# GraphQL Docs generator
GraphQL document generator takes a schema and generates all possible statements(queries, mutations and subscription) on that schema. This can act as a starting point for the users who are new to GraphQL.

## Installation and execution
#### Executing from the command line:
```
$ npm install -g @aws-amplify/graphql-docs-generator

$ graphql-docs-generator --schema "my-SDL-or-introspection-schema"
```

#### Executing from NodeJS or browser environments:

Add a dependency on the `3.1.0-studio-graphql-4.0` version of `@aws-amplify/graphql-docs-generator` in your `package.json` file, install and build.
```
import { generate } from '@aws-amplify/graphql-docs-generator';

const generatedResult = generate(inputValue);

// Test logs to demonstrate the output
console.log(generatedResult.queries);
console.log(generatedResult.mutations);
console.log(generatedResult.subscriptions);
console.log(generatedResult.fragments);
```