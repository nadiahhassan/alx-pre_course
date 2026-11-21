// Reads update emails and reports dropped into the inbox folder, asks Claude to pull out the
// changes, and queues them for a person to approve. Nothing reaches the portfolio without approval.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { resolvePath, type Config } from "./config.js";
import type { FeedItem, Portfolio, Risk } from "./model.js";
import { fmt, latest, money } from "./rules.js";
import { RISK_CATEGORIES } from "./standard.js";
import { dataFile, readJson, writeJson } from "./store.js";

// ---------- What Claude returns ----------
const Change = z.strictObject({
  type: z.enum(["metric", "spent", "milestone_done", "risk"]),
  project_id: z.string(),
  metric_id: z.string().nullable(),
  value: z.number().nullable(), // new total or level for "metric"; total spend to date for "spent"
  milestone: z.string().nullable(),
  risk_title: z.string().nullable(),
  risk_category: z.enum(RISK_CATEGORIES as [string, ...string[]]).nullable(),
  likelihood: z.number().int().min(1).max(5).nullable(),
  impact: z.number().int().min(1).max(5).nullable(),
  evidence: z.string(), // the sentence in the email that supports the change
});
const Extraction = z.strictObject({ changes: z.array(Change), unmatched: z.array(z.string()) });
export type Extracted = z.infer<typeof Extraction>;

// ---------- The approval queue ----------
export interface PendingChange {
  id: string;
  status: "pending" | "approved" | "rejected";
  type: "metric" | "spent" | "milestone_done" | "risk";
  projectId: string;
  metricId?: string;
  value?: number;
  milestone?: string;
  risk?: Pick<Risk, "title" | "category" | "likelihood" | "impact">;
  evidence: string;
  summary: string;
}
export interface PendingEmail { id: string; file: string; from: string; subject: string; receivedAt: string; changes: PendingChange[]; unmatched: string[] }

export const pendingFile = (cfg: Config) => dataFile(cfg, "pending.json");
export const loadPending = (cfg: Config) => readJson<PendingEmail[]>(pendingFile(cfg), []);

export type Extractor = (email: string, catalogue: string) => Promise<Extracted>;

const SYSTEM = `You turn project update emails into structured changes for a portfolio tracker.
Match each update to a project and metric in the catalogue by meaning, not exact wording.
Rules:
- "metric": value is the new running total or level, never the increase. If the email gives only an increase, add it to the latest value in the catalogue.
- "spent": value is total spend to date in US dollars. Convert from other currencies only if the email gives the rate; otherwise leave it out and list it in "unmatched".
- "milestone_done": milestone must be one of the project's open milestones, copied exactly.
- "risk": a new problem or threat the email describes. Score likelihood and impact from 1 to 5.
- Only include what the email states. Put anything you can't match to the catalogue in "unmatched", in a few words.
- evidence: quote the sentence from the email that supports the change.
Set fields that don't apply to a change type to null.`;

/** The default extractor: Claude with structured output, so the reply always fits the schema. */
export function claudeExtractor(model: string, client = new Anthropic()): Extractor {
  return async (email, catalogue) => {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: z.toJSONSchema(Extraction) as Record<string, unknown> } },
      system: SYSTEM,
      messages: [{ role: "user", content: `<catalogue>\n${catalogue}\n</catalogue>\n\n<email>\n${email}\n</email>` }],
    });
    if (res.stop_reason === "refusal") throw new Error("Claude declined to read this email. Review it by hand.");
    if (res.stop_reason === "max_tokens") throw new Error("The email was too long to read in one go. Split it and try again.");
    const textOut = res.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("");
    return Extraction.parse(JSON.parse(textOut));
  };
}

/** Compact description of what can be updated, sent with each email. */
export function catalogue(p: Portfolio): string {
  return JSON.stringify(p.projects.filter(x => !x.archived).map(x => ({
    project_id: x.id, name: x.name, country: x.country, lead: x.lead, spent_to_date: x.spent,
    metrics: x.metrics.map(m => ({ metric_id: m.id, name: m.name, unit: m.unit || "number", latest: latest(m)?.value ?? null, target: m.target })),
    open_milestones: x.milestones.filter(m => !m.done).map(m => m.name),
  })));
}

function header(raw: string, name: string) { return raw.match(new RegExp(`^${name}:\\s*(.+)$`, "mi"))?.[1]?.trim() ?? ""; }

