<div align="center">

# BlamLess

</div>

Stop manual retries. Detect GitHub infrastructure failures automatically.

---

GitHub Actions can be flaky. Infrastructure incidents, runner outages, and network blips fail workflows through no fault of your code. BlameLess checks whether a failure lines up with a live GitHub incident and retries automatically — no human has to decide "is it me or is it GitHub."

## How it works

1. **Failure detection** — runs only when a previous step fails.
2. **Incident audit** — queries the GitHub Status API for active incidents affecting Actions.
3. **Smart replay** — if an incident is active, re-runs the failed jobs.
4. **PR communication** — posts a status comment with links to the incident and the new run.
5. **Safety limit** — respects `max-retries` so broken code doesn't loop forever.

## Usage

Add BlameLess as the last step of any workflow you want protected:

```yaml
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
        uses: nirjxr26/BlameLess@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

| Input | Description | Default |
|---|---|---|
| `github-token` | Token with `actions:write` and `issues:write` | `${{ github.token }}` |
| `max-retries` | Max auto-retries allowed per PR | `1` |
| `post-comment` | Post a PR comment explaining the retry | `true` |
| `dry-run` | Log the decision without triggering a retry | `false` |

## Outputs

| Output | Description |
|---|---|
| `was-incident` | `true` if a GitHub Actions incident was detected |
| `incident-name` | Name of the detected incident |
| `incident-severity` | `critical` / `major` / `minor` |
| `incident-shortlink` | Link to the incident on githubstatus.com |
| `incident-started-at` | Timestamp the incident began |
| `incidents-found` | `true` if any unresolved incidents exist (may not affect Actions) |
| `incidents-summary` | Summary of unresolved incidents when none affect Actions |
| `retried` | `true` if the workflow was actually retried |
| `new-run-id` | ID of the newly triggered run |


## Why BlameLess

- No more guessing whether it's your code or GitHub's infrastructure.
- Workflows recover from transient outages without a human watching CI.
- PRs stay informed with a clear, linked status comment instead of a silent re-run.
