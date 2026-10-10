#!/usr/bin/env ts-node

/**
 * E2E Test Management Script for amplify-codegen
 *
 * Usage:
 *   yarn e2e-status <buildBatchId>         - Show batch status
 *   yarn e2e-monitor <buildBatchId> [max]  - Monitor batch with auto-retry
 *   yarn e2e-retry <buildBatchId>          - Retry failed builds
 *   yarn e2e-list [limit]                  - List recent batches
 *   yarn e2e-failed <buildBatchId>         - Show failed builds
 *   yarn e2e-logs <buildId>               - Show build logs
 *
 * Prerequisites:
 *   - scripts/.env must exist with E2E_ACCOUNT_PROD set
 *   - Authenticate first: yarn authenticate-e2e-profile
 */

import {
  CodeBuildClient,
  BatchGetBuildBatchesCommand,
  ListBuildBatchesCommand,
  BatchGetBuildsCommand,
} from '@aws-sdk/client-codebuild';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { fromIni } from '@aws-sdk/credential-providers';
import * as process from 'process';
import { execSync } from 'child_process';

const E2E_PROFILE_NAME = 'AmplifyAPIE2EProd';
const REGION = 'us-east-1';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_RETRIES = 10;

const credentials = fromIni({ profile: E2E_PROFILE_NAME });
const codeBuild = new CodeBuildClient({ credentials, region: REGION });

type BuildStatus = 'FAILED' | 'FAULT' | 'IN_PROGRESS' | 'STOPPED' | 'SUCCEEDED' | 'TIMED_OUT';

interface BuildSummary {
  identifier: string;
  buildStatus: BuildStatus;
  buildId?: string;
}

