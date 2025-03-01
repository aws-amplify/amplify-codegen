import { sync } from 'globby';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as yaml from 'js-yaml';

// some tests require additional time, the parent account can handle longer tests (up to 90 minutes)
const USE_PARENT_ACCOUNT = [];
const REPO_ROOT = join(__dirname, '..');
const TEST_TIMINGS_PATH = join(REPO_ROOT, 'scripts', 'test-timings.data.json');
const CODEBUILD_CONFIG_BASE_PATH = join(REPO_ROOT, '.codebuild', 'e2e_workflow_base.yml');
const CODEBUILD_GENERATE_CONFIG_PATH = join(REPO_ROOT, '.codebuild', 'e2e_workflow.yml');
const CODEBUILD_DEBUG_CONFIG_PATH = join (REPO_ROOT, '.codebuild', 'debug_workflow.yml');
const RUN_SOLO = [];
const EXCLUDE_TESTS = [
  'src/__tests__/build-app-swift.test.ts',
  'src/__tests__/build-app-android.test.ts',
  'src/__tests__/codegen-matrix.test.ts',
  'src/__tests__/graphql-generator-gen2.test.ts'
];
const DEBUG_FLAG = '--debug';

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
 */
const SUPPORTED_REGIONS_PATH: string = join(REPO_ROOT, 'scripts', 'e2e-test-regions.json');
const AWS_REGIONS_TO_RUN_TESTS: string[] = JSON.parse(fs.readFileSync(SUPPORTED_REGIONS_PATH, 'utf-8')).map(region => region.name);

export function loadConfigBase() {
  return yaml.load(fs.readFileSync(CODEBUILD_CONFIG_BASE_PATH, 'utf8'));
}
export function saveConfig(config: any, outputPath: string): void {
  const output = ['# auto generated file. DO NOT EDIT manually', yaml.dump(config, { noRefs: true })];
  fs.writeFileSync(outputPath, output.join('\n'));
}
export function loadTestTimings(): { timingData: { test: string; medianRuntime: number }[] } {
  return JSON.parse(fs.readFileSync(TEST_TIMINGS_PATH, 'utf-8'));
}
function getTestFiles(dir: string, pattern = 'src/**/*.test.ts'): string[] {
  return sync(pattern, { cwd: dir });
}
type COMPUTE_TYPE = 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';
type BatchBuildJob = {
  identifier: string;
  env: {
    'compute-type': COMPUTE_TYPE;
    variables: [string: string];
  };
};
type ConfigBase = {
  batch: {
    'build-graph': BatchBuildJob[];
    'fast-fail': boolean;
  };
  env: {
    'compute-type': COMPUTE_TYPE;
    shell: 'bash';
    variables: [string: string];
  };
};
const MAX_WORKERS = 4;
type OS_TYPE = 'w' | 'l';
type CandidateJob = {
  region: string;
  os: OS_TYPE;
  tests: string[];
  useParentAccount: boolean;
  runSolo: boolean;
};
const createJob = (os: OS_TYPE, jobIdx: number, runSolo: boolean = false): CandidateJob => {
  // The bash terminal for Windows on CodeBuild is non-interactive.
  // amplify-configure will always choose us-east-1 for the region.
  // This will set all Windows jobs to use us-east-1 to avoid region mismatch.
  // We will come back to this later to properly fix the testing issue.
  const region = os === 'w' ? 'us-east-1' : AWS_REGIONS_TO_RUN_TESTS[jobIdx % AWS_REGIONS_TO_RUN_TESTS.length];
  return {
    region,
    os,
    tests: [],
    useParentAccount: false,
    runSolo,
  };
};
const getTestNameFromPath = (testSuitePath: string): string => {
  const startIndex = testSuitePath.lastIndexOf('/') + 1;
  const endIndex = testSuitePath.lastIndexOf('.test');
  return testSuitePath
    .substring(startIndex, endIndex)
    .split('.e2e')
    .join('')
    .split('.')
    .join('-');
};
const splitTests = (
  baseJobLinux: any,
  baseJobWindows: any,
  testDirectory: string,
  pickTests?: ((testSuites: string[]) => string[]),
) => {
  const output: any[] = [];
  let testSuites = getTestFiles(testDirectory);
  if (pickTests && typeof pickTests === 'function') {
    testSuites = pickTests(testSuites);
  }
  if (testSuites.length === 0) {
    return output;
  }
  const testFileRunTimes = loadTestTimings().timingData;

  testSuites.sort((a, b) => {
    const runtimeA = testFileRunTimes.find((t:any) => t.test === a)?.medianRuntime ?? 30;
    const runtimeB = testFileRunTimes.find((t:any) => t.test === b)?.medianRuntime ?? 30;
    return runtimeA - runtimeB;
  });
  const generateJobsForOS = (os: OS_TYPE) => {
    const soloJobs: CandidateJob[] = [];
    let jobIdx = 0;
    const osJobs = [createJob(os, jobIdx)];
    jobIdx++;
    for (let test of testSuites) {
      const currentJob = osJobs[osJobs.length - 1];

      const USE_PARENT = USE_PARENT_ACCOUNT.some((usesParent) => test.startsWith(usesParent));

      if (RUN_SOLO.find((solo) => test === solo)) {
        const newSoloJob = createJob(os, jobIdx, true);
        jobIdx++;
        newSoloJob.tests.push(test);

        if (USE_PARENT) {
          newSoloJob.useParentAccount = true;
        }
        soloJobs.push(newSoloJob);
        continue;
      }

      // add the test
      currentJob.tests.push(test);

      if (USE_PARENT) {
        currentJob.useParentAccount = true;
      }

      // create a new job once the current job is full;
      if (currentJob.tests.length >= MAX_WORKERS) {
        osJobs.push(createJob(os, jobIdx));
        jobIdx++;
      }
    }
    return [...osJobs, ...soloJobs];
  };
  const linuxJobs = generateJobsForOS('l');
  const windowsJobs = generateJobsForOS('w');
  const result: any[] = [];
  linuxJobs.forEach((j) => {
    if (j.tests.length !== 0) {
      result.push(basicE2EJob(j, baseJobLinux));
    }
  });
  windowsJobs.forEach((j) => {
    if (j.tests.length !== 0) {
      result.push(basicE2EJob(j, baseJobWindows));
    }
  });

  return result;
};

