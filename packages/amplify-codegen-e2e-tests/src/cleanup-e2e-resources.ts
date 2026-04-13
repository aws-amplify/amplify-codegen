/* eslint-disable spellcheck/spell-checker, camelcase, @typescript-eslint/no-explicit-any */
import { CodeBuildClient, BatchGetBuildsCommand, Build } from '@aws-sdk/client-codebuild';
import { AccountClient, ListRegionsCommand, ListRegionsRequest } from '@aws-sdk/client-account';
import { AmplifyClient, ListAppsCommand, ListBackendEnvironmentsCommand, DeleteAppCommand } from '@aws-sdk/client-amplify';
import { CloudFormationClient, DescribeStacksCommand, ListStacksCommand, ListStackResourcesCommand, DeleteStackCommand, waitUntilStackDeleteComplete, Tag } from '@aws-sdk/client-cloudformation';
import { S3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketTaggingCommand, Bucket } from '@aws-sdk/client-s3';
import { IAMClient, ListRolesCommand, DeleteRoleCommand, ListAttachedRolePoliciesCommand, DetachRolePolicyCommand, ListRolePoliciesCommand, DeleteRolePolicyCommand, Role, AttachedPolicy } from '@aws-sdk/client-iam';
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { OrganizationsClient, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { config } from 'dotenv';
import yargs from 'yargs';
import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { deleteS3Bucket, sleep } from '@aws-amplify/amplify-codegen-e2e-core';

/**
 * Supported regions:
 * - All Amplify regions, as reported https://docs.aws.amazon.com/general/latest/gr/amplify.html
 *
 * NOTE:
 * - 'ap-east-1' is not included in the list due to known discrepancy in Amplify CLI 'configure' command dropdown and supported regions
 * - Since 'ap-east-1' is not available via 'amplify configure', test $CLI_REGION with 'ap-east-1' will run in 'us-east-1'
 * and fail Amplify profile assertion in test setup phase
 *
 * The list of supported regions must be kept in sync amongst all of:
 * - Amplify CLI 'amplify configure' command regions dropdown
 * - the internal pipeline that publishes new lambda layer versions
 * - amplify-codegen/scripts/e2e-test-regions.json
 * - amplify-codegen/scripts/split-canary-tests.ts
 * - amplify-codegen/scripts/split-e2e-tests.ts
 */
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SUPPORTED_REGIONS_PATH = path.join(REPO_ROOT, 'scripts', 'e2e-test-regions.json');
const AWS_REGIONS_TO_RUN_TESTS_METADATA: TestRegion[] = JSON.parse(fs.readFileSync(SUPPORTED_REGIONS_PATH, 'utf-8'));
const AWS_REGIONS_TO_RUN_TESTS = AWS_REGIONS_TO_RUN_TESTS_METADATA.map(region => region.name);

type TestRegion = {
  name: string;
  optIn: boolean;
};

const reportPathDir = path.normalize(path.join(__dirname, '..', 'amplify-e2e-reports'));

const MULTI_JOB_APP = '<Amplify App reused by multiple apps>';
const ORPHAN = '<orphan>';
const UNKNOWN = '<unknown>';

type StackInfo = {
  stackName: string;
  stackStatus: string;
  resourcesFailedToDelete?: string[];
  tags: Record<string, string>;
  region: string;
  jobId: string;
  cbInfo?: Build;
};

type AmplifyAppInfo = {
  appId: string;
  name: string;
  region: string;
  backends: Record<string, StackInfo>;
};

type S3BucketInfo = {
  name: string;
  region: string;
  jobId?: string;
  cbInfo?: Build;
};

type IamRoleInfo = {
  name: string;
  cbInfo?: Build;
};

type ReportEntry = {
  jobId?: string;
  buildBatchArn?: string;
  buildComplete?: boolean;
  cbJobDetails?: Build;
  buildStatus?: string;
  amplifyApps: Record<string, AmplifyAppInfo>;
  stacks: Record<string, StackInfo>;
  buckets: Record<string, S3BucketInfo>;
  roles: Record<string, IamRoleInfo>;
};

type JobFilterPredicate = (job: ReportEntry) => boolean;

type CBJobInfo = {
  buildBatchArn: string;
  projectName: string;
  buildComplete: boolean;
  cbJobDetails: Build;
  buildStatus: string;
};

type AWSAccountInfo = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
};

type CleanupAccountSummary = {
  accountId: string;
  accountIndex: number;
  deletedApps: number;
  deletedStacks: number;
  deletedBuckets: number;
  deletedRoles: number;
  skippedStacks: number;
  skippedBuckets: number;
  skippedReason?: string;
};

const createAccountSummary = (accountId: string, accountIndex: number): CleanupAccountSummary => ({
  accountId,
  accountIndex,
  deletedApps: 0,
  deletedStacks: 0,
  deletedBuckets: 0,
  deletedRoles: 0,
  skippedStacks: 0,
  skippedBuckets: 0,
});

const cleanupSummaries: CleanupAccountSummary[] = [];

const BUCKET_TEST_REGEX = /test/;
const IAM_TEST_REGEX = /-RotateE2eAwsToken-e2eTestContextRole|-integtest|^amplify-/;
const STALE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

