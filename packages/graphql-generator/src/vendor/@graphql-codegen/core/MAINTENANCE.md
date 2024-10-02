
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

TBD - These instructions will be written as they are being followed with the next change.