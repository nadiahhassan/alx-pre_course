import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAlerts } from "../src/alerts.js";
import { toDashboard } from "../src/export.js";
import { applyApproved, claudeExtractor, loadPending, runIntake, validate, type Extracted } from "../src/intake.js";
import { emptyPortfolio, type Portfolio } from "../src/model.js";
import { buildReport } from "../src/report.js";
import { projectFlags, projectStatus } from "../src/rules.js";
import { savePortfolio, loadPortfolio } from "../src/store.js";
import { syncAll } from "../src/sync.js";
import { tmpConfig } from "./helpers.js";

const HEAD = "Project,Country,Lead,Start date,End date,Budget (USD),Spent to date (USD),Update frequency,Last update,Metric 1,Metric 1 unit,Metric 1 target,Metric 1 actual,Milestone 1,Milestone 1 due,Milestone 1 done";
function setup(rows: string[], risks?: string[]) {
  const cfg = tmpConfig();
  mkdirSync(path.join(cfg.dir, "b"), { recursive: true });
  writeFileSync(path.join(cfg.dir, "b", "p.csv"), [HEAD, ...rows].join("\n"));
  cfg.boards = [{ id: "ng", name: "Nigeria", kind: "projects", source: { tool: "sheet", path: "b/p.csv" }, fields: {}, enabled: true }];
  if (risks) {
    writeFileSync(path.join(cfg.dir, "b", "r.csv"), ["Risk ID,Project,Risk,Likelihood (1-5),Impact (1-5),Status", ...risks].join("\n"));
    cfg.boards.push({ id: "risks", name: "Risks", kind: "risks", source: { tool: "sheet", path: "b/r.csv" }, fields: {}, enabled: true });
  }
  return cfg;
}
const write = (cfg: ReturnType<typeof tmpConfig>, rows: string[]) => writeFileSync(path.join(cfg.dir, "b", "p.csv"), [HEAD, ...rows].join("\n"));

describe("sync", () => {
  it("keeps history, logs changes and archives removed items", async () => {
    const cfg = setup(["Mission,Nigeria,Tunde,2026-01-01,2026-12-31,1000,100,Monthly,2026-03-01,Meetings,Number,100,20,Report,2026-06-01,"]);
    let r = await syncAll(cfg, emptyPortfolio(), { today: "2026-03-01" });
    expect(r.portfolio.feed.map(f => f.text)).toEqual(["New project added from Spreadsheet: Nigeria."]);
    write(cfg, ["Mission,Nigeria,Tunde,2026-01-01,2026-12-31,1000,250,Monthly,2026-04-01,Meetings,Number,100,35,Report,2026-06-01,yes"]);
    r = await syncAll(cfg, r.portfolio, { today: "2026-04-01" });
    const p = r.portfolio.projects[0];
    expect(p.metrics[0].history.map(h => [h.date, h.value])).toEqual([["2026-03-01", 20], ["2026-04-01", 35]]);
    expect(r.portfolio.feed.slice(1).map(f => f.text)).toEqual(["Meetings: 20 → 35.", "Spend updated to $250 (was $100).", "Milestone done: Report."]);
    write(cfg, []);
    r = await syncAll(cfg, r.portfolio, { today: "2026-04-02" });
    expect(r.portfolio.projects[0].archived).toBe(true);
  });

  it("records a broken board without losing the others' data", async () => {
    const cfg = setup(["A,Nigeria,T,2026-01-01,2026-12-31,1000,0,Monthly,2026-03-01,M,Number,10,5,,,"]);
    cfg.boards.push({ id: "bad", name: "Missing file", kind: "projects", source: { tool: "sheet", path: "b/none.csv" }, fields: {}, enabled: true });
    const r = await syncAll(cfg, emptyPortfolio(), { today: "2026-03-01" });
    expect(r.portfolio.projects).toHaveLength(1);
    expect(r.health.find(h => h.boardId === "bad")).toMatchObject({ ok: false });
  });
});

