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
exports.buildComment = buildComment;
exports.upsertComment = upsertComment;
const core = __importStar(require("@actions/core"));
const status_1 = require("./status");
const retry_1 = require("./retry");
function buildComment(params) {
    const { owner, repo, originalRunId, newRunId, incident, runNumber, dryRun } = params;
    const originalRunUrl = (0, retry_1.getRunUrl)(owner, repo, originalRunId);
    const newRunUrl = newRunId ? (0, retry_1.getRunUrl)(owner, repo, newRunId) : '';
    let dryRunBanner = '';
    if (dryRun) {
        dryRunBanner = `> 🧪 **Dry run mode** — no retry was triggered, this is a simulation.\n\n`;
    }
    let retriedRunLine = `| **Retried run** | [View retry](${newRunUrl}) — ⏳ Running |`;
    if (newRunId === null && !dryRun) {
        retriedRunLine = `> ⚠️ Retry was triggered but the new run ID could not be determined. Check the Actions tab.`;
    }
    else if (newRunId === null && dryRun) {
        retriedRunLine = `| **Retried run** | (Simulated) |`;
    }
    return `<!-- pr-build-replay -->\n${dryRunBanner}## ⚡ PR Build Replay\n\nThis workflow run failed during an active **GitHub Actions infrastructure incident**.\n\n| | |\n|---|---|\n| **Incident** | [${incident.name}](${incident.shortlink}) |\n| **Impact** | ${incident.impact} |\n| **Started** | ${(0, status_1.formatIncidentAge)(incident.created_at)} |\n| **Original run** | [Run #${runNumber}](${originalRunUrl}) — ❌ Failed |\n${retriedRunLine}\n\n> This retry was triggered automatically. If the retry also fails, it is likely a code issue.\n\n---\n*Powered by [pr-build-replay](https://github.com/YOUR_USERNAME/pr-build-replay)*`;
}
async function upsertComment(octokit, owner, repo, prNumber, body) {
    try {
        const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: prNumber,
        });
        const existingComment = comments.find((c) => c.body?.includes('<!-- pr-build-replay -->'));
        if (existingComment) {
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existingComment.id,
                body,
            });
            core.info('Updated existing PR comment.');
        }
        else {
            await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body,
            });
            core.info('Created new PR comment.');
        }
    }
    catch (error) {
        core.warning(`Failed to upsert PR comment: ${error instanceof Error ? error.message : String(error)}`);
    }
}
