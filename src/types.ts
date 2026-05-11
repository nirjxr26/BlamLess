export interface IncidentComponent {
  name: string;
  status: string;
}

export interface Incident {
  id: string;
  name: string;
  status: string;
  impact: string;
  components: IncidentComponent[];
  created_at: string;
  updated_at: string;
  shortlink: string;
}

export interface StatusResponse {
  incidents: Incident[];
}