describe("rules", () => {
  it("scores running totals against time and rates against target, matching the dashboard", async () => {
    const cfg = setup(["Half,Nigeria,T,2026-01-01,2026-12-31,1000,900,Weekly,2026-07-01,M,Number,100,30,Late,2026-06-01,", "Rate,Nigeria,T,2026-01-01,2026-12-31,1000,0,Monthly,2026-07-01,Pass rate,%,80,72,,,"]);
    const { portfolio } = await syncAll(cfg, emptyPortfolio(), { today: "2026-07-02" });
    const [half, rate] = portfolio.projects;
    expect(projectStatus(half, "2026-07-02")).toBe("crit"); // 30% done with ~50% of time gone
    expect(projectStatus(rate, "2026-07-02")).toBe("good"); // 72 of 80 = 90%
    expect(projectFlags(half, "2026-07-02").map(f => f.kind)).toEqual(["Metric", "Budget", "Milestone"]);
  });
});

describe("AI intake", () => {
  const portfolioWith = async () => {
    const cfg = setup(["Kestrel,Nigeria,Adaeze,2026-01-01,2026-12-31,90000,82000,Monthly,2026-11-01,Compliance met,%,100,74,Licence filed,2026-11-01,"]);
    const { portfolio } = await syncAll(cfg, emptyPortfolio(), { today: "2026-11-01" });
    savePortfolio(cfg, portfolio);
    return { cfg, portfolio };
  };
  const extraction = (p: Portfolio): Extracted => ({
    changes: [
      { type: "metric", project_id: p.projects[0].id, metric_id: "compliance-met", value: 86, milestone: null, risk_title: null, risk_category: null, likelihood: null, impact: null, evidence: "checklist is now at 86%" },
      { type: "milestone_done", project_id: p.projects[0].id, metric_id: null, value: null, milestone: "Licence filed", risk_title: null, risk_category: null, likelihood: null, impact: null, evidence: "we filed the licence application" },
      { type: "spent", project_id: p.projects[0].id, metric_id: null, value: 85500, milestone: null, risk_title: null, risk_category: null, likelihood: null, impact: null, evidence: "Spend to date is $85,500" },
      { type: "risk", project_id: p.projects[0].id, metric_id: null, value: null, milestone: null, risk_title: "Licence decision slips", risk_category: "Regulatory", likelihood: 4, impact: 4, evidence: "expect the decision to slip" },
      { type: "metric", project_id: "nope", metric_id: "x", value: 1, milestone: null, risk_title: null, risk_category: null, likelihood: null, impact: null, evidence: "unknown" },
    ],
    unmatched: ["printer is broken"],
  });

  it("drops anything that doesn't match the portfolio instead of guessing", async () => {
    const { portfolio } = await portfolioWith();
    const { changes, unmatched } = validate(extraction(portfolio), portfolio, "E1");
    expect(changes.map(c => c.type)).toEqual(["metric", "milestone_done", "spent", "risk"]);
    expect(unmatched).toEqual(["printer is broken", "Unknown project nope: unknown"]);
  });

  it("queues changes from inbox files, and only approved ones reach the portfolio", async () => {
    const { cfg, portfolio } = await portfolioWith();
    mkdirSync(path.join(cfg.dir, "inbox"), { recursive: true });
    writeFileSync(path.join(cfg.dir, "inbox", "a.txt"), "From: Adaeze\nSubject: Kestrel update\n\nWe filed it.");
    const r = await runIntake(cfg, portfolio, async () => extraction(portfolio), new Date("2026-11-21T10:00:00Z"));
    expect(r).toMatchObject({ read: 1, queued: 4, failed: [] });
    expect(readdirSync(path.join(cfg.dir, "inbox", "processed"))).toEqual(["a.txt"]);
    const [email] = loadPending(cfg);
    expect(email).toMatchObject({ from: "Adaeze", subject: "Kestrel update" });
    expect(loadPortfolio(cfg).projects[0].spent).toBe(82000); // nothing applied yet
    const { portfolio: after, applied } = applyApproved(loadPortfolio(cfg), email, [email.changes[0].id, email.changes[2].id], "2026-11-21");
    expect(applied).toBe(2);
    expect(after.projects[0].spent).toBe(85500);
    expect(after.projects[0].metrics[0].history.at(-1)).toMatchObject({ value: 86 });
    expect(after.projects[0].milestones[0].done).toBeNull(); // not approved
    expect(email.changes.map(c => c.status)).toEqual(["approved", "pending", "approved", "pending"]);
  });

  it("moves an email that fails to inbox/failed", async () => {
    const { cfg, portfolio } = await portfolioWith();
    mkdirSync(path.join(cfg.dir, "inbox"), { recursive: true });
    writeFileSync(path.join(cfg.dir, "inbox", "b.txt"), "x");
    const r = await runIntake(cfg, portfolio, async () => { throw new Error("boom"); });
    expect(r.failed).toEqual(["b.txt: boom"]);
    expect(readdirSync(path.join(cfg.dir, "inbox", "failed"))).toEqual(["b.txt"]);
  });

  it("sends Claude a structured-output request with refusal fallbacks, and parses the reply", async () => {
    const { portfolio } = await portfolioWith();
    let sent: Record<string, unknown> = {};
    const reply = extraction(portfolio);
    const fake = { beta: { messages: { create: async (body: Record<string, unknown>) => { sent = body; return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(reply) }] }; } } } };
    const out = await claudeExtractor("claude-opus-5-5", fake as never)("email text", "[]");
    expect(out.changes).toHaveLength(5);
    expect(sent).toMatchObject({ model: "claude-opus-5-5", betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: { effort: "medium", format: { type: "json_schema" } } });
    const schema = (sent.output_config as { format: { schema: { additionalProperties: boolean } } }).format.schema;
    expect(schema.additionalProperties).toBe(false);
  });

  it("refuses to guess when Claude declines", async () => {
    const fake = { beta: { messages: { create: async () => ({ stop_reason: "refusal", content: [] }) } } };
    await expect(claudeExtractor("claude-opus-5-5", fake as never)("x", "[]")).rejects.toThrow(/declined/);
  });
});

