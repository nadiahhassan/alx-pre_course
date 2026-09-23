import { describe, expect, it } from "vitest";
import {
  buildSeries,
  computeAtRisk,
  countStatuses,
  currentValue,
  evaluateParameter,
  expectedFraction,
  overallRag,
  progressFraction,
  rag,
  type ParameterInput,
} from "@/lib/status";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

// A one-year project: halfway through is 1 July (181 of 365 days, ~0.496).
const timeline = { start: d("2026-01-01"), end: d("2027-01-01") };

const increasing: ParameterInput = {
  baseline: 0,
  target: 100,
  direction: "increase",
  measureType: "point",
  targetDate: null,
};

describe("progressFraction", () => {
  it("measures distance from baseline to target", () => {
    expect(progressFraction(increasing, 0)).toBe(0);
    expect(progressFraction(increasing, 50)).toBe(0.5);
    expect(progressFraction(increasing, 100)).toBe(1);
    expect(progressFraction(increasing, 120)).toBe(1.2);
  });

  it("uses a non-zero baseline", () => {
    expect(progressFraction({ ...increasing, baseline: 20, target: 60 }, 40)).toBe(0.5);
  });

  it("handles decrease targets", () => {
    const p = { ...increasing, direction: "decrease", baseline: 40, target: 20 };
    expect(progressFraction(p, 30)).toBe(0.5);
    expect(progressFraction(p, 20)).toBe(1);
    expect(progressFraction(p, 45)).toBeCloseTo(-0.25);
  });

  it("handles maintain targets where baseline equals target", () => {
    const up = { ...increasing, baseline: 80, target: 80 };
    expect(progressFraction(up, 85)).toBe(1);
    expect(progressFraction(up, 75)).toBe(0);
    const down = { ...up, direction: "decrease" };
    expect(progressFraction(down, 75)).toBe(1);
    expect(progressFraction(down, 85)).toBe(0);
  });
});

describe("expectedFraction", () => {
  it("is linear over the timeline and clamped", () => {
    expect(expectedFraction(d("2026-01-01"), d("2026-01-11"), d("2026-01-06"))).toBe(0.5);
    expect(expectedFraction(d("2026-01-01"), d("2026-01-11"), d("2025-12-01"))).toBe(0);
    expect(expectedFraction(d("2026-01-01"), d("2026-01-11"), d("2026-02-01"))).toBe(1);
  });

  it("treats a target date on or before the start as fully due", () => {
    expect(expectedFraction(d("2026-01-01"), d("2026-01-01"), d("2026-01-01"))).toBe(1);
  });
});

describe("rag", () => {
  it("applies default thresholds of 90% and 70% of expected progress", () => {
    expect(rag(0.45, 0.5)).toBe("green"); // 90%
    expect(rag(0.44, 0.5)).toBe("amber");
    expect(rag(0.35, 0.5)).toBe("amber"); // 70%
    expect(rag(0.34, 0.5)).toBe("red");
  });

  it("is green once the target is reached, whatever the timeline", () => {
    expect(rag(1, 0.1)).toBe("green");
    expect(rag(1.5, 1)).toBe("green");
  });

  it("is green at the very start unless moving the wrong way", () => {
    expect(rag(0, 0)).toBe("green");
    expect(rag(-0.1, 0)).toBe("red");
  });

  it("is red when progress is negative", () => {
    expect(rag(-0.2, 0.5)).toBe("red");
  });

  it("accepts custom thresholds", () => {
    expect(rag(0.4, 0.5, { green: 0.8, amber: 0.5 })).toBe("green");
    expect(rag(0.3, 0.5, { green: 0.8, amber: 0.5 })).toBe("amber");
  });
});

describe("series and current value", () => {
  const entries = [
    { date: d("2026-03-01"), value: 30, confidence: "estimated" },
    { date: d("2026-01-01"), value: 10, confidence: "measured" },
    { date: d("2026-02-01"), value: 20, confidence: "measured" },
  ];

  it("sorts entries and uses the latest value for point measures", () => {
    expect(buildSeries(increasing, entries, d("2026-12-31")).map((p) => p.level)).toEqual([10, 20, 30]);
    expect(currentValue(increasing, entries, d("2026-12-31"))).toBe(30);
  });

  it("adds entries to the baseline for cumulative measures", () => {
    const cumulative = { ...increasing, baseline: 5, measureType: "cumulative" };
    expect(buildSeries(cumulative, entries, d("2026-12-31")).map((p) => p.level)).toEqual([15, 35, 65]);
  });

  it("ignores entries after the as-of date", () => {
    expect(currentValue(increasing, entries, d("2026-02-15"))).toBe(20);
  });

  it("returns null with no entries", () => {
    expect(currentValue(increasing, [], d("2026-12-31"))).toBeNull();
  });
});