const isCI = (): boolean => process.env.CI && process.env.CODEBUILD ? true : false;

class ExpiredTokenError extends Error {
  constructor(message = 'Token expired for this account') {
    super(message);
    this.name = 'ExpiredTokenError';
  }
}

const isExpiredTokenError = (e: any): boolean => {
  return e?.name === 'ExpiredTokenException' || e?.name === 'InvalidToken' || e?.code === 'ExpiredTokenException' || e?.code === 'InvalidToken';
};

const isStackDoesNotExistError = (e: any): boolean => {
  return e?.name === 'ValidationError' && e?.message?.includes('does not exist');
};

const isNonJsonResponseError = (e: any): boolean => {
  return e instanceof SyntaxError || (e?.name === 'SyntaxError' && e?.message?.includes('Unexpected token'));
};

const isNetworkError = (e: any): boolean => {
  const code = e?.code || e?.name || '';
  return ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'EAI_AGAIN', 'NetworkingError', 'TimeoutError'].includes(code)
    || e?.message?.includes('connect ETIMEDOUT')
    || e?.message?.includes('ECONNREFUSED')
    || e?.message?.includes('ECONNRESET');
};

const isNoSuchBucketError = (e: any): boolean => {
  return e?.name === 'NoSuchBucket' || e?.Code === 'NoSuchBucket' || e?.message?.includes('The specified bucket does not exist');
};

const isStackInProgressError = (e: any): boolean => {
  const msg = e?.message || '';
  return msg.includes('UPDATE_IN_PROGRESS') || msg.includes('DELETE_IN_PROGRESS') || msg.includes('CREATE_IN_PROGRESS')
    || msg.includes('cannot be deleted while in status');
};

const handleExpiredTokenException = (): void => {
  console.log('Token expired for this account. Skipping remaining operations for this account.');
  throw new ExpiredTokenError();
};

/**
 * We define a resource as viable for deletion if it matches TEST_REGEX in the name, and if it is > STALE_DURATION_MS old.
 */
const testBucketStalenessFilter = (resource: Bucket): boolean => {
  const isTestResource = resource.Name.match(BUCKET_TEST_REGEX);
  const isStaleResource = (Date.now() - resource.CreationDate.getMilliseconds()) > STALE_DURATION_MS;
  return isTestResource && isStaleResource;
};

const testRoleStalenessFilter = (resource: Role): boolean => {
  const isTestResource = resource.RoleName.match(IAM_TEST_REGEX);
  const isStaleResource = (Date.now() - resource.CreateDate.getMilliseconds()) > STALE_DURATION_MS;
  return isTestResource && isStaleResource;
};

/**
 * Get all S3 buckets in the account, and filter down to the ones we consider stale.
 */
const getOrphanS3TestBuckets = async (account: AWSAccountInfo): Promise<S3BucketInfo[]> => {
  const s3Client = new S3Client(getAWSConfig(account));
  const listBucketResponse = await s3Client.send(new ListBucketsCommand({}));
  const staleBuckets = listBucketResponse.Buckets.filter(testBucketStalenessFilter);
  const bucketInfos = await Promise.all(
    staleBuckets.map(async (staleBucket): Promise<S3BucketInfo> => {
      const region = await getBucketRegion(account, staleBucket.Name);
      return {
        name: staleBucket.Name,
        region,
      };
    }),
  );
  return bucketInfos;
};

/**
 * Get all iam roles in the account, and filter down to the ones we consider stale.
 */
const getOrphanTestIamRoles = async (account: AWSAccountInfo): Promise<IamRoleInfo[]> => {
  const iamClient = new IAMClient(getAWSConfig(account));
  const listRoleResponse = await iamClient.send(new ListRolesCommand({MaxItems: 1000}));
  const staleRoles = listRoleResponse.Roles.filter(testRoleStalenessFilter);
  return staleRoles.map(it => ({ name: it.RoleName }));
};

/**
 * Get the relevant AWS config object for a given account and region.
 */
 const getAWSConfig = ({ accessKeyId, secretAccessKey, sessionToken }: AWSAccountInfo, region?: string): unknown => ({
  credentials: {
    accessKeyId,
    secretAccessKey,
    sessionToken,
  },
  ...(region ? { region } : {}),
  maxRetries: 10,
 });

 /**
 * Returns a list of regions enabled given the AWS account information
 * @param accountInfo aws account to check region
 * @returns Promise<string[]> a list of AWS regions enabled by the account
 */
const getRegionsEnabled = async (accountInfo: AWSAccountInfo): Promise<string[]> => {
  // Specify service region to avoid possible endpoint unavailable error
  const account = new AccountClient(getAWSConfig(accountInfo, 'us-east-1'));

  const enabledRegions: string[] = [];
  let nextToken: string | undefined = undefined;

  do {
    const input: ListRegionsRequest = {
      RegionOptStatusContains: ['ENABLED', 'ENABLED_BY_DEFAULT'],
      NextToken: nextToken,
    };

    const response = await account.send(new ListRegionsCommand(input));
    nextToken = response.NextToken;

    enabledRegions.push(...response.Regions.map(r => r.RegionName).filter(Boolean));
  } while (nextToken);

  console.log('All enabled regions fetched: ', enabledRegions);
  return enabledRegions;
};

