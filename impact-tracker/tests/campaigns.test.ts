import { describe, expect, it } from "vitest";
import { campaignsOverlapping, summarizeCampaign } from "@/lib/campaigns";
import { isStakeholderVisible, needsApproval } from "@/lib/visibility";

describe("summarizeCampaign", () => {
  it("totals metrics across dates and derives ratios", () => {
    const s = summarizeCampaign(1000, [
      { date: "2026-04-01", metric: "Impressions", value: 10000 },
      { date: "2026-05-01", metric: "impressions", value: 10000 },
      { date: "2026-04-01", metric: "clicks", value: 400 },
      { date: "2026-04-01", metric: "Sign ups", value: 50 },
    ]);
    expect(s.totals).toEqual({ impressions: 20000, clicks: 400, "sign-ups": 50 });
    expect(s.clickThroughRate).toBe(0.02);
    expect(s.costPerSignup).toBe(20);
    expect(s.costPerClick).toBe(2.5);
  });

  it("leaves ratios empty when inputs are missing or zero", () => {
    const s = summarizeCampaign(0, [{ date: "2026-04-01", metric: "clicks", value: 10 }]);
    expect(s.clickThroughRate).toBeNull();
    expect(s.costPerSignup).toBeNull();
    expect(s.costPerClick).toBeNull();
  });
});

describe("campaignsOverlapping", () => {
  const cs = [
    { id: "a", startDate: "2026-01-01", endDate: "2026-01-31" },
    { id: "b", startDate: "2026-03-01", endDate: null },
    { id: "c", startDate: "2026-05-01", endDate: "2026-05-31" },
  ];
  it("keeps campaigns that touch the window, treating open-ended ones as ongoing", () => {
    expect(campaignsOverlapping(cs, "2026-01-15", "2026-04-01").map((c) => c.id)).toEqual(["a", "b"]);
    expect(campaignsOverlapping(cs, "2026-06-01", "2026-07-01").map((c) => c.id)).toEqual(["b"]);
  });
});

describe("stakeholder visibility", () => {
  it("hides AI-generated items until approved", () => {
    expect(isStakeholderVisible({ origin: "human", approvedAt: null })).toBe(true);
    expect(isStakeholderVisible({ origin: "ai", approvedAt: null })).toBe(false);
    expect(isStakeholderVisible({ origin: "ai", approvedAt: new Date() })).toBe(true);
    expect(needsApproval({ origin: "ai", approvedAt: null })).toBe(true);
    expect(needsApproval({ origin: "human", approvedAt: null })).toBe(false);
  });
});
