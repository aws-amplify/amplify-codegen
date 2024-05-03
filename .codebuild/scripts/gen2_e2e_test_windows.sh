#!/bin/bash

# set exit on error to true
set -e

source ./shared-scripts.sh && _setupGen2E2ETestsWindows
codebuild-breakpoint
source ./shared-scripts.sh && _runGen2E2ETestsWindows
