import { describe, expect, it } from "vitest";
import { buildPayload, type PayloadSource } from "@/lib/payload";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const now = new Date();

function source(): PayloadSource {
  const project = {
    id: "proj", focusAreaId: null, name: "P", description: "", ownerId: null, startDate: d("2026-01-01"), endDate: d("2026-12-31"),
    budget: null, currency: "GBP", region: "", status: "active",
    tocInputs: "", tocActivities: "", tocOutputs: "", tocOutcomes: "", tocImpact: "",
    archivedAt: null, createdAt: now, updatedAt: now,
  };
  const param = {
    id: "m1", projectId: "proj", name: "M", definition: "", level: "output", unit: "", direction: "increase",
    measureType: "point", baseline: 0, target: 100, targetDate: null, frequency: "monthly", dataSource: "",
    isKey: true, audience: "external", leadingIndicatorForId: null, libraryItemId: null, origin: "human", approvedById: null,
    approvedAt: null, sortOrder: 0, archivedAt: null, createdAt: now, updatedAt: now,
  };
  const entry = (date: string, value: number) => ({
    id: date, parameterId: "m1", date: d(date), value, note: "", confidence: "measured", loggedById: null, createdAt: now, updatedAt: now,
  });
  const evidence = (id: string, date: string, origin: string, approvedAt: Date | null) => ({
    id, projectId: "proj", parameterId: "m1", type: "quote", title: id, body: "", source: "", url: "", date: d(date),
    tags: "a, b", origin, approvedById: null, approvedAt, createdAt: now, updatedAt: now,
  });
  return {
    project,
    parameters: [{ ...param, entries: [entry("2026-03-01", 20), entry("2026-06-01", 50)] }],
    campaigns: [
      {
        id: "c1", projectId: "proj", name: "C1", channel: "email", startDate: d("2026-02-01"), endDate: d("2026-02-28"),
        spend: 100, trackingTag: "", audience: "external", notes: "", createdAt: now, updatedAt: now,
        metrics: [
          { id: "x", campaignId: "c1", date: d("2026-02-01"), metric: "sign-ups", value: 10 },
          { id: "y", campaignId: "c1", date: d("2026-05-01"), metric: "sign-ups", value: 10 },
        ],
      },
      {
        id: "c2", projectId: "proj", name: "C2", channel: "events", startDate: d("2026-05-01"), endDate: null,
        spend: 0, trackingTag: "", audience: "external", notes: "", createdAt: now, updatedAt: now, metrics: [],
      },
    ],
    evidence: [
      evidence("human", "2026-02-01", "human", null),
      evidence("ai-pending", "2026-02-01", "ai", null),
      evidence("ai-approved", "2026-02-01", "ai", now),
      evidence("later", "2026-08-01", "human", null),
    ],
  };
}

describe("buildPayload", () => {
  it("drops unapproved AI items for stakeholder views", () => {
    const safe = buildPayload(source(), d("2026-12-31"), { stakeholderSafe: true });
    expect(safe.evidence.map((e) => e.id).sort()).toEqual(["ai-approved", "human", "later"]);
    const full = buildPayload(source(), d("2026-12-31"), { stakeholderSafe: false });
    expect(full.evidence).toHaveLength(4);
    expect(full.evidence.find((e) => e.id === "ai-pending")?.approved).toBe(false);
    expect(full.evidence[0].tags).toEqual(["a", "b"]);
  });

  it("only includes what was known at the as-of date", () => {
    const p = buildPayload(source(), d("2026-04-01"), { stakeholderSafe: true });
    expect(p.dashboard.metrics[0].current).toBe(20);
    expect(p.campaigns.map((c) => c.id)).toEqual(["c1"]);
    expect(p.campaigns[0].totals["sign-ups"]).toBe(10);
    expect(p.evidence.map((e) => e.id)).not.toContain("later");
  });
});
