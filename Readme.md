<a href="https://aws-amplify.github.io/" target="_blank">
    <img src="https://s3.amazonaws.com/aws-mobile-hub-images/aws-amplify-logo.png" alt="AWS Amplify" width="550" >
</a>

<p>
  <a href="https://discord.gg/jWVbPfC" target="_blank">
    <img src="https://img.shields.io/discord/308323056592486420?logo=discord"" alt="Discord Chat" />  
  </a>
  <a href="https://www.npmjs.com/package/appsync-modelgen-plugin">
    <img src="https://img.shields.io/npm/v/appsync-modelgen-plugin.svg" />
  </a>
  <a href="https://circleci.com/gh/aws-amplify/amplify-codegen">
    <img src="https://img.shields.io/circleci/project/github/aws-amplify/amplify-codegen/master.svg" alt="build:started">
  </a>
</p>

### Reporting Bugs/Feature Requests
[![Open Bugs](https://img.shields.io/github/issues/aws-amplify/amplify-codegen/bug?color=d73a4a&label=bugs)](https://github.com/aws-amplify/amplify-codegen/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
[![Feature Requests](https://img.shields.io/github/issues/aws-amplify/amplify-codegen/feature-request?color=ff9001&label=feature%20requests)](https://github.com/aws-amplify/amplify-codegen/issues?q=is%3Aissue+label%3Afeature-request+is%3Aopen)
[![Enhancements](https://img.shields.io/github/issues/aws-amplify/amplify-codegen/enhancement?color=4287f5&label=enhancement)](https://github.com/aws-amplify/amplify-codegen/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
[![Closed Issues](https://img.shields.io/github/issues-closed/aws-amplify/amplify-codegen?color=%2325CC00&label=issues%20closed)](https://github.com/aws-amplify/amplify-codegen/issues?q=is%3Aissue+is%3Aclosed+)

## Developing

This section should get you running with **Amplify Codegen**. You will need the latest version of [nodejs](https://nodejs.org/en/) on your system and developing locally also requires `yarn` workspaces. You can install it [here](https://classic.yarnpkg.com/en/docs/install#mac-stable).

Start by, [Forking](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) the main branch of [amplify-codegen](https://github.com/aws-amplify/amplify-codegen).

```
$ git clone git@github.com:[username]/amplify-codegen.git
$ cd amplify-codegen

$ yarn run setup-dev
```
Before pushing code or sending a pull request, do the following:

- At the command line, run `npm run lint` at the top-level directory. This invokes lerna to check for lint errors in all of our packages.
- You can use `eslint` to fix some of the lint errors. To use it, go to the package that has errors and run `lint-fix`
- If there are any remaining lint errors, resolve them manually. Linting your code is a best practice that ensures good code quality so it's important that you don't skip this step.

## Contributing

See the contribution guideline. https://github.com/aws-amplify/amplify-codegen/blob/master/CONTRIBUTING.md
