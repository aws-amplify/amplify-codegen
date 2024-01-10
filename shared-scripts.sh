#!/bin/bash

# set exit on error to true
set -e

# The flags address the issue here: https://github.com/boto/botocore/issues/1716
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

# storeCache <local path> <cache location> <os type>
function storeCache {
  localPath="$1"
  alias="$2"
  environment="$3"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Writing cache folder $alias to $s3Path"
  # zip contents and upload to s3
  errorMessage="Something went wrong storing the cache folder $alias. Continuing anyway."
  # tar behaves differently on windows
  # Windows tar does not allow stdin/stdout Windows equivalent.
  # The archive needs to be written to a file first.
  # We don't also do this for Linux because:
  # 1. It is much slower.
  # 2. The linux version fails with `file changed as we read it`.
  # Branching the bash script is the easiest way around this
  if [[ $environment == "windows" ]]; then
    echo "Storing cache for Windows"
    if ! (cd $localPath && tar -czf cache.tar . && ls && aws s3 cp cache.tar $s3Path); then
      echo $errorMessage
    fi
  else
    echo "Storing cache for Linux"
    if ! (cd $localPath && tar cz . | aws s3 cp - $s3Path); then
      echo $errorMessage
    fi
  fi
  echo "Done writing cache folder $alias"
  cd $CODEBUILD_SRC_DIR
}

# loadCache <cache location> <local path> <os type>
function loadCache {
  alias="$1"
  localPath="$2"
  environment="$3"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Loading cache folder from $s3Path"
  # create directory if it doesn't exist yet
  mkdir -p $localPath
  # check if cache exists in s3
  if ! aws s3 ls $s3Path > /dev/null; then
      echo "Cache folder $alias not found."
      exit 0
  fi
  # load cache and unzip it
  errorMessage="Something went wrong fetching the cache folder $alias. Continuing anyway."
  if [[ $environment == "windows" ]]; then # tar behaves differently on windows
    echo "Loading cache for Windows"
    if ! (cd $localPath && aws s3 cp $s3Path - | tar xzkf -); then
      echo $errorMessage
    fi
  else
    echo "Loading cache for Linux"
    if ! (cd $localPath && aws s3 cp $s3Path - | tar xz); then
      echo $errorMessage
    fi
  fi
  echo "Done loading cache folder $alias"
  cd $CODEBUILD_SRC_DIR
}

function storeCacheForLinuxBuildJob {
  # upload [repo, .cache] to s3
  storeCache $CODEBUILD_SRC_DIR repo
  storeCache $HOME/.cache .cache
}

function storeCacheForWindowsBuildJob {
  storeCache $CODEBUILD_SRC_DIR repo-windows windows
  storeCache $HOME/AppData/Local/Yarn/Cache/v6 .cache-windows windows
}

function loadCacheFromLinuxBuildJob {
  # download [repo, .cache] from s3
  loadCache repo $CODEBUILD_SRC_DIR
  loadCache .cache $HOME/.cache
}


function loadCacheFromWindowsBuildJob {
  # download [repo, .cache] from s3
  loadCache repo-windows $CODEBUILD_SRC_DIR windows
  loadCache .cache-windows $HOME/AppData/Local/Yarn/Cache/v6 windows
}

function storeCacheFile {
    localFilePath="$1"
    alias="$2"
    s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
    echo "Writing cache file $alias to $s3Path"
    # upload file to s3
    if ! (aws s3 cp $localFilePath $s3Path); then
        echo "Something went wrong storing the cache file $alias."
    fi
    echo "Done writing cache file $alias"
    cd $CODEBUILD_SRC_DIR
}

function loadCacheFile {
    alias="$1"
    localFilePath="$2"
    s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
    echo "Loading cache file $alias from $s3Path"
    # check if cache file exists in s3
    if ! aws s3 ls $s3Path > /dev/null; then
        echo "Cache file $alias not found."
        exit 0
    fi
    # load cache file
    if ! (aws s3 cp $s3Path $localFilePath); then
        echo "Something went wrong fetching the cache file $alias. Continuing anyway."
    fi
    echo "Done loading cache file $alias"
    cd $CODEBUILD_SRC_DIR
}

