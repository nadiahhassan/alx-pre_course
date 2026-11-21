// The one shape every board is turned into. The dashboard, alerts and reports all read this.

export type MetricMode = "count" | "rate";
export type Frequency = "Weekly" | "Monthly" | "Quarterly";

export interface MetricPoint {
  date: string; // YYYY-MM-DD
  value: number;
  source: string; // e.g. "Monday.com: Nigeria projects", "Email (AI)"
}

export interface Metric {
  id: string; // slug of the name, stable across syncs
  name: string;
  mode: MetricMode; // "count" = running total, "rate" = level such as a % or score
  unit: string; // "", "%", "$", "/5", " days"
  baseline: number;
  target: number;
  frequency: Frequency;
  source: string;
  history: MetricPoint[];
}

export interface Milestone {
  name: string;
  due: string; // YYYY-MM-DD
  done: string | null; // date completed, or null
}

export interface Project {
  id: string; // "<boardId>:<item id in the tool>"
  boardId: string;
  sourceItemId: string;
  name: string;
  country: string; // display name, e.g. "Nigeria"
  countryCode: string; // ISO numeric, matches the dashboard map
  client: string;
  sector: string;
  lead: string; // person's name
  team: string[];
  start: string;
  end: string;
  budget: number;
  spent: number;
  statusNote: string;
  lastUpdate: string;
  milestones: Milestone[];
  metrics: Metric[];
  archived?: boolean;
}

export type RiskStatus = "Open" | "Monitoring" | "Closed";

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  category: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  owner: string; // person's name
  mitigation: string;
  status: RiskStatus;
  review: string; // YYYY-MM-DD
  source: string;
}

export interface FeedItem {
  at: string; // ISO timestamp
  projectId: string;
  source: string;
  text: string;
}

export interface BoardHealth {
  boardId: string;
  boardName: string;
  tool: string;
  checkedAt: string;
  ok: boolean;
  items: number;
  issues: string[];
}

export interface Person {
  name: string;
  role: string;
  base: string; // country name
  capacity: number; // projects they can carry at once
  email?: string;
}

export interface Portfolio {
  version: 1;
  updatedAt: string;
  projects: Project[];
  risks: Risk[];
  feed: FeedItem[];
  boardHealth: BoardHealth[];
}

export const emptyPortfolio = (): Portfolio => ({ version: 1, updatedAt: new Date(0).toISOString(), projects: [], risks: [], feed: [], boardHealth: [] });
