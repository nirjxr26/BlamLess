<div align="center">
  <h1>BlamLess</h1>
</div>

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
# example workflow snippet code
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      actions: write
      issues: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm test

      - name: BlameLess Retry
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


### Why BlameLess?
* Reduce Developer Friction: No more "did I break it or is GitHub down?"
* Faster Velocity: Automatic recovery from transient infrastructure blips.
* Professional Reporting: Keep your team informed with clear PR status updates.
 
