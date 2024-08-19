The implementations of `amplify-codegen` plugin and the following code generators:

- `appsync-modelgen-plugin` - generates model files to be used with Amplify Datastore. Accessed via CLI command `amplify codegen models`
- `graphql-docs-generator` - generates GraphQL operations from the given GraphQL schema. Accessed via CLI command `amplify codegen statements` and `amplify-codegen`
- `graphql-types-generator` - generates type definitions in given target language for the types defined in the GraphQL schema. Accessed via CLI command `amplify codegen types` and `amplify-codegen`

are transferred to this repository from the [Amplify CLI repository](https://github.com/aws-amplify/amplify-cli/tree/master/packages).

In order to shield the existing customers from any complications as a result of this transfer, we provide the following Feature Flags that enable the customers to switch to the migrated package implementations at their own pace before the deprecation date:

1. **useAppsyncModelgenPlugin**: When set to `true`, the `appsync-modelgen-plugin` implementation in this repository will be used for models generation. When set to `false`, the `amplify-codegen-appsync-model-plugin` implementation from [CLI repo](https://github.com/aws-amplify/amplify-cli/tree/master/packages/amplify-codegen-appsync-model-plugin) will be used for models generation.

2. **useDocsGeneratorPlugin**: When set to `true`, the `graphql-docs-generator` implementation in this repository will be used to generate the GraphQL operations. When set to `false`, the `amplify-graphql-docs-generator` implementation from [CLI repo](https://github.com/aws-amplify/amplify-cli/tree/master/packages/amplify-graphql-docs-generator) will be used to generate the GraphQL operations.

3. **useTypesGeneratorPlugin**: When set to `true`, the `graphql-types-generator` implementation in this repository will be used to generate the language specific type definitions from GraphQL schema. When set to `false`, the `amplify-graphql-docs-generator` implementation from [CLI repo](https://github.com/aws-amplify/amplify-cli/tree/master/packages/amplify-graphql-types-generator) will be used to generate the type defintions.

The package implementations in this repository will be actively maintained going forward while the implementations in [Amplify CLI repository](https://github.com/aws-amplify/amplify-cli/tree/master/packages) will be deprecated on May 1st, 2021.
The package implementations in this repository will support all the APIs that are supported by their counterparts in the CLI repository.

These Feature Flags are set to `true` by default for new projects created using Amplify CLI and `false` for existing projects.
We recommend setting the above Feature Flags to `true` in your `cli.json` file to consume the package implementations from this repository and take advtange of bug fixes, enhancements etc being made to these generators.

Some examples of recent enhacements include, `cleanGeneratedModelsDirectory` and `retainCaseStyle` features that are only supported when the above Feature Flags are set to true.
Please refer to the individual package changelogs in this repository for a comprehensive list of changes.

TODO: add links to amplify CLI Feature Flag docs once they are live.
