# Contributing to Amplify Codegen

Thank you for your interest in contributing to our project! 💛

Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community. Please read through these guidelines carefully before submitting a PR or issue and let us know if it's not up-to-date (or even better, submit a PR with your proposed corrections 😉).

## Getting Started

Our work is done directly on Github and PR's are sent to the GitHub repo by core team members and contributors. Everyone undergoes the same review process to get their changes into the repo.

This section should get you running with **Amplify Codegen**.

### Local Development

#### Environment Setup

1. You will need the latest version of [nodejs](https://nodejs.org/en/) on your system and developing locally also requires `yarn` workspaces. You can install it [here](https://classic.yarnpkg.com/en/docs/install#mac-stable).

1. Start by [Forking](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) the main branch of [amplify-codegen](https://github.com/aws-amplify/amplify-codegen).

```sh
$ git clone git@github.com:[username]/amplify-codegen.git
```

> NOTE: Make sure to always [sync your fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork) with _main_ branch of amplify-codegen

1. Move into your project folder

```sh
$ cd amplify-codegen
```

#### Building and Running Tests

1. To build local packages and verify your change is valid and doesn't break the build, you can run :

   ```sh
   yarn # Install all dependencies for the workspace
   yarn build # Build all packages in the repo
   yarn test # Run tests for all packages in the repo
   ```

1. Note: once you've run an initial `yarn` unless you're changing dependencies in a package, re-running should not be necessary.
1. After an initial build, if you're testing changes to a single package, you can run `yarn build` and `yarn test` specifically from that directory (e.g. `/packages/appsync-modelgen-plugin`) in order to speed up your iteration cycle.

#### Building the CLI Locally for functional testing

1. Run `setup-dev` script to installs dependencies and perform initial configuration. This command will also link a `amplify-dev` binary for your local testing.

```sh
$ yarn setup-dev
```

> NOTE: The `amplify-dev` binary is built based on the latest amplify cli from npm registry and your local codegen packages. All your local changes from codegen can be reflected (typescript files need to be build by `tsc`). In addition, if you are a developer of cli repo, you can run the same command to override the `amplify-dev` binary.

1. Ensure `amplify-dev` exists on your path.

```sh
$ yarn global bin # retrieve yarn path
```

Update your `$PATH` to include this directory.

### Architecture of the codebase

Amplify Codegen is a monorepo built with [Yarn Workspaces](https://yarnpkg.com/features/workspaces) and [Lerna](https://github.com/lerna/lerna). All packages live within the `packages/` directory in the root. Each category inside packages has its own `src/` and `package.json`.

### Steps towards contribution

- Make changes to required file.
- Write unit tests
- Run `yarn build` to compile your changes
- [Run test suite](#tests)
- Test in sample app using [amplify-dev](#tests)
- Submit a PR

## Bugs

Bug reports and feature suggestions are always welcome. Good bug reports are extremely helpful, so thanks in advance!

When filing a bug, please try to be as detailed as possible. In addition to the bug report form information, details like these are incredibly useful:

- A reproducible test case or series of steps
- The date/commit/version(s) of the code you're running
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

Guidelines for bug reports:

- Check to see if a [duplicate or closed issue](https://github.com/aws-amplify/amplify-codegen/issues?q=is%3Aissue+) already exists!
- Provide a short and descriptive issue title
- Remove any sensitive data from your examples or snippets
- Format any code snippets using [Markdown](https://docs.github.com/en/github/writing-on-github/creating-and-highlighting-code-blocks) syntax
- If you're not using the latest version of the CLI, see if the issue still persists after upgrading - this helps to isolate regressions!

## Pull Requests

Pull requests are welcome!

You should open an issue to discuss your pull request, unless it's a trivial change. It's best to ensure that your proposed change would be accepted so that you don't waste your own time. If you would like to implement support for a significant feature that is not yet available, please talk to us beforehand to avoid any duplication of effort.

Pull requests should generally be opened against **main**.

Don't include any build files i.e. `dist/`, `lib/`. These will be built upon publish to npm and when a release is created on GitHub.

Before submitting PR make sure to run `yarn` on the root of monorepo to ensure that commit lint and husky are installed.

Make sure you follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0-beta.2/) commit message structure. You can automatically generate conventional commit message by running `yarn commit` in the root of the amplify mono repo. This will run through series of question shown below

```
? Select the type of change that you're committing: <type of commit (if its a feature, bug fix etc.,>
? What is the scope of this change (e.g. component or file name)? <package name if change is only in one package>
? Write a short, imperative tense description of the change: <short description with length less than 72 char>
? Provide a longer description of the change: (press enter to skip) <long description>
? Are there any breaking changes? Y/N
? Does this change affect any open issues? Y/N
? Add issue references (e.g. "fix #123", "re #123".): <issue number if exists>

```

## Tests

Please ensure that your change still passes unit tests, and ideally integration/UI tests. It's OK if you're still working on tests at the time that you submit, but be prepared to be asked about them. Wherever possible, pull requests should contain tests as appropriate. Bugfixes should contain tests that exercise the corrected behavior (i.e., the test should fail without the bugfix and pass with it), and new features should be accompanied by tests exercising the feature.

To run the test suite:

```sh
# Unit tests
$ yarn test

# Tests in CI environment
$ yarn test-ci
```

To test in a sample application with `amplify-dev`:

```sh
$ cd <your-test-frontend-project>
$ amplify-dev init
$ amplify-dev codegen <subcommand>
```

To update snapshots:

```sh
$ npx jest -u
```

## Code Style

Generally, match the style of the surrounding code. Please ensure your changes don't wildly deviate from those rules. You can run `yarn lint-fix` to identify and automatically fix most style issues.

## Finding Contributions

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any [`help-wanted`](https://github.com/aws-amplify/amplify-codegen/labels/help-wanted) or [`good first issue`](https://github.com/aws-amplify/amplify-codegen/labels/good%20first%20issue) is a great place to start.

You could also contribute by reporting bugs, reproduction of bugs with sample code, documentation and test improvements.

## Community

Join the [Discord Server](https://discord.com/invite/amplify). If it's your first time contributing, checkout the `#first-time-contributor` channel.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security Issue Reporting

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## Licensing

AWS Amplify Codegen is [Apache 2.0](LICENSE)-licensed. Contributions you submit will be released under that license.

We may ask you to sign a [Contributor License Agreement (CLA)](http://en.wikipedia.org/wiki/Contributor_License_Agreement) for larger changes.
