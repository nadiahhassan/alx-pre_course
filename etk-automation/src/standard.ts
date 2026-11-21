// The standard board template: the columns every country board should have, and the code that
// turns a board's rows (from any tool) into Projects and Risks.

import { resolveCountry } from "./countries.js";
import type { Frequency, Metric, MetricMode, Milestone, Project, Risk, RiskStatus } from "./model.js";

export const METRIC_SLOTS = 3;
export const MILESTONE_SLOTS = 3;
export const SECTORS = ["Market entry", "Regulatory compliance", "Trade missions", "Partner search", "Capacity building", "Investment", "Other"];
export const FREQUENCIES: Frequency[] = ["Weekly", "Monthly", "Quarterly"];
export const UNITS = ["Number", "%", "$", "/5", "Days"];
export const RISK_CATEGORIES = ["Delivery", "Financial", "Regulatory", "Partner", "Political", "FX / currency", "Safety"];
export const RISK_STATUSES: RiskStatus[] = ["Open", "Monitoring", "Closed"];

export interface FieldDef { key: string; title: string; required?: boolean; hint: string }

export const PROJECT_FIELDS: FieldDef[] = [
  { key: "project", title: "Project", required: true, hint: "Project name. One row or item per project." },
  { key: "country", title: "Country", required: true, hint: "Country the project runs in, e.g. Nigeria." },
  { key: "client", title: "Client", hint: "Client or funder." },
  { key: "sector", title: "Type of work", hint: SECTORS.join(", ") },
  { key: "lead", title: "Lead", required: true, hint: "Full name of the person accountable." },
  { key: "team", title: "Team", hint: "Other people on the project, separated by commas." },
  { key: "start", title: "Start date", required: true, hint: "YYYY-MM-DD" },
  { key: "end", title: "End date", required: true, hint: "YYYY-MM-DD" },
  { key: "budget", title: "Budget (USD)", required: true, hint: "Total budget in US dollars." },
  { key: "spent", title: "Spent to date (USD)", hint: "Paid so far, in US dollars." },
  { key: "frequency", title: "Update frequency", hint: FREQUENCIES.join(", ") },
  { key: "note", title: "Status note", hint: "One line on how it's going." },
  { key: "updated", title: "Last update", hint: "Date the row was last brought up to date." },
  ...Array.from({ length: METRIC_SLOTS }, (_, k) => k + 1).flatMap(n => [
    { key: `metric${n}`, title: `Metric ${n}`, required: n === 1, hint: "What you measure, e.g. Buyer meetings held." },
    { key: `metric${n}_unit`, title: `Metric ${n} unit`, hint: `${UNITS.join(", ")}. % and scores are judged as rates; numbers and $ as running totals.` },
    { key: `metric${n}_baseline`, title: `Metric ${n} baseline`, hint: "Value at the start." },
    { key: `metric${n}_target`, title: `Metric ${n} target`, required: n === 1, hint: "Value by the end date." },
    { key: `metric${n}_actual`, title: `Metric ${n} actual`, hint: "Latest value." },
  ]),
  ...Array.from({ length: MILESTONE_SLOTS }, (_, k) => k + 1).flatMap(n => [
    { key: `milestone${n}`, title: `Milestone ${n}`, hint: "A key deliverable." },
    { key: `milestone${n}_due`, title: `Milestone ${n} due`, hint: "YYYY-MM-DD" },
    { key: `milestone${n}_done`, title: `Milestone ${n} done`, hint: "Date completed, or Yes." },
  ]),
];

export const RISK_FIELDS: FieldDef[] = [
  { key: "id", title: "Risk ID", hint: "e.g. R-01. Leave blank and one is made for you." },
  { key: "project", title: "Project", required: true, hint: "Exactly as named on the projects board." },
  { key: "risk", title: "Risk", required: true, hint: "What might go wrong." },
  { key: "category", title: "Category", hint: RISK_CATEGORIES.join(", ") },
  { key: "likelihood", title: "Likelihood (1-5)", required: true, hint: "1 = rare, 5 = almost certain." },
  { key: "impact", title: "Impact (1-5)", required: true, hint: "1 = minor, 5 = severe." },
  { key: "owner", title: "Owner", hint: "Full name." },
  { key: "mitigation", title: "Mitigation", hint: "What we're doing about it." },
  { key: "status", title: "Status", hint: RISK_STATUSES.join(", ") },
  { key: "review", title: "Review date", hint: "YYYY-MM-DD" },
];

