import * as core from '@actions/core';

export async function getPreviousRetryCount(octokit: any, owner: string, repo: string, prNumber: number): Promise<number> {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    let count = 0;
    for (const comment of comments) {
      const body = comment.body || '';
      const match = body.match(/<!-- pr-build-replay(?:\s+retry-count=(\d+))? -->/);
      if (match?.[1]) {
        count = Math.max(count, Number(match[1]));
      } else if (body.includes('<!-- pr-build-replay -->')) {
        count = Math.max(count, 1);
      }
    }
    return count;
  } catch (error) {
    core.warning(`Failed to get previous retry count: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

export async function reRunWorkflow(octokit: any, owner: string, repo: string, runId: number, sha: string): Promise<{ newRunId: number | null }> {
  const rerunStartedAt = Date.now();
  try {
    await octokit.rest.actions.reRunWorkflow({
      owner,
      repo,
      run_id: runId,
    });
  } catch (error: any) {
    if (error.status === 403) {
      core.warning('Insufficient permissions. Add actions: write to workflow permissions.');
      return { newRunId: null };
    }
    if (error.status === 409) {
      core.warning('Run is not in a re-runnable state.');
      return { newRunId: null };
    }
    core.warning(`Failed to trigger rerun: ${error.message}`);
    return { newRunId: null };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        head_sha: sha,
      });

      const runs = data.workflow_runs.filter((run: any) => {
        const createdAt = new Date(run.created_at).getTime();
        const updatedAt = new Date(run.updated_at).getTime();
        return createdAt >= rerunStartedAt || updatedAt >= rerunStartedAt;
      });

      if (runs.length > 0) {
        return { newRunId: runs[0].id };
      }
    } catch (error) {
      core.warning(`Failed to fetch new run ID (attempt ${attempt + 1}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  core.warning('Could not confirm the new run ID yet. The workflow was retried, but GitHub has not exposed the new run in the API response.');
  return { newRunId: null };
}

export function getRunUrl(owner: string, repo: string, runId: number): string {
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}
