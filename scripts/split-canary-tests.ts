import { sync } from 'globby';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as yaml from 'js-yaml';

const REPO_ROOT: string = join(__dirname, '..');
const CODEBUILD_CONFIG_PATH: string = join(REPO_ROOT, '.codebuild');
const CODEBUILD_CONFIG_BASE_PATH: string = join(CODEBUILD_CONFIG_PATH, 'canary_workflow_base.yml');

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
 * - amplify-codegen/scripts/split-e2e-tests.ts
 */
const SUPPORTED_REGIONS_PATH: string = join(REPO_ROOT, 'scripts', 'e2e-test-regions.json');
const AWS_REGIONS_TO_RUN_TESTS: string[] = JSON.parse(fs.readFileSync(SUPPORTED_REGIONS_PATH, 'utf-8')).map(region => region.name);

enum ComputeType {
  MEDIUM = 'BUILD_GENERAL1_MEDIUM',
  LARGE = 'BUILD_GENERAL1_LARGE',
}
type PlatformConfig = {
  platform: string;
  testName: string;
  metric: string;
  outputPath: string;
}
type JobConfig = {
  platformConfig: PlatformConfig;
  region: string;
  tsBuild: boolean;
};
type Job = {
  identifier: string;
  buildspec: string;
  env: {
    'compute-type': ComputeType;
    variables?: {
      TEST_SUITE: string;
      CLI_REGION: string;
      CANARY_METRIC_NAME: string;
      DISABLE_ESLINT_PLUGIN?: boolean;
    };
  };
  'depend-on': string[];
}

const saveConfig = (config: any, outputPath: string) => {
  const output = ['# auto generated file. DO NOT EDIT manually', yaml.dump(config, { noRefs: true })];
  // console.log(output.join('\n'));
  fs.writeFileSync(outputPath, output.join('\n'));
}

const getConfigBase = (): any => {
  return yaml.load(fs.readFileSync(CODEBUILD_CONFIG_BASE_PATH, 'utf8'));
}

const getOutputPath = (output: string) => {
  return join(CODEBUILD_CONFIG_PATH, output);
}

const getPlatformsConfig = (): PlatformConfig[] => {
  return [
    {
      platform: 'ts',
      testName: 'ts',
      metric: 'TsAppBuildCodegenSuccessRate',
      outputPath: getOutputPath('ts_canary_workflow.yml')
    },
    {
      platform: 'ios',
      testName: 'swift',
      metric: 'IosAppBuildCodegenSuccessRate',
      outputPath: getOutputPath('ios_canary_workflow.yml')
    },
    {
      platform: 'android',
      testName: 'android',
      metric: 'AndroidAppBuildCodegenSuccessRate',
      outputPath: getOutputPath('android_canary_workflow.yml')
    },
  ];
}

const getJobsForPlatformConfig = (platformConfig: PlatformConfig): Job[] => {
  return AWS_REGIONS_TO_RUN_TESTS.map(region =>
    getJob({
      platformConfig,
      region,
      tsBuild: platformConfig.platform === 'ts',
    }),
  );
}

const getJob = (jobConfig: JobConfig): Job => {
  return {
    identifier: getIdentifier(jobConfig),
    buildspec: getBuildspec(jobConfig),
    env: {
      'compute-type': ComputeType.LARGE,
      variables: {
        TEST_SUITE: getTestSuite(jobConfig),
        CLI_REGION: jobConfig.region,
        CANARY_METRIC_NAME: jobConfig.platformConfig.metric,
        ...(jobConfig.tsBuild && { DISABLE_ESLINT_PLUGIN: true }),
      }
    },
    'depend-on': ['publish_to_local_registry'],
  };
}

const getCleanupJob = (jobs: Job[]): Job => {
  return {
    identifier: 'cleanup_e2e_resources',
    buildspec: '.codebuild/cleanup_e2e_resources.yml',
    env: {
      'compute-type': ComputeType.MEDIUM,
    },
    'depend-on': [jobs[0].identifier],
  };
}

const getIdentifier = (jobConfig: JobConfig): string => {
  return `build_app_${jobConfig.platformConfig.platform}_${jobConfig.region.replace(/-/g, '_')}`
}

const getBuildspec = (jobConfig: JobConfig): string => {
  return `.codebuild/run_regionalized_${jobConfig.platformConfig.platform}_modelgen_e2e_test.yml`;
};

const getTestSuite = (jobConfig: JobConfig): string => {
  return `src/__tests__/build-app-${jobConfig.platformConfig.testName}.test.ts`;
};

const main = (): void => {
  const configBase: any = getConfigBase();
  const platformsConfig: PlatformConfig[] = getPlatformsConfig();

  const baseBuildJobs = configBase.batch['build-graph'];

  platformsConfig.forEach(platformsConfig => {
    const jobs = getJobsForPlatformConfig(platformsConfig);
    const cleanupJob = getCleanupJob(jobs);
    const currentBatch = [...baseBuildJobs, ...jobs, cleanupJob];

    configBase.batch['build-graph'] = currentBatch;
    saveConfig(configBase, platformsConfig.outputPath);

    console.log(`Successfully generated the buildspec at ${platformsConfig.outputPath}`);
    console.log(`Total number of splitted jobs: ${currentBatch.length}`);
    console.log(`Total number of regions: ${AWS_REGIONS_TO_RUN_TESTS.length}\n`);
  });
}

main();