function _setShell {
  echo "Setting Shell"
  yarn config set script-shell $(which bash)
}

function _buildLinux {
  _setShell
  echo "Linux Build"
  yarn run production-build
  storeCacheForLinuxBuildJob
}

function _buildWindows {
  echo "Linux Build"
  yarn run production-build
  storeCacheForWindowsBuildJob
}

function _testLinux {
  echo "Run Unit Test Linux"
  loadCacheFromLinuxBuildJob
  yarn test-ci
}

function _testWindows {
  echo "Run Unit Test Windows"
  loadCacheFromWindowsBuildJob
  yarn test-ci
}

function _verifyAPIExtract {
  echo "Verify API Extract"
  loadCacheFromLinuxBuildJob
  yarn verify-api-extract
}

function _verifyDependencyLicensesExtract {
  echo "Verify Dependency Licenses Extract"
  loadCacheFromLinuxBuildJob
  yarn verify-dependency-licenses-extract
}

function _lint {
  echo "Lint"
  loadCacheFromLinuxBuildJob
  chmod +x .codebuild/scripts/lint_pr.sh && ./.codebuild/scripts/lint_pr.sh
}

function _publishToLocalRegistry {
    echo "Publish To Local Registry"
    loadCacheFromLinuxBuildJob
    if [ -z "$BRANCH_NAME" ]; then
      if [ -z "$CODEBUILD_WEBHOOK_TRIGGER" ]; then
        export BRANCH_NAME="$(git symbolic-ref HEAD --short 2>/dev/null)"
        if [ "$BRANCH_NAME" = "" ] ; then
          BRANCH_NAME="$(git rev-parse HEAD | xargs git name-rev | cut -d' ' -f2 | sed 's/remotes\/origin\///g')";
        fi
      elif [[ "$CODEBUILD_WEBHOOK_TRIGGER" == "pr/"* ]]; then
        export BRANCH_NAME=${CODEBUILD_WEBHOOK_BASE_REF##*/}
      fi
    fi
    echo $BRANCH_NAME
    git checkout $BRANCH_NAME
  
    # Fetching git tags from upstream
    # For forked repo only
    # Can be removed when using team account
    echo "fetching tags"
    git fetch --tags https://github.com/aws-amplify/amplify-codegen

    source .codebuild/scripts/local_publish_helpers.sh
    startLocalRegistry "$(pwd)/.codebuild/scripts/verdaccio.yaml"
    setNpmRegistryUrlToLocal
    git config user.email not@used.com
    git config user.name "Doesnt Matter"
    setNpmTag
    if [ -z $NPM_TAG ]; then
      yarn publish-to-verdaccio
    else
      yarn lerna publish --exact --dist-tag=latest --preid=$NPM_TAG --conventional-commits --conventional-prerelease --no-verify-access --yes --no-commit-hooks --no-push --no-git-tag-version
    fi
    unsetNpmRegistryUrl
    # copy [verdaccio-cache] to s3
    storeCache $CODEBUILD_SRC_DIR/../verdaccio-cache verdaccio-cache
}

function _installCLIFromLocalRegistry {
    environment="$1"
    echo "Start verdaccio, install CLI"
    source .codebuild/scripts/local_publish_helpers.sh

    # absolute paths do not work with verdaccio on windows
    if [[ $environment == "windows" ]]; then
      echo "Starting local registry for Windows"
      startLocalRegistry .codebuild/scripts/verdaccio.yaml
    else
      echo "Starting local registry for Linux"
      startLocalRegistry "$(pwd)/.codebuild/scripts/verdaccio.yaml"
    fi
    setNpmRegistryUrlToLocal
    changeNpmGlobalPath
    npm install -g @aws-amplify/cli-internal
    echo "using Amplify CLI version: "$(amplify --version)
    npm list -g --depth=1 | grep -e '@aws-amplify/amplify-category-api' -e 'amplify-codegen'
    unsetNpmRegistryUrl
}

function _loadTestAccountCredentials {
    echo ASSUMING PARENT TEST ACCOUNT credentials
    session_id=$((1 + $RANDOM % 10000))
    # Use longer time for parent account role
    creds=$(aws sts assume-role --role-arn $TEST_ACCOUNT_ROLE --role-session-name testSession${session_id} --duration-seconds 3600)
    if [ -z $(echo $creds | jq -c -r '.AssumedRoleUser.Arn') ]; then
        echo "Unable to assume parent e2e account role."
        return
    fi
    echo "Using account credentials for $(echo $creds | jq -c -r '.AssumedRoleUser.Arn')"
    export AWS_ACCESS_KEY_ID=$(echo $creds | jq -c -r ".Credentials.AccessKeyId")
    export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -c -r ".Credentials.SecretAccessKey")
    export AWS_SESSION_TOKEN=$(echo $creds | jq -c -r ".Credentials.SessionToken")
}