/**
 * Returns a list of Amplify Apps in the region. The apps includes information about the CI build that created the app
 * This is determined by looking at tags of the backend environments that are associated with the Apps
 * @param account aws account to query for amplify Apps
 * @param region aws region to query for amplify Apps
 * @returns Promise<AmplifyAppInfo[]> a list of Amplify Apps in the region with build info
 */
const getAmplifyApps = async (account: AWSAccountInfo, region: string, regionsEnabled: string[]): Promise<AmplifyAppInfo[]> => {
  const amplifyClient = new AmplifyClient(getAWSConfig(account, region));

  if (!regionsEnabled.includes(region)) {
    console.error(`Listing apps for account ${account.accountId}-${region} failed since ${region} is not enabled. Skipping.`);
    return [];
  }

  const amplifyApps = await amplifyClient.send(new ListAppsCommand({ maxResults: 50 })); // keeping it to 50 as max supported is 50
  const result: AmplifyAppInfo[] = [];
  for (const app of amplifyApps.apps) {
    const backends: Record<string, StackInfo> = {};
    try {
      const backendEnvironments = await amplifyClient.send(new ListBackendEnvironmentsCommand({ appId: app.appId, maxResults: 50 }));
      for (const backendEnv of backendEnvironments.backendEnvironments) {
        const buildInfo = await getStackDetails(backendEnv.stackName, account, region);
        if (buildInfo) {
          backends[backendEnv.environmentName] = buildInfo;
        }
      }
    } catch (e) {
      console.log(e);
    }
    result.push({
      appId: app.appId,
      name: app.name,
      region,
      backends,
    });
  }
  return result;
};

/**
 * Return the CodeBuild job id looking at `codebuild:build_id` in the tags
 * @param tags Tags associated with the resource
 * @returns build number or undefined
 */
const getJobId = (tags: Tag[] = []): string | undefined => {
  const jobId = tags.find(tag => tag.Key === 'codebuild:build_id')?.Value;
  return jobId;
};

/**
 * Gets detail about a stack including the details about CI job that created the stack. If a stack
 * has status of `DELETE_FAILED` then it also includes the list of physical id of resources that caused
 * deletion failures
 *
 * @param stackName name of the stack
 * @param account account
 * @param region region
 * @returns stack details
 */
const getStackDetails = async (stackName: string, account: AWSAccountInfo, region: string): Promise<StackInfo | void> => {
  const cfnClient = new CloudFormationClient(getAWSConfig(account, region));
  try {
    const stack = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }));
    const tags = stack.Stacks.length && stack.Stacks[0].Tags;
    const stackStatus = stack.Stacks[0].StackStatus;
    let resourcesFailedToDelete: string[] = [];
    if (stackStatus === 'DELETE_FAILED') {
      const resources = await cfnClient.send(new ListStackResourcesCommand({ StackName: stackName }));
      resourcesFailedToDelete = resources.StackResourceSummaries.filter(r => r.ResourceStatus === 'DELETE_FAILED').map(
        r => r.LogicalResourceId,
      );
    }
    const jobId = getJobId(tags);
    return {
      stackName,
      stackStatus,
      resourcesFailedToDelete,
      region,
      tags: tags.reduce((acc, tag) => ({ ...acc, [tag.Key]: tag.Value }), {}),
      jobId
    };
  } catch (e) {
    if (isStackDoesNotExistError(e)) {
      console.log(`Stack ${stackName} does not exist in ${region}. Skipping.`);
      return;
    }
    throw e;
  }
};

const getStacks = async (account: AWSAccountInfo, region: string, regionsEnabled: string[]): Promise<StackInfo[]> => {
  const cfnClient = new CloudFormationClient(getAWSConfig(account, region));

  if (!regionsEnabled.includes(region)) {
    console.error(`Listing stacks for account ${account.accountId}-${region} failed since ${region} is not enabled. Skipping.`);
    return [];
  }

  const stacks = await cfnClient.send(new ListStacksCommand({
      StackStatusFilter: [
        'CREATE_COMPLETE',
        'ROLLBACK_FAILED',
        'DELETE_FAILED',
        'UPDATE_COMPLETE',
        'UPDATE_ROLLBACK_FAILED',
        'UPDATE_ROLLBACK_COMPLETE',
        'IMPORT_COMPLETE',
        'IMPORT_ROLLBACK_FAILED',
        'IMPORT_ROLLBACK_COMPLETE',
      ],
    }));

  // We are interested in only the root stacks that are deployed by amplify-cli
  const rootStacks = stacks.StackSummaries.filter(stack => !stack.RootId);
  const results: StackInfo[] = [];
  for (const stack of rootStacks) {
    try {
      const details = await getStackDetails(stack.StackName, account, region);
      if (details) {
        results.push(details);
      }
    } catch {
      // don't want to barf and fail e2e tests
    }
  }
  return results;
};

