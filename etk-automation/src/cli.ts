#!/usr/bin/env -S npx tsx
// Command line for the ETK project automation. Run `npm run etk -- help` for the list.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAlerts } from "./alerts.js";
import { loadConfig, resolvePath, type Config } from "./config.js";
import { toDashboard } from "./export.js";
import { applyApproved, claudeExtractor, loadPending, pendingFile, runIntake } from "./intake.js";
import { channelsFromEnv, sendEmail } from "./notify.js";
import { aiSummary, buildReport } from "./report.js";
import { projectStatus, STATUS_LABEL } from "./rules.js";
import { loadPortfolio, savePortfolio, writeJson } from "./store.js";
import { syncAll } from "./sync.js";
import { buildInventory, buildStandardTemplate } from "./templates.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = () => process.env.ETK_TODAY || new Date().toISOString().slice(0, 10);
const hasKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const args = process.argv.slice(2);
const flag = (name: string) => { const k = args.indexOf(`--${name}`); return k >= 0 ? args[k + 1] : undefined; };
const has = (name: string) => args.includes(`--${name}`);
const cfgPath = () => path.resolve(flag("config") ?? path.join(ROOT, "config", "boards.json"));

async function cmdSync(cfg: Config) {
  const { portfolio, changes, health } = await syncAll(cfg, loadPortfolio(cfg), { today: today(), only: flag("board") });
  savePortfolio(cfg, portfolio);
  for (const h of health) {
    console.log(`${h.ok ? "✓" : "!"} ${h.boardName} (${h.tool}): ${h.items} items${h.issues.length ? "" : ", no problems"}`);
    for (const i of h.issues) console.log(`    ${i}`);
  }
  console.log(`${changes} change${changes === 1 ? "" : "s"} recorded. ${portfolio.projects.filter(p => !p.archived).length} active projects.`);
}

async function cmdIntake(cfg: Config) {
  if (!hasKey()) { console.log("Skipped reading emails: set ANTHROPIC_API_KEY (or sign in with `ant auth login`) to turn on AI intake."); return; }
  const r = await runIntake(cfg, loadPortfolio(cfg), claudeExtractor(cfg.ai.model));
  console.log(`Read ${r.read} file${r.read === 1 ? "" : "s"}; ${r.queued} change${r.queued === 1 ? "" : "s"} waiting for approval.${r.read ? " Run `npm run etk -- review` to check them." : ""}`);
  for (const f of r.failed) console.log(`  Couldn't read ${f}`);
}

function cmdReview(cfg: Config) {
  const open = loadPending(cfg).filter(e => e.changes.some(c => c.status === "pending"));
  if (!open.length) { console.log("Nothing waiting for approval."); return; }
  for (const e of open) {
    console.log(`\n${e.id}  ${e.subject}${e.from ? `  (from ${e.from})` : ""}`);
    for (const c of e.changes.filter(x => x.status === "pending")) console.log(`  [${c.id}] ${c.summary}\n         “${c.evidence}”`);
    for (const u of e.unmatched) console.log(`  (not matched) ${u}`);
  }
  console.log("\nApprove with `npm run etk -- approve <id …>` or `approve all`. Reject with `reject <id …>` or `reject all`.");
}

function cmdDecide(cfg: Config, approve: boolean) {
  const ids = args.slice(1).filter(a => !a.startsWith("--"));
  if (!ids.length) { console.log(`Say which changes, e.g. \`${approve ? "approve" : "reject"} E20261121-001-1\`, or \`all\`.`); return; }
  const all = ids.includes("all"), pending = loadPending(cfg);
  let portfolio = loadPortfolio(cfg), n = 0;
  for (const e of pending) {
    const mine = all ? e.changes.filter(c => c.status === "pending").map(c => c.id) : e.changes.filter(c => ids.includes(c.id) || ids.includes(e.id)).map(c => c.id);
    if (!mine.length) continue;
    if (approve) { const r = applyApproved(portfolio, e, mine, today()); portfolio = r.portfolio; n += r.applied; }
    else for (const c of e.changes) if (mine.includes(c.id) && c.status === "pending") { c.status = "rejected"; n++; }
  }
  if (approve) savePortfolio(cfg, portfolio);
  writeJson(pendingFile(cfg), pending);
  console.log(`${approve ? "Approved and saved" : "Rejected"} ${n} change${n === 1 ? "" : "s"}.`);
}

async function cmdAlerts(cfg: Config) {
  const r = await runAlerts(cfg, loadPortfolio(cfg), today(), channelsFromEnv(cfg.reports.from), { dryRun: has("dry-run") });
  console.log(r.message || "No new warnings.");
  console.log(r.sentTo.length ? `Sent to ${r.sentTo.join(" and ")}.` : r.message ? "(No Slack or Teams webhook set, so printed here only.)" : "");
  for (const x of r.reminders) console.log(`Reminder for ${x.lead}${x.emailed ? " (emailed)" : ""}: ${x.items.length} update${x.items.length === 1 ? "" : "s"} due.`);
}

