// Writes the portfolio in the format the dashboard loads ("Bring in updates" > "Live data file").

import type { Config } from "./config.js";
import { resolveCountry } from "./countries.js";
import type { Portfolio } from "./model.js";

export interface DashboardData {
  kind: "etk-portfolio";
  version: 1;
  generatedAt: string;
  organisation: string;
  countries: Record<string, { name: string; city?: string }>;
  staff: { id: string; name: string; role: string; base: string; cap: number }[];
  projects: {
    id: string; country: string; name: string; client: string; sector: string; lead: string; team: string[];
    start: string; end: string; budget: number; spent: number; lastUpdate: string;
    milestones: { name: string; due: string; done: string | null }[];
    metrics: { id: string; name: string; mode: "count" | "rate"; unit: string; baseline: number; target: number; frequency: string; source: string; history: { date: string; value: number; note: string }[] }[];
  }[];
  risks: { id: string; pid: string; title: string; category: string; l: number; i: number; owner: string; mitigation: string; status: string; review: string; trend: "up" | "down" | "steady" }[];
  feed: { at: number; pid: string; src: string; text: string }[];
}

/** Short, stable id for the dashboard: an FNV-1a hash of the full project id. */
export function shortId(id: string): string {
  let h = 0x811c9dc5;
  for (const ch of id) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return "p" + h.toString(36);
}

export function toDashboard(cfg: Config, p: Portfolio): DashboardData {
  const live = p.projects.filter(x => !x.archived);
  const pid = new Map(live.map(x => [x.id, shortId(x.id)]));
  if (new Set(pid.values()).size !== pid.size) throw new Error("Two projects got the same dashboard id. Rename one of them and export again.");

  // People: the configured list first, then anyone named on a board who isn't in it.
  const staff: DashboardData["staff"] = [];
  const sid = new Map<string, string>();
  const addPerson = (name: string, role = "", base = "", cap = 3) => {
    const key = name.trim().toLowerCase();
    if (!key || sid.has(key)) return;
    const id = "s" + (staff.length + 1);
    sid.set(key, id);
    staff.push({ id, name: name.trim(), role, base: resolveCountry(base)?.code ?? "", cap });
  };
  cfg.people.forEach(x => addPerson(x.name, x.role, x.base, x.capacity));
  live.forEach(x => [x.lead, ...x.team].forEach(n => addPerson(n, "", x.country)));
  p.risks.forEach(r => addPerson(r.owner));
  const person = (n: string) => sid.get(n.trim().toLowerCase()) ?? "";

  const countries: DashboardData["countries"] = {};
  for (const x of live) if (x.countryCode) countries[x.countryCode] = { name: x.country };
  for (const s of staff) if (s.base && !countries[s.base]) countries[s.base] = { name: resolveCountry(cfg.people.find(x => x.name === s.name)?.base ?? "")?.name ?? s.base };

  return {
    kind: "etk-portfolio", version: 1, generatedAt: new Date().toISOString(), organisation: cfg.organisation, countries, staff,
    projects: live.filter(x => x.countryCode).map(x => ({
      id: pid.get(x.id)!, country: x.countryCode, name: x.name, client: x.client, sector: x.sector, lead: person(x.lead), team: x.team.map(person).filter(Boolean),
      start: x.start, end: x.end, budget: x.budget, spent: x.spent, lastUpdate: x.lastUpdate, milestones: x.milestones,
      metrics: x.metrics.map(m => ({ id: m.id, name: m.name, mode: m.mode, unit: m.unit, baseline: m.baseline, target: m.target, frequency: m.frequency, source: m.source, history: m.history.map(h => ({ date: h.date, value: h.value, note: h.source })) })),
    })),
    risks: p.risks.filter(r => pid.has(r.projectId)).map(r => ({ id: r.id, pid: pid.get(r.projectId)!, title: r.title, category: r.category, l: r.likelihood, i: r.impact, owner: person(r.owner), mitigation: r.mitigation, status: r.status, review: r.review, trend: "steady" as const })),
    feed: p.feed.filter(f => pid.has(f.projectId)).slice(-200).map(f => ({ at: Date.parse(f.at), pid: pid.get(f.projectId)!, src: f.source.split(":")[0], text: f.text })),
  };
}
