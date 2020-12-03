from aws_cdk import core
from aws_cdk.aws_codebuild import (
    BuildEnvironment,
    BuildSpec,
    ComputeType,
    EventAction,
    FilterGroup,
    LinuxBuildImage,
    Project,
    Source
)


class BuildUnitTestDeployBuilder(Project):
    BUILD_IMAGE = LinuxBuildImage.AMAZON_LINUX_2_3

    def __init__(self,
                 scope: core.Construct,
                 id: str, *,
                 project_name: str,
                 github_owner,
                 github_repo,
                 buildspec_path,
                 base_branch: str):
        build_environment = BuildEnvironment(build_image=self.BUILD_IMAGE,
                                             privileged=True,
                                             compute_type=ComputeType.LARGE)

        pr_trigger = FilterGroup.in_event_of(EventAction.PULL_REQUEST_MERGED).and_base_branch_is(base_branch)
        push_trigger = FilterGroup.in_event_of(EventAction.PUSH).and_branch_is(base_branch)

        super().__init__(scope,
                         id,
                         project_name=project_name,
                         build_spec=BuildSpec.from_source_filename(buildspec_path),
                         badge=True,
                         source=Source.git_hub(owner=github_owner,
                                               report_build_status=True,
                                               repo=github_repo,
                                               webhook=True,
                                               webhook_filters=[pr_trigger, push_trigger]),
                         environment=build_environment)
