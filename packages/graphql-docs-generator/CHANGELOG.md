# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.2.1](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.2.0...@aws-amplify/graphql-docs-generator@4.2.1) (2023-12-11)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

# [4.2.0](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.1.0...@aws-amplify/graphql-docs-generator@4.2.0) (2023-09-12)

### Features

- graphql generator ([#690](https://github.com/aws-amplify/amplify-codegen/issues/690)) ([dbe12ab](https://github.com/aws-amplify/amplify-codegen/commit/dbe12abbbcd307bec1c15f95251f023d0f0fbf10))
- graphql-generator package ([#677](https://github.com/aws-amplify/amplify-codegen/issues/677)) ([6348627](https://github.com/aws-amplify/amplify-codegen/commit/634862793cb5aebb284f27a70f0ef07d6fd85561)), closes [#669](https://github.com/aws-amplify/amplify-codegen/issues/669) [#670](https://github.com/aws-amplify/amplify-codegen/issues/670) [#671](https://github.com/aws-amplify/amplify-codegen/issues/671) [#676](https://github.com/aws-amplify/amplify-codegen/issues/676) [#680](https://github.com/aws-amplify/amplify-codegen/issues/680)

### Reverts

- Revert "feat: graphql-generator package (#677)" (#687) ([d7a84d6](https://github.com/aws-amplify/amplify-codegen/commit/d7a84d62b5a1e686d4e5e5be61e12fb410378685)), closes [#677](https://github.com/aws-amplify/amplify-codegen/issues/677) [#687](https://github.com/aws-amplify/amplify-codegen/issues/687)

# [4.1.0](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.0.5...@aws-amplify/graphql-docs-generator@4.1.0) (2023-08-25)

### Features

- add type branding to graphql in TS outputs ([#623](https://github.com/aws-amplify/amplify-codegen/issues/623)) ([b517ec3](https://github.com/aws-amplify/amplify-codegen/commit/b517ec36f822ccc015032b60b5138ddc024be862))

## 4.0.5 (2023-07-25)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## 4.0.4 (2023-07-24)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## [4.0.3](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.0.2...@aws-amplify/graphql-docs-generator@4.0.3) (2023-06-29)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## [4.0.2](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.0.1...@aws-amplify/graphql-docs-generator@4.0.2) (2023-05-11)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## [4.0.1](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@4.0.0...@aws-amplify/graphql-docs-generator@4.0.1) (2023-05-09)

### Bug Fixes

- codegen downgrade to version 3 ([#589](https://github.com/aws-amplify/amplify-codegen/issues/589)) ([c1f9f36](https://github.com/aws-amplify/amplify-codegen/commit/c1f9f36979691dfba3dd3db1c4a516aeeb29c41e)), closes [#575](https://github.com/aws-amplify/amplify-codegen/issues/575)

# [4.0.0](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@3.0.3...@aws-amplify/graphql-docs-generator@4.0.0) (2023-05-04)

### Bug Fixes

- consume updated docgen API ([4b87292](https://github.com/aws-amplify/amplify-codegen/commit/4b87292963a223eaed569820ad1822ff94b99708))
- handle generate without options ([0d73f47](https://github.com/aws-amplify/amplify-codegen/commit/0d73f47145a16899b3803cc54ab472f68a71d334))
- move prettier dependecy to codegen plugin ([f07c851](https://github.com/aws-amplify/amplify-codegen/commit/f07c85123d15b5e8aca31045421fc04b65bc9d44))
- update API name and snapshots ([a117447](https://github.com/aws-amplify/amplify-codegen/commit/a11744717e9ccc0d7cac9020cdb4163ec4406081))
- update docs generator tests ([dbc0988](https://github.com/aws-amplify/amplify-codegen/commit/dbc0988f1035a6ac2b178e532ce3c1cb60381bbb))

### Features

- add \_\_typename to selection set ([#575](https://github.com/aws-amplify/amplify-codegen/issues/575)) ([066615e](https://github.com/aws-amplify/amplify-codegen/commit/066615e97c54e9f62b599991e058fc0d70aa22b4))
- **graphql-docs-generator:** remove dependencies on fs and path ([8fe6a4a](https://github.com/aws-amplify/amplify-codegen/commit/8fe6a4a5cf3bc4fdacdd11ad2fdac34adeda1c29))
- major version bump ([5b62f74](https://github.com/aws-amplify/amplify-codegen/commit/5b62f74fd53762cd85f724a252915607d3224f31))
- use brower compatible formatter ([228dae9](https://github.com/aws-amplify/amplify-codegen/commit/228dae9d1e94dcdbfe9720808a6abaa14e2c53e3))

### BREAKING CHANGES

- do a major version bump
- typename introspection with \_\_typename meta field enabled by default

## [3.0.3](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@3.0.2...@aws-amplify/graphql-docs-generator@3.0.3) (2023-01-24)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## [3.0.2](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@3.0.0...@aws-amplify/graphql-docs-generator@3.0.2) (2022-07-19)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

## [3.0.1](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@3.0.0...@aws-amplify/graphql-docs-generator@3.0.1) (2022-07-05)

**Note:** Version bump only for package @aws-amplify/graphql-docs-generator

# [3.0.0](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.4.2...@aws-amplify/graphql-docs-generator@3.0.0) (2022-04-25)

### chore

- mv bump associated with revert to caret-versioning in CLI ([#412](https://github.com/aws-amplify/amplify-codegen/issues/412)) ([8f00f73](https://github.com/aws-amplify/amplify-codegen/commit/8f00f73a561aebea18009104e95096cc626e7a65))

### BREAKING CHANGES

- no-op to bump major-version

## [2.4.2](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.4.1...@aws-amplify/graphql-docs-generator@2.4.2) (2021-11-09)

### Bug Fixes

- **graphql:** allow aws_lambda directive ([03ef563](https://github.com/aws-amplify/amplify-codegen/commit/03ef5637488e9514116e83f691656fddae7628b2))

## [2.4.1](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.4.0...@aws-amplify/graphql-docs-generator@2.4.1) (2021-11-03)

### Bug Fixes

- **graphql:** aggregate-code-fix ([4001257](https://github.com/aws-amplify/amplify-codegen/commit/40012575167a8fbdedff08fc3d48e47541b39cdd))

# [2.4.0](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.3.4...@aws-amplify/graphql-docs-generator@2.4.0) (2021-10-27)

### Features

- generate searchable aggregateItems 2 additional levels ([#268](https://github.com/aws-amplify/amplify-codegen/issues/268)) ([a54db9f](https://github.com/aws-amplify/amplify-codegen/commit/a54db9f6a15e91e16c004bf142d504d2780597ad))

## [2.3.4](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.3.3...@aws-amplify/graphql-docs-generator@2.3.4) (2021-05-25)

### Bug Fixes

- **graphql-docs-generator:** change handler dependency version ([#164](https://github.com/aws-amplify/amplify-codegen/issues/164)) ([f7de414](https://github.com/aws-amplify/amplify-codegen/commit/f7de41409aa610c1b013830e977c12ef33711ec5))

## [2.3.3](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.3.2...@aws-amplify/graphql-docs-generator@2.3.3) (2021-03-11)

### Bug Fixes

- **docsgen:** update args in cli.ts ([e8a0054](https://github.com/aws-amplify/amplify-codegen/commit/e8a00540bad13e0e359993da2b556dab774f5a95))
- **docsgen:** update to use FeatureFlag retainCaseStyle ([5b100f4](https://github.com/aws-amplify/amplify-codegen/commit/5b100f406e245388fe2d219ea809cbaa8b3c4c7c))

## [2.3.2](https://github.com/aws-amplify/amplify-codegen/compare/@aws-amplify/graphql-docs-generator@2.3.0...@aws-amplify/graphql-docs-generator@2.3.2) (2021-02-05)

### Bug Fixes

- **patch-release:** override previous patch release ([f2fe6e7](https://github.com/aws-amplify/amplify-codegen/commit/f2fe6e7bc3afa9a5fc634292564b9a97bf6bbc04))

# 2.3.0 (2021-01-22)

### Bug Fixes

- **release-docs-generator:** set package access to public ([55bb623](https://github.com/aws-amplify/amplify-codegen/commit/55bb62374c21a36d8e07803763504e338e7cc82f))

### Features

- **docs-generator-migration:** rename package to @aws-amplify/graphql-docs-generator ([9b9c7f3](https://github.com/aws-amplify/amplify-codegen/commit/9b9c7f3b8a717060130ce3450a2ea54bcb1948cb))

## [2.2.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.16...amplify-graphql-docs-generator@2.2.1) (2020-11-22)

**Note:** Version bump only for package amplify-graphql-docs-generator

# [2.2.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@2.2.0) (2020-11-22)

### Bug Fixes

- append eslint-disable to template ([#3707](https://github.com/aws-amplify/amplify-cli/issues/3707)) ([12f8797](https://github.com/aws-amplify/amplify-cli/commit/12f8797701f63111f525c809566f1471873c424f)), closes [#3706](https://github.com/aws-amplify/amplify-cli/issues/3706)
- build break, chore: typescript, lerna update ([#2640](https://github.com/aws-amplify/amplify-cli/issues/2640)) ([29fae36](https://github.com/aws-amplify/amplify-cli/commit/29fae366f4cab054feefa58c7dc733002d19570c))
- e2e tests, tsconfigs, [@deprecated](https://github.com/deprecated) directive for codegen: ([#3338](https://github.com/aws-amplify/amplify-cli/issues/3338)) ([2ed7715](https://github.com/aws-amplify/amplify-cli/commit/2ed77151dd6367ac9547f78fe600e7913a3d37b2))
- export Typescript definitions and fix resulting type errors ([#2452](https://github.com/aws-amplify/amplify-cli/issues/2452)) ([7de3845](https://github.com/aws-amplify/amplify-cli/commit/7de384594d3b9cbf22cdaa85107fc8df26c141ec)), closes [#2451](https://github.com/aws-amplify/amplify-cli/issues/2451)
- upgrade to node10 as min version for CLI ([#3128](https://github.com/aws-amplify/amplify-cli/issues/3128)) ([a0b18e0](https://github.com/aws-amplify/amplify-cli/commit/a0b18e0187a26b4ab0e6e986b0277f347e829444))

### Features

- add support for multiauth in mock server ([#2109](https://github.com/aws-amplify/amplify-cli/issues/2109)) ([fe8ee8c](https://github.com/aws-amplify/amplify-cli/commit/fe8ee8cff355a826fa9ccddcf0fad8a200a081af))
- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c1927da10f8c54f38a523021187361131c))
- mock support for API, function and storage ([#1893](https://github.com/aws-amplify/amplify-cli/issues/1893)) ([372e534](https://github.com/aws-amplify/amplify-cli/commit/372e5346ee1f27a2e9bee25fbbdcb19417f5230f))

## [2.1.16](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.15...amplify-graphql-docs-generator@2.1.16) (2020-08-06)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.15](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.13...amplify-graphql-docs-generator@2.1.15) (2020-07-29)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.14](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.13...amplify-graphql-docs-generator@2.1.14) (2020-07-23)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.13](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.12...amplify-graphql-docs-generator@2.1.13) (2020-04-23)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.12](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.11...amplify-graphql-docs-generator@2.1.12) (2020-03-22)

### Bug Fixes

- append eslint-disable to template ([#3707](https://github.com/aws-amplify/amplify-cli/issues/3707)) ([12f8797](https://github.com/aws-amplify/amplify-cli/commit/12f8797701f63111f525c809566f1471873c424f)), closes [#3706](https://github.com/aws-amplify/amplify-cli/issues/3706)

## [2.1.11](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.10...amplify-graphql-docs-generator@2.1.11) (2020-02-13)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.10](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.9...amplify-graphql-docs-generator@2.1.10) (2020-02-07)

### Bug Fixes

- e2e tests, tsconfigs, [@deprecated](https://github.com/deprecated) directive for codegen: ([#3338](https://github.com/aws-amplify/amplify-cli/issues/3338)) ([2ed7715](https://github.com/aws-amplify/amplify-cli/commit/2ed77151dd6367ac9547f78fe600e7913a3d37b2))

## [2.1.9](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@2.1.8...amplify-graphql-docs-generator@2.1.9) (2020-01-24)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.8](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.8) (2020-01-23)

### Bug Fixes

- upgrade to node10 as min version for CLI ([#3128](https://github.com/aws-amplify/amplify-cli/issues/3128)) ([a0b18e0](https://github.com/aws-amplify/amplify-cli/commit/a0b18e0187a26b4ab0e6e986b0277f347e829444))

## [2.1.7](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.7) (2020-01-09)

### Bug Fixes

- upgrade to node10 as min version for CLI ([#3128](https://github.com/aws-amplify/amplify-cli/issues/3128)) ([a0b18e0](https://github.com/aws-amplify/amplify-cli/commit/a0b18e0187a26b4ab0e6e986b0277f347e829444))

## [2.1.6](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.6) (2019-12-31)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.5](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.5) (2019-12-28)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.4](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.4) (2019-12-26)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.3](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.3) (2019-12-25)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.2](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.2) (2019-12-20)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.1.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.1.1) (2019-12-10)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.0.5](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.0.5) (2019-12-03)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.0.4](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.0.4) (2019-12-01)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.0.3](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.0.3) (2019-11-27)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [2.0.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.28.0...amplify-graphql-docs-generator@2.0.1) (2019-11-27)

**Note:** Version bump only for package amplify-graphql-docs-generator

# [1.10.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.10.0) (2019-08-30)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))
- mock support for API, function and storage ([#1893](https://github.com/aws-amplify/amplify-cli/issues/1893)) ([372e534](https://github.com/aws-amplify/amplify-cli/commit/372e534))

# [1.9.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.9.0) (2019-08-28)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))
- mock support for API, function and storage ([#1893](https://github.com/aws-amplify/amplify-cli/issues/1893)) ([372e534](https://github.com/aws-amplify/amplify-cli/commit/372e534))

# [1.8.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.8.0) (2019-08-13)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))
- mock support for API, function and storage ([#1893](https://github.com/aws-amplify/amplify-cli/issues/1893)) ([372e534](https://github.com/aws-amplify/amplify-cli/commit/372e534))

# [1.7.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.7.0) (2019-08-07)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))
- mock support for API, function and storage ([#1893](https://github.com/aws-amplify/amplify-cli/issues/1893)) ([372e534](https://github.com/aws-amplify/amplify-cli/commit/372e534))

# [1.6.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.6.0) (2019-08-02)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))

# [1.5.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.3...amplify-graphql-docs-generator@1.5.0) (2019-07-31)

### Features

- adding amplify cli predictions category ([#1936](https://github.com/aws-amplify/amplify-cli/issues/1936)) ([b7b7c2c](https://github.com/aws-amplify/amplify-cli/commit/b7b7c2c))

## [1.4.3](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.2...amplify-graphql-docs-generator@1.4.3) (2019-06-12)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.4.2](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.4.1...amplify-graphql-docs-generator@1.4.2) (2019-06-06)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.4.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.3.1...amplify-graphql-docs-generator@1.4.1) (2019-04-09)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.3.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.8...amplify-graphql-docs-generator@1.3.1) (2019-04-03)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.0.8](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.7...amplify-graphql-docs-generator@1.0.8) (2019-03-05)

### Bug Fixes

- **amplify-graphql-docs-generator:** render enums like scalar fields ([4e4de94](https://github.com/aws-amplify/amplify-cli/commit/4e4de94)), closes [#623](https://github.com/aws-amplify/amplify-cli/issues/623)

## [1.0.7](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.6...amplify-graphql-docs-generator@1.0.7) (2019-02-20)

### Bug Fixes

- **amplify-graphql-docs-generator:** update prettier version ([#901](https://github.com/aws-amplify/amplify-cli/issues/901)) ([da2632d](https://github.com/aws-amplify/amplify-cli/commit/da2632d))

## [1.0.6](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.5...amplify-graphql-docs-generator@1.0.6) (2019-02-12)

### Bug Fixes

- cloudform/type versions ([ec6f99f](https://github.com/aws-amplify/amplify-cli/commit/ec6f99f))

## [1.0.5](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.3-beta.0...amplify-graphql-docs-generator@1.0.5) (2019-02-11)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.0.3](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.3-beta.0...amplify-graphql-docs-generator@1.0.3) (2019-02-11)

**Note:** Version bump only for package amplify-graphql-docs-generator

## [1.0.3-beta.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@1.0.2...amplify-graphql-docs-generator@1.0.3-beta.0) (2019-02-11)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.2.1-multienv.2"></a>

## [0.2.1-multienv.2](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.2.1-multienv.1...amplify-graphql-docs-generator@0.2.1-multienv.2) (2019-01-22)

### Bug Fixes

- **amplify-graphql-docs-generator:** change prettier parser to babel ([609f498](https://github.com/aws-amplify/amplify-cli/commit/609f498))

<a name="0.2.1-multienv.1"></a>

## [0.2.1-multienv.1](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.2.1-multienv.0...amplify-graphql-docs-generator@0.2.1-multienv.1) (2018-12-10)

### Bug Fixes

- **amplify-graphql-docs-generator:** fix overfetching of lists ([#571](https://github.com/aws-amplify/amplify-cli/issues/571)) ([82017d9](https://github.com/aws-amplify/amplify-cli/commit/82017d9))

<a name="0.2.1-multienv.0"></a>

## [0.2.1-multienv.0](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.33...amplify-graphql-docs-generator@0.2.1-multienv.0) (2018-11-21)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.33"></a>

## [0.1.33](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.33-beta.0...amplify-graphql-docs-generator@0.1.33) (2018-11-09)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.33-beta.0"></a>

## 0.1.33-beta.0 (2018-11-09)

### Bug Fixes

- **amplify-graphql-docs-generator:** support list types in input ([#336](https://github.com/aws-amplify/amplify-cli/issues/336)) ([bd515e6](https://github.com/aws-amplify/amplify-cli/commit/bd515e6)), closes [#295](https://github.com/aws-amplify/amplify-cli/issues/295)
- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)

### Features

- **amplify-codegen:** add angular codegen support ([7dd7259](https://github.com/aws-amplify/amplify-cli/commit/7dd7259))

<a name="0.1.32"></a>

## [0.1.32](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.32-beta.0...amplify-graphql-docs-generator@0.1.32) (2018-11-05)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.32-beta.0"></a>

## 0.1.32-beta.0 (2018-11-05)

### Bug Fixes

- **amplify-graphql-docs-generator:** support list types in input ([#336](https://github.com/aws-amplify/amplify-cli/issues/336)) ([bd515e6](https://github.com/aws-amplify/amplify-cli/commit/bd515e6)), closes [#295](https://github.com/aws-amplify/amplify-cli/issues/295)
- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)

<a name="0.1.31"></a>

## 0.1.31 (2018-11-02)

### Bug Fixes

- **amplify-graphql-docs-generator:** support list types in input ([#336](https://github.com/aws-amplify/amplify-cli/issues/336)) ([bd515e6](https://github.com/aws-amplify/amplify-cli/commit/bd515e6)), closes [#295](https://github.com/aws-amplify/amplify-cli/issues/295)
- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)

<a name="0.1.30"></a>

## [0.1.30](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.30-beta.0...amplify-graphql-docs-generator@0.1.30) (2018-11-02)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.30-beta.0"></a>

## 0.1.30-beta.0 (2018-11-02)

### Bug Fixes

- **amplify-graphql-docs-generator:** support list types in input ([#336](https://github.com/aws-amplify/amplify-cli/issues/336)) ([bd515e6](https://github.com/aws-amplify/amplify-cli/commit/bd515e6)), closes [#295](https://github.com/aws-amplify/amplify-cli/issues/295)
- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)

<a name="0.1.29"></a>

## [0.1.29](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.29-beta.0...amplify-graphql-docs-generator@0.1.29) (2018-10-23)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.29-beta.0"></a>

## 0.1.29-beta.0 (2018-10-23)

### Bug Fixes

- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)

<a name="0.1.28"></a>

## [0.1.28](https://github.com/aws-amplify/amplify-cli/compare/amplify-graphql-docs-generator@0.1.28-beta.0...amplify-graphql-docs-generator@0.1.28) (2018-10-18)

**Note:** Version bump only for package amplify-graphql-docs-generator

<a name="0.1.28-beta.0"></a>

## 0.1.28-beta.0 (2018-10-12)

### Bug Fixes

- **amplify-graphql-docs-generator:** Support scalar returns in statements ([#267](https://github.com/aws-amplify/amplify-cli/issues/267)) ([ec4cf55](https://github.com/aws-amplify/amplify-cli/commit/ec4cf55)), closes [#264](https://github.com/aws-amplify/amplify-cli/issues/264)
