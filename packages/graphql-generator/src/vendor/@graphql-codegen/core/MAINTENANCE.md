
This package is being forked for internal use as described in the [README](README.md). This file aims to capture the instructions on
how to update to any specific version of `@graphql-codegen/core` so that any needed updates can be performed as directly as possible.

### Step 1 - Replace all of the vendor files with the file from the target version of `@graphql-codegen/core`
- Pick a new target version: `export TARGET_CODEGEN_VERSION=2.6.8`
- Remove the prior version code: `rm ./packages/graphql-generator/src/vendor/@graphql-codegen/core/*.ts`
- Pull down the target version of the codegen package
  - `pushd /tmp`
  - `rm -rf graphql-code-generator`
  - `git clone https://github.com/dotansimha/graphql-code-generator.git`
  - `cd graphql-code-generator`
  - `git co @graphql-codegen/core@$TARGET_CODEGEN_VERSION`
- Copy the codegen core files that control the async behavior that needs to be updated to be sync
  - `popd`
  - `cp /tmp/graphql-code-generator/packages/graphql-codegen-core/src/* ./packages/graphql-generator/src/vendor/@graphql-codegen/core/`
- Update the versions of `@graphql-*/*` packages in `./packages/graphql-generator/package.json` to match the target
  - Check target versions dependency versions: `grep '@graphql-*/*' /tmp/graphql-code-generator/packages/graphql-codegen-core/package.json`
  - Against the versions in our repo: `grep '@graphql-*/*' ./packages/graphql-generator/package.json`
  - Update the repo version to match the target dependency versions
- For good measure, lets update the LICENSE file as well - best to catch any changes in our PR diff
  - `cp /tmp/graphql-code-generator/LICENSE ./packages/graphql-generator/src/vendor/@graphql-codegen/core/`
- Document the version in the VERSION
  - `echo $TARGET_CODEGEN_VERSION > ./packages/graphql-generator/src/vendor/@graphql-codegen/core/VERSION`

### Step 2 - Remove all Promise/async patterns from the copied code

For the code forked here most of the complexity of adapting `codegen` to be non-async is captured in type changes surfaced by `@aws-amplify/appsync-modelgen-plugin` as `SyncTypes`. If these base types change when we update the package, our derived types to support Sync execution may need to change as well

These are the steps needed to adapt the `graphql-codegen-core` code to run non-async and adhere to the adapted `SyncTypes`:
- Remove '.js' from all import statements
- Replace "async " => ""
- Replace "await " => ""
- Replace "Promise<X>" => "X"
- Replace "Promise.resolve(X)" => "X"
- Replace "Promise.all(X)" => "X"
- Change import of "createNoopProfiler" to "import { createNoopProfiler } from '../../../profiler'"
  - We have a sync NoopProfiler internal to this package which allows minimal profiler related changes to the vendor code
- Replace "options.profiler ?? createNoopProfiler()" => "createNoopProfiler()"
- Change import of "Types" to "import { SyncTypes as Types } from '@aws-amplify/appsync-modelgen-plugin'
- In the `executePlugin` function, replace "CodegenPlugin" with "Types.CodegenPlugin" and remove the unused import
- Review the remaining errors. In the first adaptation, the only remaining errors where `X | undefined is not assignable to parameter of type` where the original code doesn't adhere to strict types and the most expedient solution is to add a `!` to tell typescript that the optional value will be present.
- Review remaining typescript errors from compilerOption differences, which can either be ignored or fixed