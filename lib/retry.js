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
            if (comment.body?.includes('<!-- pr-build-replay -->')) {
                count++;
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
    const now = new Date().toISOString();
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
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
        const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
            owner,
            repo,
            head_sha: sha,
        });
        const runs = data.workflow_runs.filter((run) => run.created_at >= now || run.updated_at >= now);
        if (runs.length > 0) {
            return { newRunId: runs[0].id };
        }
        const firstRun = data.workflow_runs[0];
        return { newRunId: firstRun ? firstRun.id : null };
    }
    catch (error) {
        core.warning(`Failed to fetch new run ID: ${error instanceof Error ? error.message : String(error)}`);
        return { newRunId: null };
    }
}
function getRunUrl(owner, repo, runId) {
    return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}
