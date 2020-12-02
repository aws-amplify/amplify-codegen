
# Amplify Codegen CI/CD CDK App

This CDK app is contains the stacks that manage the AWS components responsible for CI/CD workflows for amplify-codegen repository.

## Stacks

**DeployBranchStack:**
Contains the resources necessary to run the build, test and deploy operations for a branch.\
Currently, *master* and *release* branches are configured for deployment.\
This stack sets up a codebuild project with appropriate webhooks for each of the deployment branches. The workflow for each of these branches can be individually configured
from the `<deployment_branch_name>-branch-buildspec.yml` files in `codebuild_specs` directory.

**CommonBranchStack:**
Contains the resources necessary to run the build and test operations for any branch other than the deployment branches.\
This stack sets up a cdebuild project with appropriate webhooks common to all branches other than the deployment branches.\
The workflow can be found at `codebuild_specs/common-branch-buildspec.yml`.

## Setup

### CDK
Ensure that you have the CDK installed, if you haven't yet.
```console
npm install -g aws-cdk
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

### AWS configuration
In order to deploy the CI/CD architecture, you should have the appropriate AWS credentials set in your environment.
```console
export AWS_ACCESS_KEY_ID=<value>
export AWS_SECRET_ACCESS_KEY=<value>
export AWS_SESSION_TOKEN=<value> (if you're using temporary credentials, which is recommended)
```
In addition, you should set the region to which this architecture would be deployed.
```console
export AWS_DEFAULT_REGION=<value>
```

### Connecting AWS Codebuild with Github
Please follow the instructions **[here](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-access-tokens.html#sample-access-tokens-cli)** to connect your authenticate `AWS Codebuild` service to connect to your Github account.
It is recommended to use `AWS CLI` to import the source credentials with appropriate permissions.

## Operations

### Deploying the stacks
Once you have the above setup, you need to make sure `AWS Codebuild` is connected to your Github account.

Once the `AWS Codebuild` service is connected to your github account, from the root of the CDK app (`amplify-codegen/amplify-codegen-ci-support/src/ci_cd_pipeline`), you can run:
```console
cdk deploy --all -c github_owner=<your_github_username>
```
This will create the necessary `codebuild` projects for CI/CD workflows of `amplify-codegen`.