describe("evaluateParameter", () => {
  it("is green when on track at the latest measurement", () => {
    const e = evaluateParameter(increasing, [{ date: d("2026-07-01"), value: 50, confidence: "measured" }], timeline, d("2026-07-15"));
    expect(e.status).toBe("green");
    expect(e.current).toBe(50);
    expect(e.expected).toBeCloseTo(0.496, 2);
    expect(e.latestConfidence).toBe("measured");
  });

  it("is amber when somewhat behind", () => {
    const e = evaluateParameter(increasing, [{ date: d("2026-07-01"), value: 40, confidence: "measured" }], timeline, d("2026-07-15"));
    expect(e.status).toBe("amber");
  });

  it("is red when well behind", () => {
    const e = evaluateParameter(increasing, [{ date: d("2026-07-01"), value: 20, confidence: "measured" }], timeline, d("2026-07-15"));
    expect(e.status).toBe("red");
  });

  it("measures expected progress at the latest entry date, not today", () => {
    // Measured on track in April; months later there's no new entry yet.
    const e = evaluateParameter(increasing, [{ date: d("2026-04-01"), value: 25, confidence: "measured" }], timeline, d("2026-09-01"));
    expect(e.status).toBe("green");
  });

  it("uses the parameter's own target date when set", () => {
    // Target due by 1 April: 50 on 1 March is behind (expected ~0.66).
    const early = { ...increasing, targetDate: d("2026-04-01") };
    const e = evaluateParameter(early, [{ date: d("2026-03-01"), value: 50, confidence: "measured" }], timeline, d("2026-03-15"));
    expect(e.status).toBe("amber");
  });

  it("handles decrease targets", () => {
    const p = { ...increasing, direction: "decrease", baseline: 40, target: 20 };
    const onTrack = evaluateParameter(p, [{ date: d("2026-07-01"), value: 30, confidence: "measured" }], timeline, d("2026-07-15"));
    expect(onTrack.status).toBe("green");
    const worse = evaluateParameter(p, [{ date: d("2026-07-01"), value: 42, confidence: "measured" }], timeline, d("2026-07-15"));
    expect(worse.status).toBe("red");
  });

  it("handles cumulative measures", () => {
    const p = { ...increasing, measureType: "cumulative" };
    const entries = [
      { date: d("2026-02-01"), value: 10, confidence: "measured" },
      { date: d("2026-03-01"), value: 10, confidence: "measured" },
    ];
    // 20 of 100 by 1 March, expected ~0.16 -> ahead.
    const e = evaluateParameter(p, entries, timeline, d("2026-03-15"));
    expect(e.current).toBe(20);
    expect(e.status).toBe("green");
  });

  it("reports no-data and not-started", () => {
    expect(evaluateParameter(increasing, [], timeline, d("2026-05-01")).status).toBe("no-data");
    expect(evaluateParameter(increasing, [], timeline, d("2025-12-01")).status).toBe("not-started");
  });
});

describe("computeAtRisk", () => {
  it("flags an outcome whose leading indicator is amber or red", () => {
    const risks = computeAtRisk([
      { id: "outcome", leadingIndicatorForId: null, status: "green" },
      { id: "lead-a", leadingIndicatorForId: "outcome", status: "green" },
      { id: "lead-b", leadingIndicatorForId: "outcome", status: "red" },
    ]);
    expect(risks.get("outcome")).toEqual({ atRisk: true, because: ["lead-b"] });
    expect(risks.get("lead-a")?.atRisk).toBe(false);
  });

  it("does not flag when leading indicators are green or have no data", () => {
    const risks = computeAtRisk([
      { id: "outcome", leadingIndicatorForId: null, status: "red" },
      { id: "lead-a", leadingIndicatorForId: "outcome", status: "green" },
      { id: "lead-b", leadingIndicatorForId: "outcome", status: "no-data" },
    ]);
    expect(risks.get("outcome")?.atRisk).toBe(false);
  });

  it("flags amber indicators and ignores links to unknown parameters", () => {
    const risks = computeAtRisk([
      { id: "outcome", leadingIndicatorForId: null, status: "green" },
      { id: "lead", leadingIndicatorForId: "outcome", status: "amber" },
      { id: "orphan", leadingIndicatorForId: "missing", status: "red" },
    ]);
    expect(risks.get("outcome")?.atRisk).toBe(true);
    expect(risks.has("missing")).toBe(false);
  });
});

describe("portfolio roll-ups", () => {
  it("counts statuses and takes the worst RAG", () => {
    const statuses = ["green", "amber", "green", "no-data"] as const;
    expect(countStatuses([...statuses])).toMatchObject({ green: 2, amber: 1, red: 0, "no-data": 1 });
    expect(overallRag([...statuses])).toBe("amber");
    expect(overallRag(["green", "red"])).toBe("red");
    expect(overallRag(["no-data"])).toBeNull();
  });
});
