#!/bin/bash

REPO_OWNER="aws-amplify"
REPO_NAME="amplify-codegen"

# Function to get the latest workflow run ID
get_latest_run_id() {
    latest_run_id=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs?event=workflow_dispatch&per_page=1" | \
        jq -r '.workflow_runs[0].id')
    echo "$latest_run_id"
}

# Function to get the status of a workflow run
get_run_status() {
    run_id="$1"
    run_status=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runs/$run_id" | \
        jq -r '.status')
    echo "$run_status"
}

# Function to trigger a workflow dispatch event to run the e2e test
trigger_workflow() {
    curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/build-swift-modelgen.yml/dispatches" \
        -d "{\"ref\":\"main\", \"inputs\":{\"MODELS_S3_URL\":\"${MODELS_S3_URL}\"}}"
}

main() {
    trigger_workflow
    sleep 10  # Wait to allow for the workflow to be triggered

    # Get the latest run ID and initial status
    latest_run_id=$(get_latest_run_id)
    echo "Latest run ID: $latest_run_id"
    latest_status=$(get_run_status "$latest_run_id")
    timeout=$((SECONDS + 600))  # 600 seconds = 10 minutes

    # Continuously check for status until completion
    while [[ "$latest_status" != "completed"  && "$SECONDS" -lt "$timeout" ]]; do
        echo "Test run status: $latest_status"
        sleep 10 # Wait before checking again
        latest_status=$(get_run_status "$latest_run_id")
    done

    # Check if the run completed within the specified duration
    if [[ "$latest_status" != "completed" ]]; then
        echo "The test run did not complete within the specified duration."
        exit 1
    fi

    # Check if the run failed and throw an error if it did
    if [[ "$latest_status" == "failure" ]]; then
        echo "The test run failed."
        exit 1
    else
        echo "The test run succeeded."
    fi
}

main