/** A row from any tool: column title -> value as text (or number/Date where the tool gives one). */
export interface RawItem { id: string; name?: string; updatedAt?: string; fields: Record<string, unknown> }

export type FieldMap = Record<string, string>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const slug = (s: string) => norm(s).replace(/ /g, "-") || "metric";

/** Finds a value by standard key, using the board's column map, then the standard title. Case and punctuation are ignored. */
function getter(item: RawItem, fields: FieldDef[], map: FieldMap) {
  const byNorm = new Map(Object.entries(item.fields).map(([k, v]) => [norm(k), v]));
  return (key: string): unknown => {
    const def = fields.find(f => f.key === key)!;
    const title = map[key] ?? def.title;
    const v = byNorm.get(norm(title));
    if (key === "project" && (v == null || v === "")) return item.name ?? "";
    return v;
  };
}

export function text(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return isoDate(v) ?? "";
  return String(v).trim();
}

export function num(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const t = text(v).replace(/[$£€,\s%]/g, "").replace(/^usd/i, "");
  if (!t) return null;
  const m = t.match(/^(-?\d+(?:\.\d+)?)([km])?$/i);
  if (!m) return null;
  return +m[1] * (m[2]?.toLowerCase() === "k" ? 1e3 : m[2]?.toLowerCase() === "m" ? 1e6 : 1);
}

export function isoDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  const t = text(v);
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/); // UK style DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{5}$/.test(t)) return isoDate(new Date(Date.UTC(1899, 11, 30) + +t * 86400000)); // Excel serial
  const d = new Date(t);
  return isNaN(+d) ? null : isoDate(d);
}

function doneDate(v: unknown, today: string): string | null {
  const t = text(v);
  if (!t) return null;
  if (/^(yes|y|done|complete|completed|true|✓|x)$/i.test(t)) return today;
  return isoDate(t);
}

function unitAndMode(raw: string): { unit: string; mode: MetricMode } {
  const u = raw.trim().toLowerCase();
  if (u === "%" || u === "percent" || u === "percentage") return { unit: "%", mode: "rate" };
  if (u === "/5" || u === "/ 5" || u === "score") return { unit: "/5", mode: "rate" };
  if (u === "/10" || u === "/ 10") return { unit: "/10", mode: "rate" };
  if (u === "$" || u === "usd" || u === "dollars") return { unit: "$", mode: "count" };
  if (u === "days") return { unit: " days", mode: "rate" };
  return { unit: "", mode: "count" };
}

export interface NormalizeResult<T> { rows: T[]; issues: string[] }