function _setupE2ETestsLinux {
    echo "Setup E2E Tests Linux"
    loadCacheFromLinuxBuildJob
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache
    _installCLIFromLocalRegistry
    _loadTestAccountCredentials
    _setShell
}

function _setupE2ETestsWindows {
    echo "Setup E2E Tests Windows"
    loadCacheFromWindowsBuildJob
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache windows
    _installCLIFromLocalRegistry windows
    _loadTestAccountCredentials
    _setShell
}


function _runE2ETestsLinux {
    echo "RUN E2E Tests Linux"
    retry runE2eTest
}

function _runE2ETestsWindows {
    echo "RUN E2E Tests Windows"
    retry runE2eTest
}

function _scanArtifacts {
    if ! npx ts-node .codebuild/scripts/scan_artifacts.ts; then
        echo "Cleaning the repository"
        git clean -fdx
        exit 1
    fi
}

function _cleanupE2EResources {
  echo "Cleanup E2E resources"
  loadCacheFromLinuxBuildJob
  cd packages/amplify-codegen-e2e-tests
  echo "Running clean up script"
  build_batch_arn=$(aws codebuild batch-get-builds --ids $CODEBUILD_BUILD_ID | jq -r -c '.builds[0].buildBatchArn')
  echo "Cleanup resources for batch build $build_batch_arn"
  yarn clean-e2e-resources buildBatchArn $build_batch_arn
}

function _unassumeTestAccountCredentials {
    echo "Unassume Role"
    unset AWS_ACCESS_KEY_ID
    unset AWS_SECRET_ACCESS_KEY
    unset AWS_SESSION_TOKEN
}

# The following functions are forked from circleci local publish helper
# The e2e helper functions are moved for codebuild usage
function useChildAccountCredentials {
    if [ -z "$USE_PARENT_ACCOUNT" ]; then
        export AWS_PAGER=""
        parent_acct=$(aws sts get-caller-identity | jq -cr '.Account')
        child_accts=$(aws organizations list-accounts | jq -c "[.Accounts[].Id | select(. != \"$parent_acct\")]")
        org_size=$(echo $child_accts | jq 'length')
        pick_acct=$(echo $child_accts | jq -cr ".[$RANDOM % $org_size]")
        session_id=$((1 + $RANDOM % 10000))
        if [[ -z "$pick_acct" || -z "$session_id" ]]; then
          echo "Unable to find a child account. Falling back to parent AWS account"
          return
        fi
        creds=$(aws sts assume-role --role-arn arn:aws:iam::${pick_acct}:role/OrganizationAccountAccessRole --role-session-name testSession${session_id} --duration-seconds 3600)
        if [ -z $(echo $creds | jq -c -r '.AssumedRoleUser.Arn') ]; then
            echo "Unable to assume child account role. Falling back to parent AWS account"
            return
        fi
        export ORGANIZATION_SIZE=$org_size
        export CREDS=$creds
        echo "Using account credentials for $(echo $creds | jq -c -r '.AssumedRoleUser.Arn')"
        export AWS_ACCESS_KEY_ID=$(echo $creds | jq -c -r ".Credentials.AccessKeyId")
        export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -c -r ".Credentials.SecretAccessKey")
        export AWS_SESSION_TOKEN=$(echo $creds | jq -c -r ".Credentials.SessionToken")
    else
        echo "Using parent account credentials."
    fi
    echo "Region is set to use $CLI_REGION"
}

