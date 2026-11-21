// Status and warning rules. These match the dashboard exactly:
// running totals are judged against straight-line progress to today; rates against their target;
// 90% or more of expected is on track, 70-90% behind, below 70% off track.

import type { Metric, Project, Risk } from "./model.js";

export type Status = "good" | "warn" | "crit" | "none";
export const STATUS_LABEL: Record<Status, string> = { good: "On track", warn: "Behind", crit: "Off track", none: "No data" };
const rank: Record<Status, number> = { none: -1, good: 0, warn: 1, crit: 2 };
const DAY = 86400000;
const d = (s: string) => Date.parse(s + "T00:00:00Z");

export const worst = (xs: Status[]) => xs.reduce<Status>((a, b) => (rank[b] > rank[a] ? b : a), "none");
export const daysBetween = (from: string, to: string) => Math.round((d(to) - d(from)) / DAY);
export function elapsed(p: Project, today: string) { return Math.min(1, Math.max(0, (d(today) - d(p.start)) / Math.max(DAY, d(p.end) - d(p.start)))); }
export const latest = (m: Metric) => m.history.at(-1) ?? null;

export function metricStatus(p: Project, m: Metric, today: string): Status {
  const l = latest(m);
  if (!l) return "none";
  const span = m.target - m.baseline;
  const prog = span ? (l.value - m.baseline) / span : 1;
  const r = m.mode === "count" ? prog / Math.max(0.02, elapsed(p, today)) : prog;
  return r >= 0.9 ? "good" : r >= 0.7 ? "warn" : "crit";
}
export const projectStatus = (p: Project, today: string) => worst(p.metrics.map(m => metricStatus(p, m, today)));

export const riskScore = (r: Risk) => r.likelihood * r.impact;
export const riskRating = (r: Risk) => (riskScore(r) >= 15 ? "High" : riskScore(r) >= 8 ? "Medium" : "Low");

const FREQ_DAYS = { Weekly: 7, Monthly: 30, Quarterly: 91 } as const;

export function fmt(v: number | null | undefined, unit: string) {
  if (v == null || !isFinite(v)) return "–";
  if (unit === "$") return money(v);
  const n = Math.abs(v) < 100 && v % 1 ? v.toFixed(1) : Math.round(v).toLocaleString("en-GB");
  return unit === "%" ? n + "%" : n + unit;
}
export function money(v: number) { const a = Math.abs(v); return a >= 1e6 ? "$" + +(v / 1e6).toFixed(2) + "m" : a >= 1e3 ? "$" + Math.round(v / 1e3) + "k" : "$" + Math.round(v); }
export const pct = (v: number) => Math.round(v * 100) + "%";

export interface Flag { projectId: string; kind: "Metric" | "Budget" | "Milestone" | "Gone quiet" | "Update due" | "Risk"; severity: "warn" | "crit"; key: string; text: string; owner: string }

/** Every warning for one project, each with a plain-English reason and a stable key (so alerts fire once). */
export function projectFlags(p: Project, today: string, risks: Risk[] = []): Flag[] {
  const out: Flag[] = [];
  const add = (kind: Flag["kind"], severity: Flag["severity"], key: string, text: string, owner = p.lead) => out.push({ projectId: p.id, kind, severity, key: `${p.id}|${key}`, text, owner });
  for (const m of p.metrics) {
    const s = metricStatus(p, m, today);
    if (s === "warn" || s === "crit") add("Metric", s, `metric|${m.id}|${s}`, `${m.name} is ${STATUS_LABEL[s].toLowerCase()}: ${fmt(latest(m)?.value, m.unit)} against a target of ${fmt(m.target, m.unit)}.`);
  }
  if (p.budget > 0) {
    if (p.spent > p.budget) add("Budget", "crit", "budget|over", `Overspent: ${money(p.spent)} against a budget of ${money(p.budget)}.`);
    else if (p.spent / p.budget - elapsed(p, today) > 0.1) add("Budget", "warn", "budget|fast", `Spending ahead of time: ${pct(p.spent / p.budget)} of budget used with ${pct(elapsed(p, today))} of the time gone.`);
  }
  for (const ms of p.milestones) {
    if (ms.done || ms.due >= today) continue;
    const late = daysBetween(ms.due, today);
    add("Milestone", late > 14 ? "crit" : "warn", `milestone|${ms.name}|${late > 14 ? "crit" : "warn"}`, `“${ms.name}” is ${late} day${late === 1 ? "" : "s"} overdue.`);
  }
  const quiet = daysBetween(p.lastUpdate, today);
  if (quiet > 30) add("Gone quiet", "warn", "quiet", `No update for ${quiet} days.`);
  else for (const m of p.metrics) {
    const last = latest(m)?.date ?? p.start;
    if (daysBetween(last, today) > FREQ_DAYS[m.frequency]) { add("Update due", "warn", `due|${m.id}|${last}`, `${m.name} (${m.frequency.toLowerCase()}) hasn't been updated since ${last}.`); break; }
  }
  for (const r of risks) if (r.projectId === p.id && r.status !== "Closed" && riskRating(r) === "High") add("Risk", "crit", `risk|${r.id}`, `High risk: ${r.title} (score ${riskScore(r)}).`, r.owner);
  return out;
}
