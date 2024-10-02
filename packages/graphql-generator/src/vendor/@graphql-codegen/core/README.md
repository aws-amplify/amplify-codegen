This package code is forked from [this version](https://github.com/dotansimha/graphql-code-generator/tree/%40graphql-codegen/core%402.6.8)
of the `@graphql-codegen/core` library, which is [adapted to function without the async behavior](MAINTENANCE.md). This was done to allow 
codegen to be run during the CDK build process. Ideally this change would be made on [the public package](https://github.com/dotansimha/graphql-code-generator/issues/10149)
and consumed for our usecase.