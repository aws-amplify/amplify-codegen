from aws_cdk import core
from build_unittest_deploy_builder import BuildUnitTestDeployBuilder
from common_branch_stack import CommonBranchStack


class DeployBranchStack(CommonBranchStack):

    def __init__(self, scope: core.App, id: str, branch_name:str, props, **kwargs):
        self.branch_name = branch_name
        super().__init__(scope, id, props, **kwargs)

    def branch_builder(self):
        BuildUnitTestDeployBuilder(self,
                                   f"{self.branch_name}-branch-workflow",
                                   project_name=f"{self.codebuild_project_name_prefix}-{self.branch_name}-branch-workflow",
                                   github_owner=self.github_owner,
                                   github_repo=self.github_repo,
                                   buildspec_path=f"codebuild_specs/{self.branch_name}-branch-buildspec.yml",
                                   base_branch=self.branch_name)