const getCodeBuildClient = (): CodeBuildClient => {
  return new CodeBuildClient({
    apiVersion: '2016-10-06',
    region: 'us-east-1',
  });
};

const getJobCodeBuildDetails = async (jobIds: string[]): Promise<Build[]> => {
  if (jobIds.length === 0) {
    return [];
  }
  const client = getCodeBuildClient();
  const allBuilds: Build[] = [];
  const BATCH_SIZE = 100;
  for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
    const batch = jobIds.slice(i, i + BATCH_SIZE);
    try {
      const { builds } = await client.send(new BatchGetBuildsCommand({ ids: batch }));
      if (builds) {
        allBuilds.push(...builds);
      }
    } catch (e) {
      console.log(`Failed to get CodeBuild details for batch starting at index ${i}:`, e);
    }
  }
  return allBuilds;
};

const getBucketRegion = async (account: AWSAccountInfo, bucketName: string): Promise<string> => {
  const awsConfig = getAWSConfig(account);
  const s3Client = new S3Client(awsConfig);
  const location = await s3Client.send(new GetBucketLocationCommand({ Bucket: bucketName }));
  const region = location.LocationConstraint ?? 'us-east-1';
  return region;
};

const getS3Buckets = async (account: AWSAccountInfo): Promise<S3BucketInfo[]> => {
  const awsConfig = getAWSConfig(account);
  const s3Client = new S3Client(awsConfig);
  const buckets = await s3Client.send(new ListBucketsCommand({}));
  const result: S3BucketInfo[] = [];
  for (const bucket of buckets.Buckets) {
    let region: string | undefined;
    try {
      region = await getBucketRegion(account, bucket.Name);
      // Operations on buckets created in opt-in regions appear to require region-specific clients
      const regionalizedClient = new S3Client({
        region,
        ...(awsConfig as object),
      });
      const bucketDetails = await regionalizedClient.send(new GetBucketTaggingCommand({ Bucket: bucket.Name }));
      const jobId = getJobId(bucketDetails.TagSet);
      if (jobId) {
        result.push({
          name: bucket.Name,
          region,
          jobId
        });
      }
    } catch (e) {
      if (e.name === 'NoSuchTagSet' || e.name === 'NoSuchBucket') {
        result.push({
          name: bucket.Name,
          region: region ?? 'us-east-1',
        });
      } else if (e.name === 'InvalidToken' || isExpiredTokenError(e)) {
        console.error(`Skipping processing ${account.accountId}, bucket ${bucket.Name}`, e);
      } else if (isNonJsonResponseError(e)) {
        console.warn(`Received non-JSON response for bucket ${bucket.Name}. Skipping.`, e.message);
      } else {
        throw e;
      }
    }
  }
  return result;
};

/**
 * extract and moves CI job details
 */
const extractCCIJobInfo = (
  record: S3BucketInfo | StackInfo | AmplifyAppInfo,
  buildInfos: Record<string, Build[]>
  ): CBJobInfo => {
  const buildId = _.get(record, ['0', 'jobId']);
  return {
    buildBatchArn: _.get(buildInfos, [ buildId, '0', 'buildBatchArn' ]),
    projectName: _.get(buildInfos, [ buildId, '0', 'projectName' ]),
    buildComplete: _.get(buildInfos, [ buildId, '0', 'buildComplete' ]),
    cbJobDetails: _.get(buildInfos, [ buildId, '0' ]),
    buildStatus: _.get(buildInfos, [ buildId, '0', 'buildStatus' ])
  };
}


/**
 * Merges stale resources and returns a list grouped by the CodeBuild jobId. Amplify Apps that don't have
 * any backend environment are grouped as Orphan apps and apps that have Backend created by different CodeBuild jobs are
 * grouped as MULTI_JOB_APP. Any resource that do not have a CodeBuild job is grouped under UNKNOWN
 */
