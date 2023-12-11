#!/bin/bash

# set exit on error to true
set -e

source ./shared-scripts.sh && _unassumeTestAccountCredentials
aws sts get-caller-identity
source ./shared-scripts.sh && _scanArtifacts
