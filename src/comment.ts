import * as core from '@actions/core';
import { Incident } from './types';
import { formatIncidentAge } from './status';
import { getRunUrl } from './retry';

export function buildComment(params: {
  owner: string;
  repo: string;
  originalRunId: number;
  newRunId: number | null;
  incident: Incident;
  workflowName: string;
  runNumber: number;
  dryRun: boolean;
  retryCount: number;
}): string {
  const { owner, repo, originalRunId, newRunId, incident, workflowName, runNumber, dryRun, retryCount } = params;
  
  const originalRunUrl = getRunUrl(owner, repo, originalRunId);
  const newRunUrl = newRunId ? getRunUrl(owner, repo, newRunId) : '';

  let dryRunBanner = '';
  if (dryRun) {
    dryRunBanner = `> 🧪 **Dry run mode** — no retry was triggered, this is a simulation.\n\n`;
  }

  let statusLine = `**Status**: INCIDENT DETECTED — ${incident.impact.toUpperCase()}`;
  if (dryRun) statusLine += ' (dry run)';

  let retriedRunLine = `| **Retried run** | ${newRunId ? `[View retry](${newRunUrl}) — ⏳ Running` : (dryRun ? '(Simulated)' : '⚠️ Retry triggered, run ID unknown')} |`;

  return `<!-- pr-build-replay retry-count=${retryCount} -->\n${dryRunBanner}## ⚡ PR Build Replay\n\n> ${statusLine}\n\n| | |\n|---|---|\n| **Workflow** | ${workflowName} |\n| **Retry attempt** | ${retryCount} |\n| **Incident** | [${incident.name}](${incident.shortlink}) |\n| **Impact / Severity** | ${incident.impact} |\n| **Started** | ${formatIncidentAge(incident.created_at)} |\n| **Original run** | [Run #${runNumber}](${originalRunUrl}) — ❌ Failed |\n${retriedRunLine}\n\n> This retry was triggered automatically. If the retry also fails, it is likely a code issue.\n\n---\n*Powered by [BlameLess](https://github.com/nirjxr26/BlameLess)*`;
}

export async function upsertComment(octokit: any, owner: string, repo: string, prNumber: number, body: string): Promise<void> {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((c: any) => c.body?.includes('<!-- pr-build-replay -->'));

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      core.info('Updated existing PR comment.');
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      core.info('Created new PR comment.');
    }
  } catch (error) {
    core.warning(`Failed to upsert PR comment: ${error instanceof Error ? error.message : String(error)}`);
  }
}