interface BatchStatus {
  batchId: string;
  batchStatus: string;
  builds: BuildSummary[];
  failedBuilds: BuildSummary[];
  inProgressBuilds: BuildSummary[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const authenticate = () => {
  try {
    execSync(
      'source ./scripts/.env && ada cred update --profile=AmplifyAPIE2EProd --account=$E2E_ACCOUNT_PROD --role=CodebuildDeveloper --provider=isengard --once',
      { shell: '/bin/bash' },
    );
  } catch (error) {
    console.warn('⚠️  Authentication failed. Make sure you have run mwinit and scripts/.env is configured.');
  }
};

const getBatchStatus = async (batchId: string): Promise<BatchStatus> => {
  const { buildBatches } = await codeBuild.send(new BatchGetBuildBatchesCommand({ ids: [batchId] }));

  if (!buildBatches || buildBatches.length === 0) {
    throw new Error(`Build batch ${batchId} not found`);
  }

  const batch = buildBatches[0];
  const builds: BuildSummary[] = (batch.buildGroups || []).map((group) => ({
    identifier: group.identifier || 'unknown',
    buildStatus: (group.currentBuildSummary?.buildStatus as BuildStatus) || 'IN_PROGRESS',
    buildId: group.currentBuildSummary?.arn?.split('/').pop(),
  }));

  const failedBuilds = builds.filter((b) => ['FAILED', 'FAULT', 'TIMED_OUT'].includes(b.buildStatus));
  const inProgressBuilds = builds.filter((b) => b.buildStatus === 'IN_PROGRESS');

  return {
    batchId,
    batchStatus: batch.buildBatchStatus || 'UNKNOWN',
    builds,
    failedBuilds,
    inProgressBuilds,
  };
};

const printStatus = (status: BatchStatus, compact: boolean = false): void => {
  console.log(`\n=== Batch Status: ${status.batchId} ===`);
  console.log(`Overall: ${status.batchStatus}`);
  console.log(`Total Builds: ${status.builds.length}`);
  console.log(`Succeeded: ${status.builds.filter((b) => b.buildStatus === 'SUCCEEDED').length}`);
  console.log(`Failed: ${status.failedBuilds.length}`);
  console.log(`In Progress: ${status.inProgressBuilds.length}`);

  if (status.failedBuilds.length > 0) {
    console.log('\n❌ Failed Builds:');
    status.failedBuilds.forEach((build) => {
      console.log(`  - ${build.identifier}: ${build.buildStatus}`);
      if (build.buildId) {
        console.log(`    Logs: yarn e2e-logs ${build.buildId}`);
      }
    });
  }

  if (status.inProgressBuilds.length > 0) {
    console.log('\n🏃 In Progress:');
    const displayCount = compact ? Math.min(5, status.inProgressBuilds.length) : status.inProgressBuilds.length;
    status.inProgressBuilds.slice(0, displayCount).forEach((build) => {
      console.log(`  - ${build.identifier}`);
    });
    if (compact && status.inProgressBuilds.length > 5) {
      console.log(`  ... and ${status.inProgressBuilds.length - 5} more`);
    }
  }
};

const retryFailedBuilds = async (batchId: string): Promise<string | undefined> => {
  const status = await getBatchStatus(batchId);
  const failedBuildIds = status.failedBuilds.filter((build) => build.buildId).map((build) => build.buildId!);

  if (failedBuildIds.length === 0) {
    console.log('✅ No failed builds found to retry');
    return undefined;
  }

  console.log(`Retrying ${failedBuildIds.length} failed builds...`);

  try {
    const result = execSync(
      `aws codebuild retry-build-batch --region=${REGION} --profile=${E2E_PROFILE_NAME} --id="${batchId}"`,
      { encoding: 'utf8', stdio: 'pipe' },
    );

    const output = JSON.parse(result);
    const newBatchId = output.buildBatch?.id;

    if (newBatchId) {
      console.log(`✅ Retry triggered. Batch ID: ${newBatchId}`);
      return newBatchId;
    } else {
      console.error('❌ Could not extract batch ID from retry response');
      return undefined;
    }
  } catch (error: any) {
    console.error(`❌ Failed to retry batch:`, error.message);
    return undefined;
  }
};

const listRecentBatches = async (limit: number = 20): Promise<void> => {
  console.log(`🔍 Fetching ${limit} most recent build batches...`);

  const result = await codeBuild.send(
    new ListBuildBatchesCommand({
      maxResults: Math.min(limit * 2, 100),
      sortOrder: 'DESCENDING',
    }),
  );

  if (!result.ids || result.ids.length === 0) {
    console.log('No build batches found');
    return;
  }

  const { buildBatches } = await codeBuild.send(
    new BatchGetBuildBatchesCommand({ ids: result.ids.slice(0, limit) }),
  );

  if (!buildBatches || buildBatches.length === 0) {
    console.log('No build batch details found');
    return;
  }

  console.log(`\n=== Recent Build Batches ===`);
  for (const batch of buildBatches) {
    const startTime = batch.startTime ? new Date(batch.startTime).toLocaleString() : 'Unknown';
    const batchStatus = batch.buildBatchStatus || 'Unknown';
    const buildCount = batch.buildGroups?.length || 0;
    const branch = batch.sourceVersion || 'Unknown';

    console.log(`${batch.id}`);
    console.log(`  Branch: ${branch}`);
    console.log(`  Status: ${batchStatus}`);
    console.log(`  Started: ${startTime}`);
    console.log(`  Builds: ${buildCount}`);
    console.log('');
  }
};

const getFailedBuilds = async (batchId: string): Promise<void> => {
  const status = await getBatchStatus(batchId);

  console.log(`\n=== Failed Builds for Batch: ${batchId} ===`);

  if (status.failedBuilds.length === 0) {
    console.log('✅ No failed builds found');
    return;
  }

  console.log(`❌ Found ${status.failedBuilds.length} failed builds:\n`);

  for (const build of status.failedBuilds) {
    console.log(`Build: ${build.identifier}`);
    console.log(`  Status: ${build.buildStatus}`);
    if (build.buildId) {
      console.log(`  Build ID: ${build.buildId}`);
      console.log(`  Logs: yarn e2e-logs ${build.buildId}`);
    }
    console.log('');
  }
};

const getBuildLogs = async (buildId: string): Promise<void> => {
  console.log(`📋 Fetching logs for build: ${buildId}`);

  try {
    const { builds } = await codeBuild.send(new BatchGetBuildsCommand({ ids: [buildId] }));

    if (!builds || builds.length === 0) {
      console.log('❌ Build not found');
      return;
    }

    const build = builds[0];
    const logGroup = build.logs?.groupName;
    const logStream = build.logs?.streamName;

    if (!logGroup || !logStream) {
      console.log('❌ No logs available for this build');
      return;
    }

    console.log(`\n=== Build Information ===`);
    console.log(`Build ID: ${buildId}`);
    console.log(`Status: ${build.buildStatus}`);
    console.log(`Project: ${build.projectName}`);
    console.log(`Log Group: ${logGroup}`);
    console.log(`Log Stream: ${logStream}`);

    const cloudWatchLogs = new CloudWatchLogsClient({
      region: REGION,
      credentials: fromIni({ profile: E2E_PROFILE_NAME }),
    });

    console.log(`\n=== Log Output ===`);

    try {
      let allEvents: any[] = [];
      let nextToken: string | undefined;
      let pageCount = 0;

      do {
        pageCount++;
        const params: any = {
          logGroupName: logGroup,
          logStreamName: logStream,
          startFromHead: true,
          limit: 10000,
        };

        if (nextToken) {
          params.nextToken = nextToken;
        }

        const response = await cloudWatchLogs.send(new GetLogEventsCommand(params));

        if (response.events && response.events.length > 0) {
          allEvents = allEvents.concat(response.events);
        }

        // Prevent infinite loops
        if (nextToken === response.nextForwardToken) {
          break;
        }
        nextToken = response.nextForwardToken;

        if (pageCount > 100) {
          console.log(`⚠️  Reached page limit, stopping pagination`);
          break;
        }
      } while (nextToken);

      console.log(`\n📊 Total log events: ${allEvents.length}\n`);

      for (const event of allEvents) {
        process.stdout.write(event.message || '');
      }
    } catch (error: any) {
      console.log('❌ Could not fetch logs via SDK:', error.message);
      console.log(`\nFallback command:`);
      console.log(
        `aws logs get-log-events --region=${REGION} --profile=${E2E_PROFILE_NAME} --log-group-name="${logGroup}" --log-stream-name="${logStream}" --limit=10000 --query="events[*].message" --output=text`,
      );
    }
  } catch (error: any) {
    console.error('❌ Error fetching build:', error.message);
  }
};

const monitorBatch = async (batchId: string, maxRetries: number = DEFAULT_MAX_RETRIES): Promise<void> => {
  let retryCount = 0;

  console.log(`🔍 Monitoring batch: ${batchId}`);
  console.log(`📊 Max retries: ${maxRetries}`);
  console.log(`⏰ Poll interval: ${POLL_INTERVAL_MS / 1000 / 60} minutes\n`);

  while (retryCount <= maxRetries) {
    const status = await getBatchStatus(batchId);
    console.log(`\n🔄 Check (retry ${retryCount}/${maxRetries}) @ ${new Date().toLocaleTimeString()}`);
    printStatus(status, true);

    // Check if batch is complete
    if (!['IN_PROGRESS', 'SUBMITTED'].includes(status.batchStatus)) {
      if (status.failedBuilds.length === 0) {
        console.log('\n✅ All builds succeeded!');
        return;
      }

      // High failure rate means something is fundamentally broken
      const failureRate = status.failedBuilds.length / status.builds.length;
      if (failureRate > 0.5) {
        console.log(
          `\n🚫 Failure rate too high (${(failureRate * 100).toFixed(1)}% - ${status.failedBuilds.length}/${status.builds.length})`,
        );
        console.log('Skipping retries - this likely requires investigation.');
        process.exit(1);
      }

      if (retryCount >= maxRetries) {
        console.log(`\n❌ Max retries (${maxRetries}) reached.`);
        console.log(`Final failed builds: ${status.failedBuilds.length}`);
        process.exit(1);
      }

      // Don't retry build/lint failures
      const skipRetryJobs = ['build_linux', 'build_windows', 'test', 'lint'];
      if (status.failedBuilds.length === 1 && skipRetryJobs.includes(status.failedBuilds[0].identifier)) {
        console.log(`\n🚫 Skipping retry for ${status.failedBuilds[0].identifier} - not a transient failure.`);
        process.exit(1);
      }

      console.log(`\n🔄 Retrying ${status.failedBuilds.length} failed builds (attempt ${retryCount + 1}/${maxRetries})`);

      try {
        await retryFailedBuilds(batchId);
        retryCount++;
      } catch (error) {
        console.error('Failed to retry builds:', error);
        process.exit(1);
      }
    }

    console.log(`\n⏳ Waiting ${POLL_INTERVAL_MS / 1000 / 60} minutes...`);
    await sleep(POLL_INTERVAL_MS);
  }
};

const main = async (): Promise<void> => {
  const [command, arg1, arg2] = process.argv.slice(2);

  if (!command) {
    console.error('E2E Test Manager for amplify-codegen\n');
    console.error('Usage: yarn ts-node scripts/e2e-test-manager.ts <command> [args...]\n');
    console.error('Commands:');
    console.error('  status <batchId>            - Show batch status');
    console.error('  monitor <batchId> [retries] - Monitor with auto-retry (default: 10 retries)');
    console.error('  retry <batchId>             - Retry failed builds');
    console.error('  list [limit]                - List recent batches (default: 20)');
    console.error('  failed <batchId>            - Show failed builds with log commands');
    console.error('  logs <buildId>              - Show build logs');
    console.error('\nExamples:');
    console.error('  yarn e2e-status amplify-codegen-e2e-workflow:abc123');
    console.error('  yarn e2e-monitor amplify-codegen-e2e-workflow:abc123');
    console.error('  yarn e2e-monitor amplify-codegen-e2e-workflow:abc123 5');
    process.exit(1);
  }

  // Authenticate before running commands
  authenticate();

  try {
    switch (command) {
      case 'status':
        if (!arg1) {
          console.error('Error: batchId required');
          process.exit(1);
        }
        printStatus(await getBatchStatus(arg1));
        break;

      case 'monitor':
        if (!arg1) {
          console.error('Error: batchId required');
          process.exit(1);
        }
        await monitorBatch(arg1, arg2 ? parseInt(arg2, 10) : DEFAULT_MAX_RETRIES);
        break;

      case 'retry':
        if (!arg1) {
          console.error('Error: batchId required');
          process.exit(1);
        }
        await retryFailedBuilds(arg1);
        break;

      case 'list':
        await listRecentBatches(arg1 ? parseInt(arg1, 10) : 20);
        break;

      case 'failed':
        if (!arg1) {
          console.error('Error: batchId required');
          process.exit(1);
        }
        await getFailedBuilds(arg1);
        break;

      case 'logs':
        if (!arg1) {
          console.error('Error: buildId required');
          process.exit(1);
        }
        await getBuildLogs(arg1);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}
