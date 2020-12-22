from aws_cdk import core
from stacks.build_unittest_builder import BuildUnitTestBuilder

class CommonBranchStack(core.Stack):

  def __init__(self, scope: core.App, id: str, props, exclude_branches=None, **kwargs):
    super().__init__(scope, id, **kwargs)
    if exclude_branches is None:
      exclude_branches = []
    required_props = ['github_source']
    for prop in required_props:
      if prop not in props:
        raise RuntimeError(f"Parameter {prop} is required.")

    self.codebuild_project_name_prefix = props['codebuild_project_name_prefix']
    self.github_owner = props['github_source']['owner']
    self.github_repo = props['github_source']['repo']
    self.exclude_branches = exclude_branches
    self.branch_builder()

  def branch_builder(self):

    BuildUnitTestBuilder(self,
                         "common-branch-workflow",
                         project_name=f"{self.codebuild_project_name_prefix}-common-branch-workflow",
                         github_owner=self.github_owner,
                         github_repo=self.github_repo,
                         buildspec_path="codebuild_specs/common-branch-buildspec.yml",
                         exclude_branches=self.exclude_branches)
