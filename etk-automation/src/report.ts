// The weekly portfolio report, as Markdown (for chat or docs) and HTML (for email).

import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./config.js";
import type { Portfolio, Project } from "./model.js";
import { daysBetween, elapsed, fmt, latest, money, pct, projectFlags, projectStatus, riskRating, riskScore, STATUS_LABEL, type Status } from "./rules.js";

export interface Report { title: string; markdown: string; html: string; text: string }

interface Section { heading: string; lines: string[]; table?: { head: string[]; rows: string[][] } }

function sections(p: Portfolio, today: string): Section[] {
  const live = p.projects.filter(x => !x.archived);
  const st = (x: Project) => projectStatus(x, today);
  const count = (s: Status) => live.filter(x => st(x) === s).length;
  const budget = live.reduce((n, x) => n + x.budget, 0), spent = live.reduce((n, x) => n + x.spent, 0);
  const countries = [...new Set(live.map(x => x.country))].sort();
  const weekAgo = new Date(Date.parse(today) - 7 * 86400000).toISOString();
  const out: Section[] = [];

  out.push({ heading: "Summary", lines: [
    `${live.length} active projects in ${countries.length} countries: ${count("good")} on track, ${count("warn")} behind, ${count("crit")} off track${count("none") ? `, ${count("none")} with no data yet` : ""}.`,
    `Budget: ${money(spent)} of ${money(budget)} spent (${budget ? pct(spent / budget) : "–"}).`,
    `${p.feed.filter(f => f.at >= weekAgo).length} updates came in this week.`,
  ] });

  out.push({ heading: "By country", lines: [], table: { head: ["Country", "Projects", "On track", "Behind", "Off track", "Spent", "Budget"], rows: countries.map(c => {
    const l = live.filter(x => x.country === c);
    return [c, String(l.length), String(l.filter(x => st(x) === "good").length), String(l.filter(x => st(x) === "warn").length), String(l.filter(x => st(x) === "crit").length), money(l.reduce((n, x) => n + x.spent, 0)), money(l.reduce((n, x) => n + x.budget, 0))];
  }) } });

  const attention = live.filter(x => st(x) === "crit" || st(x) === "warn").sort((a, b) => (st(a) === "crit" ? -1 : 1) - (st(b) === "crit" ? -1 : 1));
  if (attention.length) out.push({ heading: "Needs attention", lines: attention.map(x => `${x.name} (${x.country}, ${x.lead}), ${STATUS_LABEL[st(x)].toLowerCase()}: ${projectFlags(x, today).filter(f => f.kind !== "Update due").slice(0, 2).map(f => f.text).join(" ")}`) });

  const overdue = live.flatMap(x => x.milestones.filter(m => !m.done && m.due < today).map(m => `${m.name}: ${daysBetween(m.due, today)} days overdue (${x.name}, ${x.country})`));
  if (overdue.length) out.push({ heading: "Overdue milestones", lines: overdue });

  const budgetWatch = live.filter(x => x.budget && (x.spent > x.budget || x.spent / x.budget - elapsed(x, today) > 0.1));
  if (budgetWatch.length) out.push({ heading: "Budget watch", lines: budgetWatch.map(x => `${x.name}: ${money(x.spent)} of ${money(x.budget)} (${pct(x.spent / x.budget)}) with ${pct(elapsed(x, today))} of the time gone${x.spent > x.budget ? ". Overspent" : ""}.`) });

  const high = p.risks.filter(r => r.status !== "Closed" && riskRating(r) === "High").sort((a, b) => riskScore(b) - riskScore(a));
  if (high.length) out.push({ heading: "High risks", lines: high.map(r => `${r.title} (score ${riskScore(r)}, ${live.find(x => x.id === r.projectId)?.name ?? "unknown project"}). Owner: ${r.owner}. ${r.mitigation || "No mitigation recorded."}`) });

  const good = live.filter(x => st(x) === "good");
  if (good.length) out.push({ heading: "Going well", lines: good.map(x => `${x.name} (${x.country}): ${x.metrics.map(m => `${m.name.toLowerCase()} ${fmt(latest(m)?.value, m.unit)} of ${fmt(m.target, m.unit)}`).join("; ")}`) });

  const quiet = live.filter(x => daysBetween(x.lastUpdate, today) > 30);
  const boardIssues = p.boardHealth.filter(h => !h.ok);
  if (quiet.length || boardIssues.length) out.push({ heading: "Data quality", lines: [
    ...quiet.map(x => `${x.name} hasn't been updated for ${daysBetween(x.lastUpdate, today)} days (lead: ${x.lead}).`),
    ...boardIssues.map(h => `${h.boardName} (${h.tool}): ${h.issues.slice(0, 3).join(" ")}${h.issues.length > 3 ? ` And ${h.issues.length - 3} more.` : ""}`),
  ] });
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function buildReport(cfg: Config, p: Portfolio, today: string, aiSummary?: string): Report {
  const title = `${cfg.organisation} projects: weekly report, ${today}`;
  const secs = sections(p, today);
  const md = [`# ${title}`, ...(aiSummary ? ["", aiSummary] : []), ...secs.flatMap(s => ["", `## ${s.heading}`, "", ...s.lines.map(l => `- ${l}`), ...(s.table ? [`| ${s.table.head.join(" | ")} |`, `|${s.table.head.map(() => " --- ").join("|")}|`, ...s.table.rows.map(r => `| ${r.join(" | ")} |`)] : [])])].join("\n") + "\n";
  const html = `<!doctype html><html><body style="margin:0;background:#fff;font:15px/1.55 -apple-system,'Segoe UI',Arial,sans-serif;color:#132231">
<div style="background:#C82227;color:#fff;padding:18px 24px"><div style="font-size:12px;opacity:.85">${esc(cfg.organisation)}</div><div style="font-size:21px;font-weight:700">Weekly projects report, ${today}</div></div>
<div style="padding:8px 24px 24px;max-width:760px">${aiSummary ? `<p style="background:#FBE9E8;padding:12px 14px;border-radius:8px">${esc(aiSummary).replace(/\n\n/g, "</p><p>")}</p>` : ""}
${secs.map(s => `<h2 style="font-size:15px;color:#392412;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 6px">${esc(s.heading)}</h2>${s.lines.length ? `<ul style="margin:0;padding-left:20px">${s.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}${s.table ? `<table style="border-collapse:collapse;width:100%;font-size:14px"><tr>${s.table.head.map(h => `<th style="text-align:left;border-bottom:2px solid #392412;padding:6px">${esc(h)}</th>`).join("")}</tr>${s.table.rows.map(r => `<tr>${r.map(c => `<td style="border-bottom:1px solid #ddd;padding:6px">${esc(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}`).join("\n")}
<p style="color:#6C7C8A;font-size:12px;margin-top:24px">Generated automatically from the project boards. Reply to this email with updates and they'll be read in for approval.</p></div></body></html>`;
  return { title, markdown: md, html, text: md };
}

/** Optional: a short written overview at the top of the report, from Claude. Uses only the report's own facts. */
export async function aiSummary(cfg: Config, md: string, client = new Anthropic()): Promise<string> {
  const res = await client.beta.messages.create({
    model: cfg.ai.model, max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    output_config: { effort: "medium" },
    system: "You write the opening of a weekly projects report for a busy leadership team. Plain British English, 2 short paragraphs, under 150 words. Lead with the overall picture, then the two or three things that need a decision this week. Use only facts from the report; never invent numbers.",
    messages: [{ role: "user", content: md }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to summarise this report.");
  return res.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("").trim();
}