const mergeResourcesByCCIJob = async (
  amplifyApp: AmplifyAppInfo[],
  cfnStacks: StackInfo[],
  s3Buckets: S3BucketInfo[],
  orphanS3Buckets: S3BucketInfo[],
  orphanIamRoles: IamRoleInfo[],
): Promise<Record<string, ReportEntry>> => {
  const result: Record<string, ReportEntry> = {};

  const stacksByJobId = _.groupBy(cfnStacks, (stack: StackInfo) => _.get(stack, ['jobId'], UNKNOWN));

  const bucketByJobId = _.groupBy(s3Buckets, (bucketInfo: S3BucketInfo) => _.get(bucketInfo, ['jobId'], UNKNOWN));

  const amplifyAppByJobId = _.groupBy(amplifyApp, (appInfo: AmplifyAppInfo) => {
    if (Object.keys(appInfo.backends).length === 0) {
      return ORPHAN;
    }

    const buildIds = _.groupBy(appInfo.backends, backendInfo => _.get(backendInfo, ['jobId'], UNKNOWN));
    if (Object.keys(buildIds).length === 1) {
      return Object.keys(buildIds)[0];
    }

    return MULTI_JOB_APP;
  });
  const codeBuildJobIds: string[] = _.uniq([...Object.keys(stacksByJobId), ...Object.keys(bucketByJobId), ...Object.keys(amplifyAppByJobId)])
  .filter((jobId: string) => jobId !== UNKNOWN && jobId !== ORPHAN && jobId !== MULTI_JOB_APP)
  const buildInfos = await getJobCodeBuildDetails(codeBuildJobIds);
  const buildInfosByJobId = _.groupBy(buildInfos, (build: Build) => _.get(build, ['id']));
  _.mergeWith(
    result,
    _.pickBy(amplifyAppByJobId, (__, key) => key !== MULTI_JOB_APP),
    (val, src, key) => ({
      ...val,
      ...extractCCIJobInfo(src, buildInfosByJobId),
      jobId: key,
      amplifyApps: src,
    }),
  );

  _.mergeWith(
    result,
    stacksByJobId,
    (__: unknown, key: string) => key !== ORPHAN,
    (val, src, key) => ({
      ...val,
      ...extractCCIJobInfo(src, buildInfosByJobId),
      jobId: key,
      stacks: src,
    }),
  );

  _.mergeWith(result, bucketByJobId, (val, src, key) => ({
    ...val,
    ...extractCCIJobInfo(src, buildInfosByJobId),
    jobId: key,
    buckets: src,
  }));

  const orphanBuckets = {
    [ORPHAN]: orphanS3Buckets,
  };

  _.mergeWith(result, orphanBuckets, (val, src, key) => ({
    ...val,
    jobId: key,
    buckets: src,
  }));

  const orphanIamRolesGroup = {
    [ORPHAN]: orphanIamRoles,
  };

  _.mergeWith(result, orphanIamRolesGroup, (val, src, key) => ({
    ...val,
    jobId: key,
    roles: src,
  }));

  return result;
};

const deleteAmplifyApps = async (account: AWSAccountInfo, accountIndex: number, apps: AmplifyAppInfo[], summary: CleanupAccountSummary): Promise<void> => {
  await Promise.all(apps.map(app => deleteAmplifyApp(account, accountIndex, app, summary)));
};

