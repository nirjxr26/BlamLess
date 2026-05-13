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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const status_1 = require("./status");
const retry_1 = require("./retry");
const comment_1 = require("./comment");
async function run() {
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
        const incidents = await (0, status_1.fetchUnresolvedIncidents)();
        const { active, incident, severity } = (0, status_1.isActionsIncidentActive)(incidents);
        // Expose structured outputs so workflow consumers can easily classify results
        core.setOutput('incidents-found', String(incidents.length > 0));
        if (!active || !incident) {
            core.info("No active GitHub Actions incident detected. Failure is likely a code issue.");
            core.setOutput("was-incident", "false");
            core.setOutput('incident-name', '');
            core.setOutput('incident-severity', 'none');
            core.setOutput('incident-shortlink', '');
            core.setOutput('retried', "false");
            if (incidents.length > 0) {
                const summary = incidents.map(i => `${i.name} (${i.impact})`).join(' | ');
                core.setOutput('incidents-summary', summary);
            }
            else {
                core.setOutput('incidents-summary', '');
            }
            process.exit(0);
        }
        core.warning(`GitHub Actions incident detected: ${incident.name} — severity=${severity}`);
        core.setOutput("was-incident", "true");
        core.setOutput("incident-name", incident.name);
        core.setOutput('incident-severity', severity ?? 'unknown');
        core.setOutput('incident-shortlink', incident.shortlink ?? '');
        core.setOutput('incident-started-at', incident.created_at ?? '');
        const octokit = github.getOctokit(githubToken);
        const previousRetries = await (0, retry_1.getPreviousRetryCount)(octokit, owner, repo, prNumber);
        if (previousRetries >= maxRetries) {
            core.warning(`Max retries (${maxRetries}) reached. Not retrying again.`);
            core.setOutput("retried", "false");
            process.exit(0);
        }
        const retryCount = previousRetries + 1;
        if (dryRun) {
            core.info(`Would retry run ${runId} due to incident: ${incident.name}`);
            const commentBody = (0, comment_1.buildComment)({
                owner,
                repo,
                originalRunId: runId,
                newRunId: null,
                incident,
                workflowName,
                runNumber,
                dryRun: true,
                retryCount
            });
            if (postComment) {
                core.info(`Would post comment:\n${commentBody}`);
            }
            process.exit(0);
        }
        const { newRunId } = await (0, retry_1.reRunWorkflow)(octokit, owner, repo, runId, sha);
        if (newRunId) {
            core.setOutput("retried", "true");
            core.setOutput("new-run-id", String(newRunId));
        }
        else {
            core.setOutput("retried", "false");
        }
        if (postComment) {
            const commentBody = (0, comment_1.buildComment)({
                owner,
                repo,
                originalRunId: runId,
                newRunId,
                incident,
                workflowName,
                runNumber,
                dryRun: false,
                retryCount
            });
            await (0, comment_1.upsertComment)(octokit, owner, repo, prNumber, commentBody);
        }
        core.info("Retry triggered successfully.");
        process.exit(0);
    }
    catch (error) {
        core.warning(`Unexpected error in pr-build-replay: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(0);
    }
}
run();
