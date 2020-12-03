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


class BuildUnitTestBuilder(Project):
    BUILD_IMAGE = LinuxBuildImage.AMAZON_LINUX_2_3

    def __init__(self,
                 scope: core.Construct,
                 id: str, *,
                 project_name: str,
                 github_owner: str,
                 github_repo: str,
                 buildspec_path: str,
                 exclude_branches: [str]):
        build_environment = BuildEnvironment(build_image=self.BUILD_IMAGE,
                                             privileged=True,
                                             compute_type=ComputeType.LARGE)

        if len(exclude_branches) > 0:
            exclude_branches_regex = "(" + "|".join(exclude_branches) + ")"
            trigger = FilterGroup.in_event_of(EventAction.PULL_REQUEST_MERGED,
                                              EventAction.PULL_REQUEST_CREATED,
                                              EventAction.PULL_REQUEST_UPDATED,
                                              EventAction.PULL_REQUEST_REOPENED,
                                              EventAction.PUSH).and_branch_is_not(exclude_branches_regex)
        else:
            trigger = FilterGroup.in_event_of(EventAction.PULL_REQUEST_MERGED,
                                              EventAction.PULL_REQUEST_CREATED,
                                              EventAction.PULL_REQUEST_UPDATED,
                                              EventAction.PULL_REQUEST_REOPENED,
                                              EventAction.PUSH)

        super().__init__(scope,
                         id,
                         project_name=project_name,
                         build_spec=BuildSpec.from_source_filename(buildspec_path),
                         badge=True,
                         source=Source.git_hub(owner=github_owner,
                                               report_build_status=True,
                                               repo=github_repo,
                                               webhook=True,
                                               webhook_filters=[trigger]),
                         environment=build_environment)
