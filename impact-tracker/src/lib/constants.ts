// Allowed values for enum-like string columns (see prisma/schema.prisma).

export const LEVELS = ["input", "activity", "output", "outcome", "impact"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  input: "Inputs",
  activity: "Activities",
  output: "Outputs",
  outcome: "Outcomes",
  impact: "Impact",
};

export const CONFIDENCE = ["measured", "self-reported", "estimated", "modelled"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const DIRECTIONS = ["increase", "decrease"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const MEASURE_TYPES = ["point", "cumulative"] as const;
export type MeasureType = (typeof MEASURE_TYPES)[number];

export const MEASURE_TYPE_LABELS: Record<MeasureType, string> = {
  point: "Latest value (point in time)",
  cumulative: "Running total (entries are added up)",
};

export const FREQUENCIES = ["weekly", "monthly", "quarterly", "annually", "ad-hoc"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const PROJECT_STATUSES = ["planning", "active", "paused", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CHANNELS = ["youtube", "social", "email", "events", "paid-search", "press", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<string, string> = {
  youtube: "YouTube",
  social: "Social",
  email: "Email",
  events: "Events",
  "paid-search": "Paid search",
  press: "Press",
  other: "Other",
};

export const EVIDENCE_TYPES = ["quote", "survey", "case-study", "link"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export const AUDIENCES = ["external", "internal", "both"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = {
  external: "External",
  internal: "Internal",
  both: "Internal & external",
};

export const ROLES = ["admin", "programme", "partner", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Global lead (admin)",
  programme: "Programme team",
  partner: "Partner team",
  viewer: "Viewer",
};

export const TEAMS = ["comms", "gapp", "marketing"] as const;
export type Team = (typeof TEAMS)[number];
export const TEAM_LABELS: Record<Team, string> = {
  comms: "Comms",
  gapp: "Government Affairs & Public Policy",
  marketing: "Marketing",
};

export const SPEND_CATEGORIES = ["staff", "grants", "events", "marketing", "travel", "vendors", "other"] as const;
export const SPEND_CATEGORY_LABELS: Record<string, string> = {
  staff: "Staff",
  grants: "Grants",
  events: "Events",
  marketing: "Marketing",
  travel: "Travel",
  vendors: "Vendors & contractors",
  other: "Other",
};
export const SPEND_STATUSES = ["actual", "committed"] as const;

export const RESPONSIBILITY_TYPES = ["report", "contract", "approval", "compliance", "admin", "other"] as const;
export const RESPONSIBILITY_TYPE_LABELS: Record<string, string> = {
  report: "Report",
  contract: "Contract",
  approval: "Approval",
  compliance: "Compliance",
  admin: "Admin",
  other: "Other",
};
export const RESPONSIBILITY_STATUSES = ["open", "in-progress", "blocked", "done"] as const;
export const RECURRENCES = ["none", "monthly", "quarterly", "annually"] as const;
export const OWNER_TEAMS = ["programme", "comms", "gapp", "marketing"] as const;
export const OWNER_TEAM_LABELS: Record<string, string> = {
  programme: "Programme team",
  comms: "Comms",
  gapp: "GAPP",
  marketing: "Marketing",
};
export const RISK_STATUSES = ["open", "mitigating", "closed"] as const;