async function cmdReport(cfg: Config) {
  const p = loadPortfolio(cfg);
  let summary: string | undefined;
  if (has("ai")) { if (hasKey()) summary = await aiSummary(cfg, buildReport(cfg, p, today()).markdown); else console.log("Skipped the AI summary: no API key set."); }
  const r = buildReport(cfg, p, today(), summary);
  const dir = resolvePath(cfg, cfg.paths.reports);
  mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `weekly-${today()}`);
  writeFileSync(base + ".md", r.markdown); writeFileSync(base + ".html", r.html);
  console.log(`Report written to ${base}.md and .html`);
  if (has("send")) console.log(await sendEmail(channelsFromEnv(cfg.reports.from), cfg.reports.recipients, r.title, r.html, r.text) ? `Emailed to ${cfg.reports.recipients.join(", ")}.` : "Not emailed: set SMTP_HOST and reports.recipients to send it.");
}

function cmdExport(cfg: Config) {
  const dir = resolvePath(cfg, cfg.paths.exports), file = path.join(dir, "dashboard-data.json");
  const d = toDashboard(cfg, loadPortfolio(cfg));
  writeJson(file, d);
  console.log(`Dashboard file written to ${file} (${d.projects.length} projects, ${d.risks.length} risks, ${d.staff.length} people). Load it from “Bring in updates” > “Live data file”.`);
}

function cmdStatus(cfg: Config) {
  const p = loadPortfolio(cfg), t = today();
  for (const x of p.projects.filter(y => !y.archived)) console.log(`${STATUS_LABEL[projectStatus(x, t)].padEnd(10)} ${x.country.padEnd(16)} ${x.name}`);
}

async function cmdTemplates() {
  const dir = path.join(ROOT, "templates");
  mkdirSync(dir, { recursive: true });
  await buildStandardTemplate(path.join(dir, "standard-board-template.xlsx"));
  await buildInventory(path.join(dir, "board-inventory.xlsx"));
  console.log(`Templates written to ${dir}`);
}

/** End-to-end run on the example boards, with no accounts needed. Writes into demo-output/. */
async function cmdDemo() {
  process.env.ETK_TODAY ||= "2026-11-21"; // the example boards are dated around this day
  const out = path.join(ROOT, "demo-output");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(path.join(out, "config"), { recursive: true });
  cpSync(path.join(ROOT, "examples"), path.join(out, "examples"), { recursive: true });
  cpSync(path.join(ROOT, "examples", "inbox"), path.join(out, "inbox"), { recursive: true });
  cpSync(path.join(ROOT, "config", "demo.json"), path.join(out, "config", "boards.json"));
  const cfg = loadConfig(path.join(out, "config", "boards.json"));
  console.log("1. Sync the example boards\n");      await cmdSync(cfg);
  console.log("\n2. Read the example emails\n");    await cmdIntake(cfg);
  console.log("\n3. Warnings\n");                   await runAlerts(cfg, loadPortfolio(cfg), today(), {}, { dryRun: true }).then(r => console.log(r.message || "No new warnings."));
  console.log("\n4. Weekly report\n");              await cmdReport(cfg);
  console.log("\n5. Dashboard file\n");             cmdExport(cfg);
  console.log(`\nDone. Everything is in ${out}`);
}

const HELP = `ETK project automation

  sync [--board <id>]     Pull every board into the portfolio and check each board's columns
  intake                  Read emails in the inbox folder with AI and queue the changes
  review                  Show changes waiting for approval
  approve <id …|all>      Save approved changes
  reject <id …|all>       Drop changes
  alerts [--dry-run]      Send new warnings to Slack/Teams and update reminders to leads
  report [--ai] [--send]  Write the weekly report (optionally with an AI summary, and email it)
  export                  Write the file the dashboard loads
  status                  One line per project with its status
  run                     sync, intake, alerts and export in one go (for a scheduler)
  templates               Build the board inventory and standard board template (Excel)
  demo                    Try everything on the example boards, no accounts needed

Options: --config <file> (default config/boards.json). Set ETK_TODAY=YYYY-MM-DD to run as if on another day.`;

async function main() {
  const cmd = args[0] ?? "help";
  if (cmd === "help" || cmd === "--help") return console.log(HELP);
  if (cmd === "templates") return cmdTemplates();
  if (cmd === "demo") return cmdDemo();
  const cfg = loadConfig(cfgPath());
  switch (cmd) {
    case "sync": return cmdSync(cfg);
    case "intake": return cmdIntake(cfg);
    case "review": return cmdReview(cfg);
    case "approve": return cmdDecide(cfg, true);
    case "reject": return cmdDecide(cfg, false);
    case "alerts": return cmdAlerts(cfg);
    case "report": return cmdReport(cfg);
    case "export": return cmdExport(cfg);
    case "status": return cmdStatus(cfg);
    case "run": await cmdSync(cfg); await cmdIntake(cfg); await cmdAlerts(cfg); return cmdExport(cfg);
    default: console.log(`Unknown command “${cmd}”.\n\n${HELP}`); process.exitCode = 1;
  }
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
