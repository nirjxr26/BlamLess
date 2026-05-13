"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreviousRetryCount = getPreviousRetryCount;
exports.reRunWorkflow = reRunWorkflow;
exports.getRunUrl = getRunUrl;
const core = __importStar(require("@actions/core"));
async function getPreviousRetryCount(octokit, owner, repo, prNumber) {
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
            }
            else if (body.includes('<!-- pr-build-replay -->')) {
                count = Math.max(count, 1);
            }
        }
        return count;
    }
    catch (error) {
        core.warning(`Failed to get previous retry count: ${error instanceof Error ? error.message : String(error)}`);
        return 0;
    }
}
async function reRunWorkflow(octokit, owner, repo, runId, sha) {
    const rerunStartedAt = Date.now();
    try {
        await octokit.rest.actions.reRunWorkflow({
            owner,
            repo,
            run_id: runId,
        });
    }
    catch (error) {
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
            const runs = data.workflow_runs.filter((run) => {
                const createdAt = new Date(run.created_at).getTime();
                const updatedAt = new Date(run.updated_at).getTime();
                return createdAt >= rerunStartedAt || updatedAt >= rerunStartedAt;
            });
            if (runs.length > 0) {
                return { newRunId: runs[0].id };
            }
        }
        catch (error) {
            core.warning(`Failed to fetch new run ID (attempt ${attempt + 1}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    core.warning('Could not confirm the new run ID yet. The workflow was retried, but GitHub has not exposed the new run in the API response.');
    return { newRunId: null };
}
function getRunUrl(owner, repo, runId) {
    return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}
