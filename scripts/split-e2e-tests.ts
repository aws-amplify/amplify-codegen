import * as glob from 'glob';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as yaml from 'js-yaml';

// Ensure to update packages/amplify-codegen-e2e-tests/src/cleanup-e2e-resources.ts is also updated this gets updated
const AWS_REGIONS_TO_RUN_TESTS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
];

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
];
const DEBUG_FLAG = '--debug';

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
  return glob.sync(pattern, { cwd: dir });
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
  const region = AWS_REGIONS_TO_RUN_TESTS[jobIdx % AWS_REGIONS_TO_RUN_TESTS.length];
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
  const getIdentifier = (os: string, names: string) => {
    const jobName = `${names.replace(/-/g, '_')}`.substring(0, 127);
    return jobName;
  };
  const result: any[] = [];
  linuxJobs.forEach((j) => {
    if (j.tests.length !== 0) {
      const names = j.tests.map((tn) => getTestNameFromPath(tn)).join('_');
      const tmp = {
        ...JSON.parse(JSON.stringify(baseJobLinux)), // deep clone base job
        identifier: getIdentifier(j.os, names),
      };
      tmp.env.variables = {};
      tmp.env.variables.TEST_SUITE = j.tests.join('|');
      tmp.env.variables.CLI_REGION = j.region;
      if (j.useParentAccount) {
        tmp.env.variables.USE_PARENT_ACCOUNT = 1;
      }
      if (j.runSolo) {
        tmp.env['compute-type'] = 'BUILD_GENERAL1_LARGE';
      }
      result.push(tmp);
    }
  });
  return result;
};

function main(): void {
  const filteredTests = process.argv.slice(2);
  const configBase: any = loadConfigBase();
  const baseBuildGraph = configBase.batch['build-graph'];
  const splitE2ETests = splitTests(
    {
      identifier: 'run_e2e_tests',
      buildspec: '.codebuild/run_e2e_tests.yml',
      env: {
        'compute-type': 'BUILD_GENERAL1_LARGE',
      },
      'depend-on': ['publish_to_local_registry'],
    },
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
