import * as core from '@actions/core';
import { Incident, StatusResponse } from './types';

export async function fetchUnresolvedIncidents(): Promise<Incident[]> {
  try {
    const response = await fetch('https://www.githubstatus.com/api/v2/incidents/unresolved.json');
    if (!response.ok) {
      core.warning(`Failed to fetch GitHub status. Status code: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as StatusResponse;
    return data.incidents || [];
  } catch (error) {
    core.warning(`Network failure while fetching GitHub status: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export function isActionsIncidentActive(incidents: Incident[]): { active: boolean; incident: Incident | null } {
  const validImpacts = ['minor', 'major', 'critical'];

  for (const incident of incidents) {
    if (incident.status !== 'resolved' && validImpacts.includes(incident.impact)) {
      const hasActionsComponent = incident.components.some(
        (c) => c.name.includes('Actions') && c.status !== 'operational'
      );
      if (hasActionsComponent) {
        return { active: true, incident };
      }
    }
  }

  return { active: false, incident: null };
}

export function formatIncidentAge(createdAt: string): string {
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