export function normalizeProjects(items: RawItem[], boardId: string, map: FieldMap, today: string): NormalizeResult<Project> {
  const rows: Project[] = [], issues: string[] = [];
  if (items.length) {
    const present = new Set(Object.keys(items.flatMap(i => Object.keys(i.fields)).reduce<Record<string, 1>>((a, k) => (a[norm(k)] = 1, a), {})));
    const missing = PROJECT_FIELDS.filter(f => f.required && f.key !== "project" && !present.has(norm(map[f.key] ?? f.title)));
    if (missing.length) issues.push(`Missing columns: ${missing.map(f => map[f.key] ?? f.title).join(", ")}.`);
  }
  for (const item of items) {
    const g = getter(item, PROJECT_FIELDS, map);
    const name = text(g("project"));
    if (!name) { issues.push(`Item ${item.id} has no project name, so it was skipped.`); continue; }
    const where = `“${name}”`;
    const c = resolveCountry(text(g("country")));
    if (!c) issues.push(`${where}: country “${text(g("country"))}” isn't recognised.`);
    const start = isoDate(g("start")), end = isoDate(g("end"));
    if (!start || !end) issues.push(`${where}: start and end dates are needed.`);
    const budget = num(g("budget"));
    if (budget == null) issues.push(`${where}: budget is missing.`);
    const lead = text(g("lead"));
    if (!lead) issues.push(`${where}: no lead named.`);
    const freqRaw = text(g("frequency"));
    const frequency = (FREQUENCIES.find(f => f.toLowerCase() === freqRaw.toLowerCase()) ?? "Monthly") as Frequency;
    const updated = isoDate(g("updated")) ?? (item.updatedAt ? isoDate(item.updatedAt) : null) ?? today;

    const metrics: Metric[] = [];
    for (let n = 1; n <= METRIC_SLOTS; n++) {
      const mname = text(g(`metric${n}`));
      if (!mname) continue;
      const target = num(g(`metric${n}_target`));
      if (target == null) { issues.push(`${where}: “${mname}” has no target.`); continue; }
      const { unit, mode } = unitAndMode(text(g(`metric${n}_unit`)));
      const baseline = num(g(`metric${n}_baseline`)) ?? 0;
      const actual = num(g(`metric${n}_actual`));
      metrics.push({ id: slug(mname), name: mname, mode, unit, baseline, target, frequency, source: "", history: actual == null ? [] : [{ date: updated, value: actual, source: "" }] });
    }
    if (!metrics.length) issues.push(`${where}: no metric with a target, so its status can't be scored.`);

    const milestones: Milestone[] = [];
    for (let n = 1; n <= MILESTONE_SLOTS; n++) {
      const mname = text(g(`milestone${n}`));
      if (!mname) continue;
      const due = isoDate(g(`milestone${n}_due`));
      if (!due) { issues.push(`${where}: milestone “${mname}” has no due date.`); continue; }
      milestones.push({ name: mname, due, done: doneDate(g(`milestone${n}_done`), today) });
    }

    rows.push({
      id: `${boardId}:${item.id}`, boardId, sourceItemId: item.id, name,
      country: c?.name ?? text(g("country")), countryCode: c?.code ?? "",
      client: text(g("client")), sector: text(g("sector")) || "Other", lead,
      team: text(g("team")).split(/[,;]/).map(s => s.trim()).filter(Boolean),
      start: start ?? today, end: end ?? today, budget: budget ?? 0, spent: num(g("spent")) ?? 0,
      statusNote: text(g("note")), lastUpdate: updated, milestones, metrics,
    });
  }
  return { rows, issues };
}

export function normalizeRisks(items: RawItem[], boardId: string, map: FieldMap, projects: Project[], today: string): NormalizeResult<Risk> {
  const rows: Risk[] = [], issues: string[] = [];
  const byName = new Map(projects.map(p => [norm(p.name), p]));
  items.forEach((item, k) => {
    const g = getter(item, RISK_FIELDS, map);
    const title = text(g("risk")) || (item.name ?? "");
    if (!title) return;
    const pname = text(g("project")), p = byName.get(norm(pname));
    if (!p) { issues.push(`Risk “${title}”: no project called “${pname}”.`); return; }
    const clamp = (v: number | null) => Math.min(5, Math.max(1, Math.round(v ?? 3)));
    const statusRaw = text(g("status"));
    rows.push({
      id: text(g("id")) || `${boardId}-${String(k + 1).padStart(2, "0")}`, projectId: p.id, title,
      category: text(g("category")) || "Delivery", likelihood: clamp(num(g("likelihood"))), impact: clamp(num(g("impact"))),
      owner: text(g("owner")) || p.lead, mitigation: text(g("mitigation")),
      status: (RISK_STATUSES.find(s => s.toLowerCase() === statusRaw.toLowerCase()) ?? "Open"),
      review: isoDate(g("review")) ?? today, source: boardId,
    });
  });
  return { rows, issues };
}
