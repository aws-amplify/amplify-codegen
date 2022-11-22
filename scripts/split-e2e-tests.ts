import * as yaml from 'js-yaml';
import * as glob from 'glob';
import { join } from 'path';
import * as fs from 'fs-extra';
const CONCURRENCY = 4;
// Ensure to update packages/amplify-codegen-e2e-tests/src/cleanup-e2e-resources.ts is also updated this gets updated
const AWS_REGIONS_TO_RUN_TESTS = [
  'us-east-2',
  'us-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
];

// This array needs to be update periodically when new tests suites get added
// or when a test suite changes drastically

const KNOWN_SUITES_SORTED_ACCORDING_TO_RUNTIME = [
  // <7m
  'src/__tests__/graphql-codegen-ios.test.ts',
  'src/__tests__/graphql-codegen-js.test.ts',
  'src/__tests__/graphql-codegen-android.test.ts',
  'src/__tests__/configure-codegen-js.test.ts',
  'src/__tests__/configure-codegen-android.test.ts',
  'src/__tests__/configure-codegen-ios.test.ts',
  'src/__tests__/feature-flags.test.ts',
  'src/__tests__/remove-codegen-js.test.ts',
  'src/__tests__/remove-codegen-ios.test.ts',
  'src/__tests__/remove-codegen-android.test.ts',
  'src/__tests__/datastore-modelgen-js.test.ts',
  'src/__tests__/datastore-modelgen-android.test.ts',
  'src/__tests__/datastore-modelgen-ios.test.ts',
  'src/__tests__/datastore-modelgen-flutter.test.ts',
  'src/__tests__/add-codegen-android.test.ts',
  'src/__tests__/add-codegen-ios.test.ts',
  'src/__tests__/model-introspection-codegen.test.ts',
  // <11m
  'src/__tests__/add-codegen-js.test.ts',
  'src/__tests__/env-codegen.test.ts',
  // <12m
  'src/__tests__/pull-codegen.test.ts',
  // <14m
  'src/__tests__/push-codegen-js.test.ts',
  'src/__tests__/push-codegen-android.test.ts',
  'src/__tests__/push-codegen-ios.test.ts',

  // <18m
  'src/__tests__/build-app-ts.test.ts',
  'src/__tests__/build-app-swift.test.ts',
];

const runSuitesOnMacOS = new Set(['src/__tests__/build-app-swift.test.ts']);

/**
 * Sorts the test suite in ascending order. If the test is not included in known
 * tests it would be inserted at the begining of the array
 * @param tesSuites an array of test suites
 */
function sortTestsBasedOnTime(tesSuites: string[]): string[] {
  return tesSuites.sort((a, b) => {
    const aIndx = KNOWN_SUITES_SORTED_ACCORDING_TO_RUNTIME.indexOf(a);
    const bIndx = KNOWN_SUITES_SORTED_ACCORDING_TO_RUNTIME.indexOf(b);
    return aIndx - bIndx;
  });
}

export type WorkflowJob =
  | {
      [name: string]: {
        requires?: string[];
      };
    }
  | string;

export type CircleCIConfig = {
  jobs: {
    [name: string]: {
      steps: Record<string, any>;
      environment: Record<string, string>;
    };
  };
  workflows: {
    [workflowName: string]: {
      jobs: WorkflowJob[];
    };
  };
};

function getTestFiles(dir: string, pattern = 'src/**/*.test.ts'): string[] {
  return sortTestsBasedOnTime(glob.sync(pattern, { cwd: dir })).reverse();
}

function generateJobName(baseName: string, testSuitePath: string): string {
  return `${testSuitePath
    .replace('src/', '')
    .replace('__tests__/', '')
    .replace(/test\.ts$/, '')
    .replace(/\//g, '-')
    .replace(/\./g, '-')}${baseName}`;
}

/**
 * Takes a CircleCI config and converts each test inside that job into a separate
 * job.
 * @param config - CircleCI config
 * @param jobName - job that should be split
 * @param workflowName - workflow name where this job is run
 * @param jobRootDir - Directory to scan for test files
 * @param concurrency - Number of parallel jobs to run
 */