/** Checks every change against the portfolio. Anything that doesn't match is dropped into "unmatched" rather than guessed. */
export function validate(ex: Extracted, p: Portfolio, idPrefix: string): { changes: PendingChange[]; unmatched: string[] } {
  const changes: PendingChange[] = [], unmatched = [...ex.unmatched];
  ex.changes.forEach((c, k) => {
    const proj = p.projects.find(x => x.id === c.project_id && !x.archived);
    const id = `${idPrefix}-${k + 1}`;
    if (!proj) { unmatched.push(`Unknown project ${c.project_id}: ${c.evidence}`); return; }
    const base = { id, status: "pending" as const, projectId: proj.id, evidence: c.evidence };
    if (c.type === "metric") {
      const m = proj.metrics.find(x => x.id === c.metric_id);
      if (!m || c.value == null) { unmatched.push(`${proj.name}: ${c.evidence}`); return; }
      changes.push({ ...base, type: "metric", metricId: m.id, value: c.value, summary: `${proj.name} · ${m.name}: ${fmt(latest(m)?.value ?? null, m.unit)} → ${fmt(c.value, m.unit)}` });
    } else if (c.type === "spent") {
      if (c.value == null || c.value < 0) { unmatched.push(`${proj.name}: ${c.evidence}`); return; }
      changes.push({ ...base, type: "spent", value: c.value, summary: `${proj.name} · Spent to date: ${money(proj.spent)} → ${money(c.value)}` });
    } else if (c.type === "milestone_done") {
      const ms = proj.milestones.find(x => x.name === c.milestone && !x.done);
      if (!ms) { unmatched.push(`${proj.name}: ${c.evidence}`); return; }
      changes.push({ ...base, type: "milestone_done", milestone: ms.name, summary: `${proj.name} · Milestone done: ${ms.name}` });
    } else {
      if (!c.risk_title) { unmatched.push(`${proj.name}: ${c.evidence}`); return; }
      const risk = { title: c.risk_title, category: c.risk_category ?? "Delivery", likelihood: c.likelihood ?? 3, impact: c.impact ?? 3 };
      changes.push({ ...base, type: "risk", risk, summary: `${proj.name} · New risk: ${risk.title} (${risk.likelihood}×${risk.impact})` });
    }
  });
  return { changes, unmatched };
}

/** Processes every new file in the inbox. Read files move to inbox/processed (or inbox/failed). */
export async function runIntake(cfg: Config, p: Portfolio, extract: Extractor, now = new Date()): Promise<{ read: number; queued: number; failed: string[] }> {
  const inbox = resolvePath(cfg, cfg.paths.inbox);
  if (!existsSync(inbox)) return { read: 0, queued: 0, failed: [] };
  const files = readdirSync(inbox).filter(f => /\.(txt|eml|md)$/i.test(f)).sort();
  const pending = loadPending(cfg), failed: string[] = [];
  let queued = 0;
  for (const f of files) {
    const full = path.join(inbox, f), raw = readFileSync(full, "utf8");
    const id = `E${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(pending.length + 1).padStart(3, "0")}`;
    try {
      const ex = await extract(raw.slice(0, 60000), catalogue(p));
      const { changes, unmatched } = validate(ex, p, id);
      pending.push({ id, file: f, from: header(raw, "From"), subject: header(raw, "Subject") || f, receivedAt: now.toISOString(), changes, unmatched });
      queued += changes.length;
      move(full, path.join(inbox, "processed"));
    } catch (e) {
      failed.push(`${f}: ${(e as Error).message}`);
      move(full, path.join(inbox, "failed"));
    }
  }
  writeJson(pendingFile(cfg), pending);
  return { read: files.length, queued, failed };
}

function move(file: string, dir: string) { mkdirSync(dir, { recursive: true }); renameSync(file, path.join(dir, path.basename(file))); }

/** Applies approved changes to the portfolio and records each in the activity feed. */
export function applyApproved(p: Portfolio, email: PendingEmail, ids: string[] | "all", today: string, now = new Date().toISOString()): { portfolio: Portfolio; applied: number } {
  const feed: FeedItem[] = [];
  const risks = [...p.risks];
  const projects = p.projects.map(x => ({ ...x, metrics: x.metrics.map(m => ({ ...m, history: [...m.history] })), milestones: x.milestones.map(m => ({ ...m })) }));
  let applied = 0;
  for (const c of email.changes) {
    if (c.status !== "pending" || (ids !== "all" && !ids.includes(c.id))) continue;
    const proj = projects.find(x => x.id === c.projectId);
    if (!proj) continue;
    const source = `Email (AI, approved): ${email.subject}`;
    if (c.type === "metric") {
      const m = proj.metrics.find(x => x.id === c.metricId)!;
      const last = m.history.at(-1);
      if (last && last.date === today) last.value = c.value!; else m.history.push({ date: today, value: c.value!, source });
    } else if (c.type === "spent") proj.spent = c.value!;
    else if (c.type === "milestone_done") { const ms = proj.milestones.find(x => x.name === c.milestone); if (ms) ms.done = today; }
    else if (c.type === "risk" && c.risk) {
      const n = risks.filter(r => r.source === "email").length + 1;
      risks.push({ id: `RE-${String(n).padStart(2, "0")}`, projectId: proj.id, ...c.risk, owner: proj.lead, mitigation: "To be agreed", status: "Open", review: today, source: "email" });
    }
    proj.lastUpdate = today;
    c.status = "approved";
    feed.push({ at: now, projectId: proj.id, source: "Email (AI)", text: c.summary.split(" · ").slice(1).join(" · ") + "." });
    applied++;
  }
  return { portfolio: { ...p, projects, risks, feed: [...p.feed, ...feed] }, applied };
}
