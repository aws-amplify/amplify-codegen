from aws_cdk import core
from build_unittest_builder import BuildUnitTestBuilder
from aws_cdk.aws_secretsmanager import Secret
import boto3
from aws_cdk.aws_codebuild import GitHubSourceCredentials


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

        # self.update_github_source_credential()

        branch_builder = BuildUnitTestBuilder(self,
                                              "common-branch-workflow",
                                              project_name=f"{self.codebuild_project_name_prefix}-common-branch-workflow",
                                              github_owner=self.github_owner,
                                              github_repo=self.github_repo,
                                              buildspec_path="codebuild_specs/common-branch-buildspec.yml",
                                              exclude_branches=self.exclude_branches)

        # core.Dependency(source=branch_builder, target=github_source_credentials)

    ### The below method is an attempt to update the Github source credentials
    ### associated with the given AWS account's codebuild projects.
    ### The current codebuild design only supports adding source credentials using CLI or through Console:
    ### https://github.com/aws/aws-cdk/issues/1844
    # def update_github_source_credential(self):
    #     codebuild_client = boto3.client("codebuild")
    #     current_credentials = codebuild_client.list_source_credentials()
    #
    #     current_github_access_tokens = list(
    #         filter(lambda s: (s["serverType"] == "GITHUB"), current_credentials["sourceCredentialsInfos"]))
    #
    #     if len(current_github_access_tokens) > 0:
    #         print(f"deleting credentials:{current_github_access_tokens[0]['arn']}")
    #         codebuild_client.delete_source_credentials(arn=current_github_access_tokens[0]["arn"])
    #
    #     github_ops_access_token_secret = Secret.from_secret_name_v2(self,
    #                                                                 "github-ops-access-token",
    #                                                                 secret_name="github_ops_access_token")
    #
    #     ssm_client = boto3.client("secretsmanager")
    #     github_ops_access_token_secret_value = ssm_client.get_secret_value(SecretId=github_ops_access_token_secret.secret_name)["SecretString"]
    #
    #     # Approach1: using codebuild python SDK to import source credentials
    #     response = codebuild_client.import_source_credentials(
    #         username='amplify-ops',
    #         token=github_ops_access_token_secret_value,
    #         serverType='GITHUB',
    #         authType='PERSONAL_ACCESS_TOKEN',
    #         shouldOverwrite=True
    #     )
    #
    #     # Approach2: creating the source credentials using CDK
    #     github_source_credentials = GitHubSourceCredentials(self,
    #                                                         f"{id}-access-token",
    #                                                         access_token=github_ops_access_token_secret.secret_value)
