import * as core from '@actions/core';
import * as github from '@actions/github';
import { fetchUnresolvedIncidents, isActionsIncidentActive } from './status';
import { getPreviousRetryCount, reRunWorkflow } from './retry';
import { buildComment, upsertComment } from './comment';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const maxRetriesStr = core.getInput('max-retries') || '1';
    const postCommentStr = core.getInput('post-comment') || 'true';
    const dryRunStr = core.getInput('dry-run') || 'false';

    const maxRetries = parseInt(maxRetriesStr, 10);
    const postComment = postCommentStr.toLowerCase() === 'true';
    const dryRun = dryRunStr.toLowerCase() === 'true';

    const { owner, repo } = github.context.repo;
    const runId = github.context.runId;
    const sha = github.context.sha;
    const workflowName = process.env.GITHUB_WORKFLOW || 'Workflow';
    const runNumber = github.context.runNumber;
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
      core.info("Not a PR — skipping");
      process.exit(0);
    }

    const incidents = await fetchUnresolvedIncidents();
    const { active, incident } = isActionsIncidentActive(incidents);

    if (!active || !incident) {
      core.info("No active GitHub Actions incident detected. Failure is likely a code issue.");
      core.setOutput("was-incident", "false");
      core.setOutput("retried", "false");
      process.exit(0);
    }

    core.warning(`GitHub Actions incident detected: ${incident.name}`);
    core.setOutput("was-incident", "true");
    core.setOutput("incident-name", incident.name);

    const octokit = github.getOctokit(githubToken);

    const previousRetries = await getPreviousRetryCount(octokit, owner, repo, prNumber);
    if (previousRetries >= maxRetries) {
      core.warning(`Max retries (${maxRetries}) reached. Not retrying again.`);
      core.setOutput("retried", "false");
      process.exit(0);
    }

    if (dryRun) {
      core.info(`Would retry run ${runId} due to incident: ${incident.name}`);
      const commentBody = buildComment({
        owner,
        repo,
        originalRunId: runId,
        newRunId: null,
        incident,
        workflowName,
        runNumber,
        dryRun: true
      });
      if (postComment) {
        core.info(`Would post comment:\n${commentBody}`);
      }
      process.exit(0);
    }

    const { newRunId } = await reRunWorkflow(octokit, owner, repo, runId, sha);
    
    if (newRunId) {
      core.setOutput("retried", "true");
      core.setOutput("new-run-id", String(newRunId));
    } else {
      core.setOutput("retried", "false");
    }

    if (postComment) {
      const commentBody = buildComment({
        owner,
        repo,
        originalRunId: runId,
        newRunId,
        incident,
        workflowName,
        runNumber,
        dryRun: false
      });
      await upsertComment(octokit, owner, repo, prNumber, commentBody);
    }

    core.info("Retry triggered successfully.");
    process.exit(0);

  } catch (error) {
    core.warning(`Unexpected error in pr-build-replay: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
}

run();
