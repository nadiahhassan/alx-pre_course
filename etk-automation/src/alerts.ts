// Sends each warning once, when it first appears, plus a reminder to each lead whose updates are due.

import type { Config } from "./config.js";
import type { Portfolio } from "./model.js";
import { postChat, sendEmail, type Channels } from "./notify.js";
import { projectFlags, type Flag } from "./rules.js";
import { dataFile, readJson, writeJson } from "./store.js";

export interface AlertRun { newFlags: Flag[]; cleared: number; message: string; sentTo: string[]; reminders: { lead: string; items: string[]; emailed: boolean }[] }

export async function runAlerts(cfg: Config, p: Portfolio, today: string, ch: Channels, opts: { dryRun?: boolean; fetcher?: typeof fetch } = {}): Promise<AlertRun> {
  const stateFile = dataFile(cfg, "alerts-state.json");
  const seen = new Set(readJson<string[]>(stateFile, []));
  const live = p.projects.filter(x => !x.archived);
  const flags = live.flatMap(x => projectFlags(x, today, p.risks));
  const newFlags = flags.filter(f => !seen.has(f.key) && f.kind !== "Update due");
  const byId = new Map(live.map(x => [x.id, x]));

  let message = "";
  if (newFlags.length) {
    const lines = newFlags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "crit" ? -1 : 1))
      .map(f => `${f.severity === "crit" ? "🔴" : "🟠"} *${byId.get(f.projectId)!.name}* (${byId.get(f.projectId)!.country}, ${f.owner}): ${f.text}`);
    message = `${cfg.organisation} projects: ${newFlags.length} new warning${newFlags.length > 1 ? "s" : ""}\n` + lines.join("\n");
  }
  const sentTo = message && !opts.dryRun ? await postChat(ch, message, opts.fetcher) : [];

  // Reminders: one note per lead listing the updates they owe.
  const due = flags.filter(f => f.kind === "Update due" || f.kind === "Gone quiet");
  const byLead = new Map<string, string[]>();
  for (const f of due) byLead.set(f.owner, [...(byLead.get(f.owner) ?? []), `${byId.get(f.projectId)!.name}: ${f.text}`]);
  const reminders: AlertRun["reminders"] = [];
  for (const [lead, items] of byLead) {
    const email = cfg.people.find(x => x.name.toLowerCase() === lead.toLowerCase())?.email;
    const body = `Hi ${lead.split(" ")[0]},\n\nThese project updates are due:\n${items.map(i => "- " + i).join("\n")}\n\nUpdate your board, or reply with the figures and they'll be read in for you.\n`;
    const emailed = !opts.dryRun && email ? await sendEmail(ch, [email], "Project updates due", `<pre style="font:14px/1.5 sans-serif">${body.replace(/</g, "&lt;")}</pre>`, body) : false;
    reminders.push({ lead, items, emailed });
  }

  if (!opts.dryRun) writeJson(stateFile, [...new Set(flags.map(f => f.key))]); // cleared warnings drop out, so they alert again if they return
  return { newFlags, cleared: [...seen].filter(k => !flags.some(f => f.key === k)).length, message, sentTo, reminders };
}