const deleteAmplifyApp = async (account: AWSAccountInfo, accountIndex: number, app: AmplifyAppInfo, summary: CleanupAccountSummary): Promise<void> => {
  const { name, appId, region } = app;
  console.log(`${generateAccountInfo(account, accountIndex)} Deleting App ${name}(${appId})`);
  const amplifyClient = new AmplifyClient(getAWSConfig(account, region));
  try {
    await amplifyClient.send(new DeleteAppCommand({ appId }));
    summary.deletedApps++;
  } catch (e) {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting Amplify App ${appId} failed with the following error`, e);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const deleteIamRoles = async (account: AWSAccountInfo, accountIndex: number, roles: IamRoleInfo[], summary: CleanupAccountSummary): Promise<void> => {
  // Sending consecutive delete role requests is throwing Rate limit exceeded exception.
  // We introduce a brief delay between batches
  const batchSize = 20;
  for (var i = 0; i < roles.length; i += batchSize) {
    const rolesToDelete = roles.slice(i, i + batchSize);
    await Promise.all(rolesToDelete.map(role => deleteIamRole(account, accountIndex, role, summary)));
    await sleep(5000);
  }
};

const deleteIamRole = async (account: AWSAccountInfo, accountIndex: number, role: IamRoleInfo, summary: CleanupAccountSummary): Promise<void> => {
  const { name: roleName } = role;
  try {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting Iam Role ${roleName}`);
    const iamClient = new IAMClient(getAWSConfig(account));
    await deleteAttachedRolePolicies(account, accountIndex, roleName);
    await deleteRolePolicies(account, accountIndex, roleName);
    await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
    summary.deletedRoles++;
  } catch (e) {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting iam role ${roleName} failed with error ${e.message}`);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const deleteAttachedRolePolicies = async (
  account: AWSAccountInfo,
  accountIndex: number,
  roleName: string,
): Promise<void> => {
  const iamClient = new IAMClient(getAWSConfig(account));
  const rolePolicies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
  await Promise.all(rolePolicies.AttachedPolicies.map(policy => detachIamAttachedRolePolicy(account, accountIndex, roleName, policy)));
};

const detachIamAttachedRolePolicy = async (
  account: AWSAccountInfo,
  accountIndex: number,
  roleName: string,
  policy: AttachedPolicy,
): Promise<void> => {
  try {
    console.log(`${generateAccountInfo(account, accountIndex)} Detach Iam Attached Role Policy ${policy.PolicyName}`);
    const iamClient = new IAMClient(getAWSConfig(account));
    await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }));
  } catch (e) {
    console.log(`${generateAccountInfo(account, accountIndex)} Detach iam role policy ${policy.PolicyName} failed with error ${e.message}`);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const deleteRolePolicies = async (
  account: AWSAccountInfo,
  accountIndex: number,
  roleName: string,
): Promise<void> => {
  const iamClient = new IAMClient(getAWSConfig(account));
  const rolePolicies = await iamClient.send(new ListRolePoliciesCommand({ RoleName: roleName }));
  await Promise.all(rolePolicies.PolicyNames.map(policy => deleteIamRolePolicy(account, accountIndex, roleName, policy)));
};

const deleteIamRolePolicy = async (
  account: AWSAccountInfo,
  accountIndex: number,
  roleName: string,
  policyName: string,
): Promise<void> => {
  try {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting Iam Role Policy ${policyName}`);
    const iamClient = new IAMClient(getAWSConfig(account));
    await iamClient.send(new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: policyName }));
  } catch (e) {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting iam role policy ${policyName} failed with error ${e.message}`);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const deleteBuckets = async (account: AWSAccountInfo, accountIndex: number, buckets: S3BucketInfo[], summary: CleanupAccountSummary): Promise<void> => {
  await Promise.all(buckets.map(bucket => deleteBucket(account, accountIndex, bucket, summary)));
};

const deleteBucket = async (account: AWSAccountInfo, accountIndex: number, bucket: S3BucketInfo, summary: CleanupAccountSummary): Promise<void> => {
  const { name } = bucket;
  try {
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting S3 Bucket ${name}`);
    const awsConfig = getAWSConfig(account);
    const regionalizedS3Client = new S3Client({
      region: bucket.region,
      ...(awsConfig as object),
    });
    await deleteS3Bucket(name, regionalizedS3Client);
    summary.deletedBuckets++;
  } catch (e) {
    if (isNoSuchBucketError(e)) {
      console.log(`${generateAccountInfo(account, accountIndex)} Bucket ${name} does not exist. Already deleted. Skipping.`);
      summary.skippedBuckets++;
      return;
    }
    console.log(`${generateAccountInfo(account, accountIndex)} Deleting bucket ${name} failed with error ${e.message}`);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const deleteCfnStacks = async (account: AWSAccountInfo, accountIndex: number, stacks: StackInfo[], summary: CleanupAccountSummary): Promise<void> => {
  await Promise.all(stacks.map(stack => deleteCfnStack(account, accountIndex, stack, summary)));
};

const deleteCfnStack = async (account: AWSAccountInfo, accountIndex: number, stack: StackInfo, summary: CleanupAccountSummary): Promise<void> => {
  const { stackName, region, resourcesFailedToDelete } = stack;
  const resourceToRetain = resourcesFailedToDelete.length ? resourcesFailedToDelete : undefined;
  console.log(`${generateAccountInfo(account, accountIndex)} Deleting CloudFormation stack ${stackName}`);
  try {
    const cfnClient = new CloudFormationClient(getAWSConfig(account, region));
    await cfnClient.send(new DeleteStackCommand({ StackName: stackName, RetainResources: resourceToRetain }));
    await waitUntilStackDeleteComplete({ client: cfnClient, maxWaitTime: 3600 }, { StackName: stackName });
    summary.deletedStacks++;
  } catch (e) {
    if (isStackDoesNotExistError(e)) {
      console.log(`${generateAccountInfo(account, accountIndex)} Stack ${stackName} does not exist. Already deleted. Skipping.`);
      return;
    }
    if (isStackInProgressError(e)) {
      console.log(`${generateAccountInfo(account, accountIndex)} Stack ${stackName} is currently in progress. Skipping.`);
      summary.skippedStacks++;
      return;
    }
    console.log(`Deleting CloudFormation stack ${stackName} failed with error ${e.message}`);
    if (isExpiredTokenError(e)) {
      handleExpiredTokenException();
    }
  }
};

const generateReport = (jobs: _.Dictionary<ReportEntry>, accountIdx: number): void => {
  const reportPath = path.join(reportPathDir, `stale-resources-${accountIdx}.json`);
  fs.ensureFileSync(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(jobs, null, 4));
};

/**
 * While we basically fan-out deletes elsewhere in this script, leaving the app->cfn->bucket delete process
 * serial within a given account, it's not immediately clear if this is necessary, but seems possibly valuable.
 */
const deleteResources = async (
  account: AWSAccountInfo,
  accountIndex: number,
  staleResources: Record<string, ReportEntry>,
  summary: CleanupAccountSummary,
): Promise<void> => {
  for (const jobId of Object.keys(staleResources)) {
    const resources = staleResources[jobId];
    if (resources.amplifyApps) {
      await deleteAmplifyApps(account, accountIndex, Object.values(resources.amplifyApps), summary);
    }

    if (resources.stacks) {
      await deleteCfnStacks(account, accountIndex, Object.values(resources.stacks), summary);
    }

    if (resources.buckets) {
      await deleteBuckets(account, accountIndex, Object.values(resources.buckets), summary);
    }

    if (resources.roles) {
      await deleteIamRoles(account, accountIndex, Object.values(resources.roles), summary);
    }
  }
};

/**
 * Grab the right CI filter based on args passed in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFilterPredicate = (args: any): JobFilterPredicate => {
  const filterByJobId = (jobId: string) => (job: ReportEntry) => job.jobId === jobId;
  const filterByBuildBatchArn = (buildBatchArn: string) => (job: ReportEntry) => job.buildBatchArn === buildBatchArn;
  const filterAllStaleResources = () => (job: ReportEntry) => job.buildComplete || job.jobId === ORPHAN;

  if (args._.length === 0) {
    return filterAllStaleResources();
  }
  if (args._[0] === 'buildBatchArn') {
    return filterByBuildBatchArn(args.buildBatchArn as string);
  }
  if (args._[0] === 'job') {
    return filterByJobId(args.jobId as string);
  }
  throw Error('Invalid args config');
};

/**
 * Retrieve the accounts to process for potential cleanup. By default we will attempt
 * to get all accounts within the root account organization.
 */
const getAccountsToCleanup = async (): Promise<AWSAccountInfo[]> => {
  // This script runs using the codebuild project role to begin with
  const stsClient = new STSClient({
    apiVersion: '2011-06-15'
  });
  const assumeRoleResForE2EParent = await stsClient.send(new AssumeRoleCommand({
    RoleArn: process.env.TEST_ACCOUNT_ROLE,
    RoleSessionName: `testSession${Math.floor(Math.random() * 100000)}`,
    // One hour
    DurationSeconds: 1 * 60 * 60,
  }));
  const e2eParentAccountCred = {
    accessKeyId: assumeRoleResForE2EParent.Credentials.AccessKeyId,
    secretAccessKey: assumeRoleResForE2EParent.Credentials.SecretAccessKey,
    sessionToken: assumeRoleResForE2EParent.Credentials.SessionToken
  }
  const stsClientForE2E = new STSClient({
    apiVersion: '2011-06-15',
    credentials: e2eParentAccountCred
  });
  const parentAccountIdentity = await stsClientForE2E.send(new GetCallerIdentityCommand({}));
  const orgApi = new OrganizationsClient({
    apiVersion: '2016-11-28',
    // the region where the organization exists
    region: 'us-east-1',
    credentials: e2eParentAccountCred
  });
  try {
    const orgAccounts = await orgApi.send(new ListAccountsCommand({}));
    const accountCredentialPromises = orgAccounts.Accounts.map(async (account): Promise<AWSAccountInfo | null> => {
      try {
        if (account.Id === parentAccountIdentity.Account) {
          return {
            accountId: account.Id,
            ...e2eParentAccountCred
          };
        }
        const randomNumber = Math.floor(Math.random() * 100000);
        const assumeRoleRes = await stsClientForE2E.send(new AssumeRoleCommand({
            RoleArn: `arn:aws:iam::${account.Id}:role/OrganizationAccountAccessRole`,
            RoleSessionName: `testSession${randomNumber}`,
            // One hour
            DurationSeconds: 1 * 60 * 60,
          }));
        return {
          accountId: account.Id,
          accessKeyId: assumeRoleRes.Credentials.AccessKeyId,
          secretAccessKey: assumeRoleRes.Credentials.SecretAccessKey,
          sessionToken: assumeRoleRes.Credentials.SessionToken,
        };
      } catch (e) {
        console.warn(`Failed to assume role for account ${account.Id}. Skipping.`, e.message);
        return null;
      }
    });
    const results = await Promise.all(accountCredentialPromises);
    return results.filter((acct): acct is AWSAccountInfo => acct !== null);
  } catch (e) {
    console.error(e);
    console.log('Error assuming child account role. This could be because the script is already running from within a child account. Running on current AWS account only.');
    return [
      {
        accountId: parentAccountIdentity.Account,
        ...e2eParentAccountCred
      },
    ];
  }
};

const cleanupAccount = async (account: AWSAccountInfo, accountIndex: number, filterPredicate: JobFilterPredicate): Promise<void> => {
  const summary = createAccountSummary(account.accountId, accountIndex);
  cleanupSummaries.push(summary);
  try {
    const regionsEnabled = await getRegionsEnabled(account);

    const appPromises = AWS_REGIONS_TO_RUN_TESTS.map(region => getAmplifyApps(account, region, regionsEnabled));
    const stackPromises = AWS_REGIONS_TO_RUN_TESTS.map(region => getStacks(account, region, regionsEnabled));
    const bucketPromise = getS3Buckets(account);
    const orphanBucketPromise = getOrphanS3TestBuckets(account);
    const orphanIamRolesPromise = getOrphanTestIamRoles(account);

    const apps = (await Promise.all(appPromises)).flat();
    const stacks = (await Promise.all(stackPromises)).flat();
    const buckets = await bucketPromise;
    const orphanBuckets = await orphanBucketPromise;
    const orphanIamRoles = await orphanIamRolesPromise;

    const allResources = await mergeResourcesByCCIJob(apps, stacks, buckets, orphanBuckets, orphanIamRoles);
    const staleResources = _.pickBy(allResources, filterPredicate);

    generateReport(staleResources, accountIndex);
    await deleteResources(account, accountIndex, staleResources, summary);
    console.log(`${generateAccountInfo(account, accountIndex)} Cleanup done!`);
  } catch (e) {
    if (e instanceof ExpiredTokenError || isExpiredTokenError(e)) {
      console.warn(`${generateAccountInfo(account, accountIndex)} Auth token expired or invalid. Skipping this account.`);
      summary.skippedReason = 'auth token expired';
      return;
    }
    if (isNonJsonResponseError(e)) {
      console.warn(`${generateAccountInfo(account, accountIndex)} Received non-JSON response from AWS API. Skipping this account.`, e.message);
      summary.skippedReason = 'non-JSON response';
      return;
    }
    if (isNetworkError(e)) {
      console.warn(`${generateAccountInfo(account, accountIndex)} Network error encountered. Skipping this account.`, e.message);
      summary.skippedReason = 'network error';
      return;
    }
    console.error(`${generateAccountInfo(account, accountIndex)} Cleanup failed with unexpected error:`, e);
    summary.skippedReason = 'unexpected error';
  }
};

const generateAccountInfo = (account: AWSAccountInfo, accountIndex: number): string => {
  return (`[ACCOUNT ${accountIndex}][${account.accountId}]`);
};

/**
 * Execute the cleanup script.
 * Cleanup will happen in parallel across all accounts within a given organization,
 * based on the requested filter parameters (i.e. for a given workflow, job, or all stale resources).
 * Logs are emitted for given account ids anywhere we've fanned out, but we use an indexing scheme instead
 * of account ids since the logs these are written to will be effectively public.
 */
const cleanup = async (): Promise<void> => {
  const args = yargs
    .command('*', 'clean up all the stale resources')
    .command('buildBatchArn <build-batch-arn>', 'clean all the resources created by batch build', _yargs => {
      _yargs.positional('buildBatchArn', {
        describe: 'ARN of batch build',
        type: 'string',
        demandOption: '',
      });
    })
    .command('job <jobId>', 'clean all the resource created by a job', _yargs => {
      _yargs.positional('jobId', {
        describe: 'job id of the job',
        type: 'string',
      });
    })
    .help().argv;
  config();

  const filterPredicate = getFilterPredicate(args);
  const accounts = await getAccountsToCleanup();
  accounts.map((account, i) => {
    console.log(`${generateAccountInfo(account, i)} is under cleanup`);
  });
  await Promise.all(accounts.map((account, i) => cleanupAccount(account, i, filterPredicate)));
  console.log('Done cleaning all accounts!');
};

const printCleanupSummary = (): void => {
  console.log('\n=== Cleanup Summary ===');
  const totals = { apps: 0, stacks: 0, buckets: 0, roles: 0, skippedStacks: 0, skippedBuckets: 0, skippedAccounts: 0 };

  for (const s of cleanupSummaries) {
    const prefix = `[ACCOUNT ${s.accountIndex}][${s.accountId}]`;
    if (s.skippedReason) {
      console.log(`${prefix} Skipped (${s.skippedReason})`);
      totals.skippedAccounts++;
      continue;
    }
    const deleted = s.deletedApps + s.deletedStacks + s.deletedBuckets + s.deletedRoles;
    const skipped = s.skippedStacks + s.skippedBuckets;
    if (deleted === 0 && skipped === 0) {
      console.log(`${prefix} No resources to clean up`);
      continue;
    }
    const parts: string[] = [];
    if (s.deletedApps) parts.push(`${s.deletedApps} app${s.deletedApps !== 1 ? 's' : ''}`);
    if (s.deletedStacks) parts.push(`${s.deletedStacks} stack${s.deletedStacks !== 1 ? 's' : ''}`);
    if (s.deletedBuckets) parts.push(`${s.deletedBuckets} bucket${s.deletedBuckets !== 1 ? 's' : ''}`);
    if (s.deletedRoles) parts.push(`${s.deletedRoles} role${s.deletedRoles !== 1 ? 's' : ''}`);
    const skippedParts: string[] = [];
    if (s.skippedStacks) skippedParts.push(`${s.skippedStacks} stack${s.skippedStacks !== 1 ? 's' : ''} (in progress)`);
    if (s.skippedBuckets) skippedParts.push(`${s.skippedBuckets} bucket${s.skippedBuckets !== 1 ? 's' : ''} (not found)`);
    let line = `${prefix} Deleted: ${parts.length ? parts.join(', ') : 'none'}`;
    if (skippedParts.length) line += ` | Skipped: ${skippedParts.join(', ')}`;
    console.log(line);

    totals.apps += s.deletedApps;
    totals.stacks += s.deletedStacks;
    totals.buckets += s.deletedBuckets;
    totals.roles += s.deletedRoles;
    totals.skippedStacks += s.skippedStacks;
    totals.skippedBuckets += s.skippedBuckets;
  }

  const totalParts: string[] = [
    `${totals.apps} app${totals.apps !== 1 ? 's' : ''} deleted`,
    `${totals.stacks} stack${totals.stacks !== 1 ? 's' : ''} deleted`,
    `${totals.buckets} bucket${totals.buckets !== 1 ? 's' : ''} deleted`,
    `${totals.roles} role${totals.roles !== 1 ? 's' : ''} deleted`,
  ];
  const totalSkipped = totals.skippedStacks + totals.skippedBuckets + totals.skippedAccounts;
  if (totalSkipped) totalParts.push(`${totalSkipped} skipped`);
  console.log(`Total: ${totalParts.join(', ')}`);
  console.log('');
};

cleanup()
  .catch((e) => {
    console.log(`Cleanup encountered an error but completing gracefully: ${e.message}`);
  })
  .finally(() => {
    printCleanupSummary();
    process.exit(0);
  });