function basicE2EJob(inputJob: any, baseJob: string) {
  const names = inputJob.tests.map((tn) => getTestNameFromPath(tn)).join('_');
  const job = {
    ...JSON.parse(JSON.stringify(baseJob)), // deep clone base job
    identifier: getIdentifier(inputJob.os, names),
  };
  job.env.variables = {};
  job.env.variables.TEST_SUITE = inputJob.tests.join('|');
  job.env.variables.CLI_REGION = inputJob.region;
  if (inputJob.tests.includes('src/__tests__/build-app-ts.test.ts')) {
    job.env.variables.DISABLE_ESLINT_PLUGIN = true;
  }
  if (inputJob.useParentAccount) {
    job.env.variables.USE_PARENT_ACCOUNT = 1;
  }
  if (inputJob.runSolo) {
    job.env['compute-type'] = 'BUILD_GENERAL1_LARGE';
  }
  return job;
}

function getIdentifier(os: string, names: string) {
  const jobName = `${os}_${names.replace(/-/g, '_')}`.substring(0, 127);
  return jobName;
};

function main(): void {
  const filteredTests = process.argv.slice(2);
  const configBase: any = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];
  const baseJobLinux = {
    identifier: 'run_e2e_tests',
    buildspec: '.codebuild/run_e2e_tests.yml',
    env: {
      'compute-type': 'BUILD_GENERAL1_LARGE',
    },
    'depend-on': ['publish_to_local_registry'],
  };
  const baseJobWindows = {
    identifier: 'run_e2e_tests',
    buildspec: '.codebuild/run_e2e_tests_windows.yml',
    env: {
      'compute-type': 'BUILD_GENERAL1_LARGE',
      image: '$WINDOWS_IMAGE_2019',
      type: 'WINDOWS_SERVER_2019_CONTAINER',
    },
    'depend-on': ['publish_to_local_registry', 'build_windows'],
  };

  const splitE2ETests = splitTests(
    baseJobLinux,
    baseJobWindows,
    join(REPO_ROOT, 'packages', 'amplify-codegen-e2e-tests'),
    (testSuites) => testSuites.filter((ts) => !EXCLUDE_TESTS.includes(ts)),
  );

  let outputPath = CODEBUILD_GENERATE_CONFIG_PATH;
  let allBuilds = [...splitE2ETests];
  if (filteredTests.length > 0) {
    allBuilds = allBuilds.filter(build => filteredTests.includes(build.identifier));
    if (filteredTests.includes(DEBUG_FLAG)) {
      allBuilds = allBuilds.map(build => {
        return { ...build, 'debug-session': true}
      });
      outputPath = CODEBUILD_DEBUG_CONFIG_PATH;
    }
  }
  const cleanupResources = {
    identifier: 'cleanup_e2e_resources',
    buildspec: '.codebuild/cleanup_e2e_resources.yml',
    env: {
      'compute-type': 'BUILD_GENERAL1_MEDIUM'
    },
    'depend-on': allBuilds.length > 0 ? [allBuilds[0].identifier] : ['publish_to_local_registry'],
  }
  console.log(`Total number of splitted jobs: ${allBuilds.length}`)
  let currentBatch = [...baseBuildGraph, ...allBuilds, cleanupResources];
  configBase.batch['build-graph'] = currentBatch;
  saveConfig(configBase, outputPath);
  console.log(`Successfully generated the buildspec at ${outputPath}`);
}

main();
