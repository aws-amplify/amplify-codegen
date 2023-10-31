#!/bin/bash

# set exit on error to true
set -e

source ./shared-scripts.sh && _setupE2ETestsWindows
codebuild-breakpoint
source ./shared-scripts.sh && _runE2ETestsWindows
