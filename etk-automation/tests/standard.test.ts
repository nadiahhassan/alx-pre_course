import { describe, expect, it } from "vitest";
import { isoDate, normalizeProjects, normalizeRisks, num } from "../src/standard.js";

const row = (fields: Record<string, unknown>, id = "1") => ({ id, fields });
const base = { Project: "Cocoa compliance", Country: "Ivory Coast", Lead: "Aya", "Start date": "2026-01-01", "End date": "2026-12-31", "Budget (USD)": "$120,000", "Metric 1": "Farms mapped", "Metric 1 target": "3000", "Metric 1 actual": "1,500" };

describe("standard board", () => {
  it("reads numbers and dates the way people type them", () => {
    expect(num("$1,250")).toBe(1250); expect(num("45%")).toBe(45); expect(num("2.5m")).toBe(2500000); expect(num("tbc")).toBeNull();
    expect(isoDate("21/11/2026")).toBe("2026-11-21"); expect(isoDate("2026-11-21T09:00:00Z")).toBe("2026-11-21"); expect(isoDate("46347")).toBe("2026-11-21");
  });

  it("turns a row into a project, resolving the country and metric type", () => {
    const { rows, issues } = normalizeProjects([row({ ...base, "Metric 2": "Suppliers with files", "Metric 2 unit": "%", "Metric 2 target": "100", "Metric 2 actual": "71", "Milestone 1": "Mapping done", "Milestone 1 due": "2026-10-01", "Milestone 1 done": "yes" })], "ci", {}, "2026-11-21");
    expect(issues).toEqual([]);
    const p = rows[0];
    expect(p).toMatchObject({ id: "ci:1", country: "Côte d'Ivoire", countryCode: "384", budget: 120000 });
    expect(p.metrics.map(m => [m.id, m.mode, m.unit, m.history[0]?.value])).toEqual([["farms-mapped", "count", "", 1500], ["suppliers-with-files", "rate", "%", 71]]);
    expect(p.milestones[0].done).toBe("2026-11-21");
  });

  it("uses a board's own column names through the field map", () => {
    const { rows } = normalizeProjects([row({ Name: "X", Location: "Kenya", Owner: "W", From: "2026-01-01", To: "2026-06-30", Value: "10k", "KPI": "Visits", "KPI goal": "10" })], "ke", { project: "Name", country: "Location", lead: "Owner", start: "From", end: "To", budget: "Value", metric1: "KPI", metric1_target: "KPI goal" }, "2026-03-01");
    expect(rows[0]).toMatchObject({ name: "X", country: "Kenya", lead: "W", budget: 10000 });
  });

  it("lists every problem instead of failing", () => {
    const { rows, issues } = normalizeProjects([row({ Project: "Y", Country: "Narnia" }), row({ Country: "Ghana" }, "2")], "b", {}, "2026-03-01");
    expect(rows).toHaveLength(1);
    expect(issues.join(" ")).toMatch(/Missing columns: Lead, Start date, End date, Budget \(USD\), Metric 1, Metric 1 target/);
    expect(issues.join(" ")).toMatch(/“Narnia” isn't recognised/);
    expect(issues.join(" ")).toMatch(/no project name/);
  });

  it("links risks to projects by name and clamps scores", () => {
    const { rows: projects } = normalizeProjects([row(base)], "ci", {}, "2026-11-21");
    const { rows, issues } = normalizeRisks([row({ Project: "cocoa compliance", Risk: "Titles missing", "Likelihood (1-5)": "9", "Impact (1-5)": "2" }), row({ Project: "Nope", Risk: "R" }, "2")], "risks", {}, projects, "2026-11-21");
    expect(rows[0]).toMatchObject({ projectId: "ci:1", likelihood: 5, impact: 2, owner: "Aya", status: "Open" });
    expect(issues).toEqual(["Risk “R”: no project called “Nope”."]);
  });
});
