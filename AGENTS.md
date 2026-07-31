# Agent Guidelines for amplify-codegen

## E2E Testing

### Overview

E2E tests run via AWS CodeBuild. The project uses a batch build that fans out into
multiple test suites. All tests must pass (100%) before a PR can be merged.

### Prerequisites

1. Copy `scripts/sample.env` to `scripts/.env` and fill in the account IDs (get these from your team lead):
   ```bash
   cp scripts/sample.env scripts/.env
   # Edit scripts/.env with your account values
   ```

2. Ensure you have valid credentials (`mwinit` or equivalent).

### Triggering E2E Tests

**For a PR:**
```bash
yarn cloud-pr
# Interactive: prompts for PR number
```

**For the current branch:**
```bash
yarn cloud-e2e
# Or directly:
./scripts/cloud-e2e.sh
```

**For a specific PR (non-interactive):**
```bash
./scripts/cloud-e2e.sh pr/1035
```

### Monitoring E2E Tests

After triggering, you'll get a batch ID like `amplify-codegen-e2e-workflow:abc123-...`.

**Check status:**
```bash
yarn e2e-status <batchId>
```

**Monitor with auto-retry (polls every 5 min, retries transient failures):**
```bash
yarn e2e-monitor <batchId>
# With custom max retries:
yarn e2e-monitor <batchId> 5
```

**List recent batches:**
```bash
yarn e2e-list
```

**View failed builds:**
```bash
yarn e2e-failed <batchId>
```

**View build logs:**
```bash
yarn e2e-logs <buildId>
```

**Retry failed builds manually:**
```bash
yarn e2e-retry <batchId>
```

### Process

1. **Trigger**: Run `yarn cloud-e2e` or `./scripts/cloud-e2e.sh pr/<number>`
2. **Monitor**: Run `yarn e2e-monitor <batchId>` — this polls every 5 minutes and auto-retries transient failures
3. **Verify**: 100% pass rate required. If failures persist after retries, investigate the logs with `yarn e2e-failed` and `yarn e2e-logs`
4. **Retry**: For persistent transient failures, use `yarn e2e-retry <batchId>`

### Important Notes

- Account IDs and credentials go in `scripts/.env` (gitignored), **never** in committed code
- The e2e profile is `AmplifyAPIE2EProd` with role `CodebuildDeveloper`
- Tests run in `us-east-1`
- Batch builds typically take 30-90 minutes depending on test count
- The monitor command exits with code 0 on success, 1 on failure

### Available CodeBuild Projects

- `amplify-codegen-e2e-workflow` — Full e2e test suite (used by `cloud-e2e`)
- `amplify-codegen-pr-workflow` — PR validation (used by `cloud-pr`)
- `amplify-codegen-cleanup-workflow` — Stale resource cleanup

### Debugging Failures

1. Get failed builds: `yarn e2e-failed <batchId>`
2. View logs: `yarn e2e-logs <buildId>`
3. Re-run with debug session: `yarn cloud-e2e-debug <batchId>`
4. Authenticate for manual AWS CLI use: `yarn authenticate-e2e-profile`
