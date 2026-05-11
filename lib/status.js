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
exports.fetchUnresolvedIncidents = fetchUnresolvedIncidents;
exports.isActionsIncidentActive = isActionsIncidentActive;
exports.formatIncidentAge = formatIncidentAge;
const core = __importStar(require("@actions/core"));
async function fetchUnresolvedIncidents() {
    try {
        const response = await fetch('https://www.githubstatus.com/api/v2/incidents/unresolved.json');
        if (!response.ok) {
            core.warning(`Failed to fetch GitHub status. Status code: ${response.status}`);
            return [];
        }
        const data = (await response.json());
        return data.incidents || [];
    }
    catch (error) {
        core.warning(`Network failure while fetching GitHub status: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}
function isActionsIncidentActive(incidents) {
    const validImpacts = ['minor', 'major', 'critical'];
    for (const incident of incidents) {
        if (incident.status !== 'resolved' && validImpacts.includes(incident.impact)) {
            const hasActionsComponent = incident.components.some((c) => c.name.includes('Actions') && c.status !== 'operational');
            if (hasActionsComponent) {
                return { active: true, incident };
            }
        }
    }
    return { active: false, incident: null };
}
function formatIncidentAge(createdAt) {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
