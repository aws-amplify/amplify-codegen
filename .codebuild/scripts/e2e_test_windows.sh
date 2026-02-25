#!/bin/bash

# set exit on error to true
set -e

# Ensure HOME is set for Windows environments
if [ -z "$HOME" ]; then
    export HOME="${USERPROFILE:-$CODEBUILD_SRC_DIR/..}"
fi

source ./shared-scripts.sh && _setupE2ETestsWindows
codebuild-breakpoint
source ./shared-scripts.sh && _runE2ETestsWindows