describe("alerts, report and export", () => {
  it("alerts once per warning and posts to the webhook", async () => {
    const cfg = setup(["Late,Nigeria,T,2026-01-01,2026-12-31,1000,1200,Monthly,2026-07-01,M,Number,100,10,,,"], ["R-1,Late,Costs,5,4,Open"]);
    const { portfolio } = await syncAll(cfg, emptyPortfolio(), { today: "2026-07-02" });
    const posts: string[] = [];
    const f = (async (_u: string, init?: RequestInit) => { posts.push(String(init?.body)); return new Response("ok"); }) as unknown as typeof fetch;
    const first = await runAlerts(cfg, portfolio, "2026-07-02", { slack: "https://hooks.slack.test/x" }, { fetcher: f });
    expect(first.newFlags.map(x => x.kind).sort()).toEqual(["Budget", "Metric", "Risk"]);
    expect(first.sentTo).toEqual(["Slack"]);
    expect(posts[0]).toMatch(/Overspent/);
    const second = await runAlerts(cfg, portfolio, "2026-07-02", { slack: "https://hooks.slack.test/x" }, { fetcher: f });
    expect(second.newFlags).toEqual([]);
    expect(posts).toHaveLength(1);
  });

  it("writes a report and a dashboard file the dashboard can load", async () => {
    const cfg = setup(["Mission,Nigeria,Tunde,2026-01-01,2026-12-31,1000,100,Monthly,2026-03-01,Meetings,Number,100,20,,,"], ["R-1,Mission,Visas,2,2,Open"]);
    cfg.people = [{ name: "Tunde", role: "PM", base: "UK", capacity: 3 }];
    const { portfolio } = await syncAll(cfg, emptyPortfolio(), { today: "2026-03-01" });
    const rep = buildReport(cfg, portfolio, "2026-03-01");
    expect(rep.markdown).toMatch(/1 active projects in 1 countries/);
    expect(rep.html).toMatch(/#C82227/);
    const d = toDashboard(cfg, portfolio);
    expect(d.kind).toBe("etk-portfolio");
    expect(d.staff[0]).toMatchObject({ id: "s1", name: "Tunde", base: "826" });
    expect(d.projects[0]).toMatchObject({ country: "566", lead: "s1" });
    expect(d.risks[0].pid).toBe(d.projects[0].id);
    expect(new Set(d.feed.map(f => f.pid)).size).toBeGreaterThan(0);
    expect(d.countries["566"].name).toBe("Nigeria");
  });
});

describe("export ids", () => {
  it("gives every project on a board its own dashboard id", async () => {
    const { shortId } = await import("../src/export.js");
    const ids = Array.from({ length: 500 }, (_, k) => shortId(`nigeria:row-${k + 2}`));
    expect(new Set(ids).size).toBe(500);
    expect(shortId("nigeria:row-2")).toBe(shortId("nigeria:row-2"));
  });
});