function retry {
    MAX_ATTEMPTS=2
    SLEEP_DURATION=5
    FIRST_RUN=true
    RUN_INDEX=0
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"
    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        rm -f $FAILED_TEST_REGEX_FILE
    fi
    until [ $RUN_INDEX -ge $MAX_ATTEMPTS ]
    do
        echo "Attempting $@ with max retries $MAX_ATTEMPTS"
        setAwsAccountCredentials
        RUN_INDEX="$RUN_INDEX" "$@" && break
        RUN_INDEX=$[$RUN_INDEX+1]
        FIRST_RUN=false
        echo "Attempt $RUN_INDEX completed."
        sleep $SLEEP_DURATION
    done
    if [ $RUN_INDEX -ge $MAX_ATTEMPTS ]; then
        echo "failed: ${@}" >&2
        exit 1
    fi

    resetAwsAccountCredentials
    TEST_SUITE=${TEST_SUITE:-"TestSuiteNotSet"}
    echo "Attempt $RUN_INDEX succeeded."
    exit 0 # don't fail the step if putting the metric fails
}

function resetAwsAccountCredentials {
    if [ -z "$AWS_ACCESS_KEY_ID_ORIG" ]; then
        echo "AWS Access Key environment variable is already set"
    else
        export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID_ORIG
    fi
    if [ -z "$AWS_SECRET_ACCESS_KEY_ORIG" ]; then
        echo "AWS Secret Access Key environment variable is already set"
    else
        export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY_ORIG
    fi
    if [ -z "$AWS_SESSION_TOKEN_ORIG" ]; then
        echo "AWS Session Token environment variable is already set"
    else
        export AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN_ORIG
    fi
}

function setAwsAccountCredentials {
    resetAwsAccountCredentials
    export AWS_ACCESS_KEY_ID_ORIG=$AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY_ORIG=$AWS_SECRET_ACCESS_KEY
    export AWS_SESSION_TOKEN_ORIG=$AWS_SESSION_TOKEN
    if [[ "$OSTYPE" == "msys" ]]; then
        # windows provided by circleci has this OSTYPE
        useChildAccountCredentials
    else
        echo "OSTYPE is $OSTYPE"
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip -o awscliv2.zip >/dev/null
        export PATH=$PATH:$(pwd)/aws/dist
        useChildAccountCredentials
    fi
}

function runE2eTest {
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"

    if [ -z "$FIRST_RUN" ] || [ "$FIRST_RUN" == "true" ]; then
        echo "using Amplify CLI version: "$(amplify --version)
        cd $(pwd)/packages/amplify-codegen-e2e-tests
    fi

    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        # read the content of failed tests
        failedTests=$(<$FAILED_TEST_REGEX_FILE)
        npm run e2e --maxWorkers=4 $TEST_SUITE -t "$failedTests"
    else
        npm run e2e --maxWorkers=4 $TEST_SUITE
    fi
}

function _deploy {
  _setShell
  echo "Deploy"
  echo "Authenticate with NPM"
  PUBLISH_TOKEN=$(echo "$NPM_PUBLISH_TOKEN" | jq -r '.token')
  echo "//registry.npmjs.org/:_authToken=$PUBLISH_TOKEN" > ~/.npmrc
  ./.codebuild/scripts/publish.sh
}
