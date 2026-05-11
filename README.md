# pr-build-replay

Auto-retries failed workflows during GitHub infrastructure incidents.

## Usage

Add this as the LAST step in any workflow you want protected.
It must run with `if: failure()` so it only triggers on failed runs.

```yaml
name: CI

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

      - name: PR Build Replay
        if: failure()
        uses: YOUR_USERNAME/pr-build-replay@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          max-retries: '1'
          post-comment: 'true'
```

### Required permissions

The workflow needs these permissions:
```yaml
permissions:
  actions: write      # to re-run workflows
  issues: write       # to post PR comments
  pull-requests: write
```

### Outputs

```yaml
- uses: YOUR_USERNAME/pr-build-replay@v1
  id: replay
  if: failure()
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Log result
  if: always()
  run: |
    echo "Was incident: ${{ steps.replay.outputs.was-incident }}"
    echo "Retried: ${{ steps.replay.outputs.retried }}"
    echo "New run: ${{ steps.replay.outputs.new-run-id }}"
```
