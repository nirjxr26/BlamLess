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
      if (comment.body?.includes('<!-- pr-build-replay -->')) {
        count++;
      }
    }
    return count;
  } catch (error) {
    core.warning(`Failed to get previous retry count: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

export async function reRunWorkflow(octokit: any, owner: string, repo: string, runId: number, sha: string): Promise<{ newRunId: number | null }> {
  const now = new Date().toISOString();
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

  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      head_sha: sha,
    });

    const runs = data.workflow_runs.filter((run: any) => run.created_at >= now || run.updated_at >= now);
    if (runs.length > 0) {
      return { newRunId: runs[0].id };
    }
    
    const firstRun = data.workflow_runs[0];
    return { newRunId: firstRun ? firstRun.id : null };
  } catch (error) {
    core.warning(`Failed to fetch new run ID: ${error instanceof Error ? error.message : String(error)}`);
    return { newRunId: null };
  }
}

export function getRunUrl(owner: string, repo: string, runId: number): string {
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}