function splitTests(
  config: Readonly<CircleCIConfig>,
  jobName: string,
  workflowName: string,
  jobRootDir: string,
  concurrency: number = CONCURRENCY,
): CircleCIConfig {
  const output: CircleCIConfig = { ...config };
  const jobs = { ...config.jobs };
  const baseJob = jobs[jobName];
  const macOSJob = jobs[`${jobName}-macos`];
  const testSuites = getTestFiles(jobRootDir);

  const newJobs = testSuites.reduce((acc, suite, index) => {
    const job = runSuitesOnMacOS.has(suite) ? macOSJob : baseJob;
    const runOnMacOS = runSuitesOnMacOS.has(suite);
    const testRegion = AWS_REGIONS_TO_RUN_TESTS[index % AWS_REGIONS_TO_RUN_TESTS.length];
    const newJob = {
      ...job,
      environment: {
        ...job.environment,
        TEST_SUITE: suite,
        CLI_REGION: testRegion,
      },
    };
    const newJobName = generateJobName(jobName, suite);
    return { ...acc, [newJobName]: newJob };
  }, {});

  // Spilt jobs by region
  const jobByRegion = Object.entries(newJobs).reduce((acc, entry: [string, any]) => {
    const [jobName, job] = entry;
    const region = job?.environment?.CLI_REGION;
    const regionJobs = { ...acc[region], [jobName]: job };
    return { ...acc, [region]: regionJobs };
  }, {});

  const workflows = { ...config.workflows };

  if (workflows[workflowName]) {
    const workflow = workflows[workflowName];

    const workflowJob = workflow.jobs.find(j => {
      if (typeof j === 'string') {
        return j === jobName;
      } else {
        const name = Object.keys(j)[0];
        return name === jobName;
      }
    });

    if (workflowJob) {
      Object.values(jobByRegion).forEach(regionJobs => {
        const newJobNames = Object.keys(regionJobs);
        const jobs = newJobNames.map((newJobName, index) => {
          const requires = getRequiredJob(newJobNames, index, concurrency);
          if (typeof workflowJob === 'string') {
            return newJobName;
          } else {
            return {
              [newJobName]: {
                ...Object.values(workflowJob)[0],
                requires: [...(requires ? [requires] : workflowJob[jobName].requires || [])],
              },
            };
          }
        });
        workflow.jobs = [...workflow.jobs, ...jobs];
      });

      const lastJobBatch = Object.values(jobByRegion)
        .map(regionJobs => getLastBatchJobs(Object.keys(regionJobs), concurrency))
        .reduce((acc, val) => acc.concat(val), []);
      const filteredJobs = replaceWorkflowDependency(removeWorkflowJob(workflow.jobs, jobName), jobName, lastJobBatch);
      workflow.jobs = filteredJobs;
    }
    output.workflows = workflows;
  }
  output.jobs = {
    ...output.jobs,
    ...newJobs,
  };
  return output;
}

/**
 * CircleCI workflow can have multiple jobs. This helper function removes the jobName from the workflow
 * @param jobs - All the jobs in workflow
 * @param jobName - job that needs to be removed from workflow
 */
function removeWorkflowJob(jobs: WorkflowJob[], jobName: string): WorkflowJob[] {
  return jobs.filter(j => {
    if (typeof j === 'string') {
      return j !== jobName;
    } else {
      const name = Object.keys(j)[0];
      return name !== jobName;
    }
  });
}

/**
 *
 * @param jobs array of job names
 * @param concurrency number of concurrent jobs
 */
function getLastBatchJobs(jobs: string[], concurrency: number): string[] {
  const lastBatchJobLength = Math.min(concurrency, jobs.length);
  const lastBatchJobNames = jobs.slice(jobs.length - lastBatchJobLength);
  return lastBatchJobNames;
}

/**
 * A job in workflow can require some other job in the workflow to be finished before executing
 * This helper method finds and replaces jobName with jobsToReplacesWith
 * @param jobs - Workflow jobs
 * @param jobName - job to remove from requires
 * @param jobsToReplaceWith - jobs to add to requires
 */
function replaceWorkflowDependency(jobs: WorkflowJob[], jobName: string, jobsToReplaceWith: string[]): WorkflowJob[] {
  return jobs.map(j => {
    if (typeof j === 'string') return j;
    const [currentJobName, jobObj] = Object.entries(j)[0];
    const requires = jobObj.requires || [];
    if (requires.includes(jobName)) {
      jobObj.requires = [...requires.filter(r => r !== jobName), ...jobsToReplaceWith];
    }
    return {
      [currentJobName]: jobObj,
    };
  });
}

/**
 * Helper function that creates requires block for jobs to limit the concurrency of jobs in circle ci
 * @param jobNames - An array of jobs
 * @param index - current index of the job
 * @param concurrency - number of parallel jobs allowed
 */
function getRequiredJob(jobNames: string[], index: number, concurrency: number = 4): string | void {
  const mod = index % concurrency;
  const mult = Math.floor(index / concurrency);
  if (mult > 0) {
    const prevIndex = (mult - 1) * concurrency + mod;
    return jobNames[prevIndex];
  }
}

function loadConfig(): CircleCIConfig {
  const configFile = join(process.cwd(), '.circleci', 'config.base.yml');
  return <CircleCIConfig>yaml.load(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(config: CircleCIConfig): void {
  const configFile = join(process.cwd(), '.circleci', 'config.yml');
  const output = ['# auto generated file. Edit config.base.yaml if you want to change', yaml.dump(config)];
  fs.writeFileSync(configFile, output.join('\n'));
}
function main(): void {
  const config = loadConfig();
  const splitNodeTests = splitTests(
    config,
    'e2e-test',
    'build_test_deploy',
    join(process.cwd(), 'packages', 'amplify-codegen-e2e-tests'),
    CONCURRENCY,
  );
  saveConfig(splitNodeTests);
}
main();
