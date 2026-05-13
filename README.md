# BlamLess

Stop manual retries. Detect GitHub infrastructure failures automatically.

GitHub Actions can be flaky. Infrastructure incidents, runner outages, and network blips often cause workflows to fail through no fault of your code. BlamLess automatically detects if a workflow failure was caused by a documented GitHub incident and triggers an immediate retry—keeping your PRs moving without human intervention.

## How it Works

1. Failure Detection: Runs only when a previous step in your workflow fails.
2. Incident Audit: Queries the official GitHub Status API for active incidents affecting Actions.
3. Smart Replay: If an incident is active, it triggers an automatic re-run of the failed jobs.
4. PR Communication: Posts a professional status report on your Pull Request with links to the incident and the new run.
5. Safety First: Respects a max-retries limit to prevent infinite loops on broken code.

## Usage

Add BlamLess as the last step in any workflow you want to protect.

```yaml
name: CI
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      actions: write       # To trigger re-runs
      issues: write        # To post PR comments
      pull-requests: write # To read PR data
    
    steps:
      - uses: actions/checkout@v4

      - name: BlamLess Retry
        if: failure()
        uses: nirjxr26/BlamLess@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

| Input | Description | Default |
|---|---|---|
| github-token | GitHub token with actions:write and issues:write | ${{ github.token }} |
| max-retries | Max number of auto-retries allowed per PR | 1 |
| post-comment | Post a comment on the PR explaining the retry | true |
| dry-run | Log logic without actually triggering a retry | false |

## Outputs

| Output | Description |
|---|---|
| was-incident | true if a GitHub Actions incident was detected |
| retried | true if the workflow was actually retried |
| incident-name | The name of the detected GitHub incident |
| new-run-id | The ID of the newly triggered workflow run |

---

## Example output

These are the messages and outputs you should expect to see in GitHub Actions logs.

### 1. No active incident

When GitHub is healthy, BlamLess stops and clearly says the failure is most likely your code:

```text
No active GitHub Actions incident detected. Failure is likely a code issue.
```

Outputs:

| Output | Value |
|---|---|
| was-incident | false |
| retried | false |
| incident-name |  |
| incident-severity | none |
| incident-shortlink |  |
| incidents-found | false |
| incidents-summary |  |

### 2. Active incident detected

When GitHub Actions is affected, BlamLess classifies it, retries the run, and exposes the details:

```text
GitHub Actions incident detected: Actions degraded performance — severity=major
Retry triggered successfully.
```

Outputs:

| Output | Value |
|---|---|
| was-incident | true |
| retried | true |
| incident-name | Actions degraded performance |
| incident-severity | major |
| incident-shortlink | https://www.githubstatus.com/incidents/abcdef |
| incident-started-at | 2026-05-13T12:34:56Z |
| new-run-id | 87654321 |

### 3. PR comment example

If `post-comment: true`, the action posts a short comment on the PR so anyone can tell what happened at a glance:

```markdown
<!-- pr-build-replay retry-count=1 -->
## PR Build Replay

> Status: incident detected

| Field | Value |
|---|---|
| Workflow | CI |
| Retry attempt | 1 |
| Incident | [Actions degraded performance](https://www.githubstatus.com/incidents/abcdef) |
| Impact | major |
| Started | 5 minutes ago |
| Original run | [Run #42](https://github.com/owner/repo/actions/runs/12345678) |
| Retried run | [View retry](https://github.com/owner/repo/actions/runs/87654321) |
```

### Why BlamLess?
* Reduce Developer Friction: No more "did I break it or is GitHub down?"
* Faster Velocity: Automatic recovery from transient infrastructure blips.
* Professional Reporting: Keep your team informed with clear PR status updates.
 