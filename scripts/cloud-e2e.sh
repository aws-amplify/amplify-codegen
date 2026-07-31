#!/bin/bash -e

# Triggers the amplify-codegen e2e test suite on the current branch.
#
# Usage:
#   ./scripts/cloud-e2e.sh              # Run e2e on current branch
#   ./scripts/cloud-e2e.sh pr/1035      # Run e2e on a specific PR
#
# Prerequisites:
#   - scripts/.env must exist with E2E_ACCOUNT_PROD set (see scripts/sample.env)
#   - mwinit credentials must be active

scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")
source "$scriptDir/.env"

if [ -z "$E2E_ACCOUNT_PROD" ]; then
  echo "❌ E2E_ACCOUNT_PROD is not set. Please configure scripts/.env (see scripts/sample.env)"
  exit 1
fi

REGION=us-east-1
E2E_ROLE_NAME=CodebuildDeveloper
E2E_PROFILE_NAME=AmplifyAPIE2EProd
E2E_PROJECT_NAME=amplify-codegen-e2e-workflow

# Determine source version
if [ -n "$1" ]; then
  SOURCE_VERSION="$1"
else
  SOURCE_VERSION=$(git branch --show-current)
fi

echo "🚀 Triggering E2E tests"
echo "   Project: $E2E_PROJECT_NAME"
echo "   Source:  $SOURCE_VERSION"
echo ""

# Authenticate
echo "🔐 Authenticating..."
ada cred update --profile="$E2E_PROFILE_NAME" --account="$E2E_ACCOUNT_PROD" --role="$E2E_ROLE_NAME" --provider=isengard --once
aws configure set region $REGION --profile "$E2E_PROFILE_NAME"

# Trigger the batch build
RESULT=$(aws codebuild start-build-batch \
  --profile="$E2E_PROFILE_NAME" \
  --region "$REGION" \
  --project-name "$E2E_PROJECT_NAME" \
  --source-version="$SOURCE_VERSION" \
  --environment-variables-override name=BRANCH_NAME,value="$SOURCE_VERSION",type=PLAINTEXT \
  --query 'buildBatch.id' --output text)

echo ""
echo "✅ Build batch triggered!"
echo "   Batch ID: $RESULT"
echo ""
echo "📋 Monitor with:"
echo "   yarn e2e-monitor $RESULT"
echo ""
echo "🔗 Console URL:"
echo "   https://$REGION.console.aws.amazon.com/codesuite/codebuild/$E2E_ACCOUNT_PROD/projects/$E2E_PROJECT_NAME/batch/$RESULT?region=$REGION"
