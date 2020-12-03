#!/usr/bin/env python3

from aws_cdk import (
    core
)

from stacks.common_branch_stack import CommonBranchStack
from stacks.deploy_branch_stack import DeployBranchStack

app = core.App()

# Get github repository related information
# These are required to create a codebuild project
REPO = 'amplify-codegen'
github_owner = app.node.try_get_context("github_owner")
if github_owner is None:
    raise ValueError(
        "Provide github_owner in 'context' parameter, as in: cdk deploy app -c github_owner=amplify-ops"
    )

stack_props = {
    'github_source': {
        'owner': github_owner,
        'repo': REPO
    },
    'codebuild_project_name_prefix': REPO
}

# Branches that have a deploy step in addition to build and test
deploy_branches = ["master", "release"]

CommonBranchStack(scope=app,
                  id="common-branch-stack",
                  props=stack_props,
                  exclude_branches=deploy_branches,
                  description="CI/CD build and test assets for amplify-codegen")

for deploy_branch in deploy_branches:
    DeployBranchStack(scope=app,
                      id=f"{deploy_branch}-branch-stack",
                      branch_name=deploy_branch,
                      props=stack_props,
                      description="CI/CD build, test and deploy assets for amplify-codegen")

app.synth()
