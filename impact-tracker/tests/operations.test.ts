import { describe, expect, it } from "vitest";
import { budgetHealth, deadlineState, nextDueDate, riskRating, sumBy } from "@/lib/operations";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const actual = (amount: number) => ({ amount, status: "actual", date: "2026-05-01" });
const committed = (amount: number) => ({ amount, status: "committed", date: "2026-05-01" });

describe("budgetHealth", () => {
  it("is green when spend keeps pace with time", () => {
    const h = budgetHealth(100000, [actual(48000)], 0.5);
    expect(h.status).toBe("green");
    expect(h.forecast).toBe(96000);
    expect(h.remaining).toBe(52000);
  });
  it("flags overspend from the forecast", () => {
    expect(budgetHealth(100000, [actual(52000)], 0.5).status).toBe("amber"); // forecast 104k
    expect(budgetHealth(100000, [actual(60000)], 0.5).status).toBe("red"); // forecast 120k
  });
  it("is red once actual plus committed exceeds the budget", () => {
    const h = budgetHealth(100000, [actual(70000), committed(40000)], 0.5);
    expect(h.status).toBe("red");
    expect(h.label).toBe("Over budget");
  });
  it("flags underspending more than 20 points behind the timeline", () => {
    expect(budgetHealth(100000, [actual(25000)], 0.5).status).toBe("amber");
    expect(budgetHealth(100000, [actual(25000)], 0.5).label).toBe("Underspending");
    expect(budgetHealth(100000, [actual(31000)], 0.5).status).toBe("green");
  });
  it("counts committed spend in the forecast floor", () => {
    const h = budgetHealth(100000, [actual(10000), committed(95000)], 0.2);
    expect(h.forecast).toBe(105000);
    expect(h.status).toBe("red");
  });
  it("only checks hard overspend very early on", () => {
    expect(budgetHealth(100000, [actual(5000)], 0.02).status).toBe("green");
    expect(budgetHealth(0, [], 0.5).status).toBe("no-budget");
  });
});

describe("deadlines", () => {
  const today = d("2026-09-23");
  it("classifies due dates", () => {
    expect(deadlineState(d("2026-09-22"), "open", today)).toBe("overdue");
    expect(deadlineState(d("2026-09-23"), "open", today)).toBe("due-soon");
    expect(deadlineState(d("2026-10-07"), "in-progress", today)).toBe("due-soon");
    expect(deadlineState(d("2026-10-08"), "open", today)).toBe("upcoming");
    expect(deadlineState(d("2026-01-01"), "done", today)).toBe("done");
  });
  it("rolls recurring due dates forward, clamping month ends", () => {
    expect(nextDueDate(d("2026-01-31"), "monthly")?.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(nextDueDate(d("2026-11-15"), "quarterly")?.toISOString().slice(0, 10)).toBe("2027-02-15");
    expect(nextDueDate(d("2026-03-31"), "annually")?.toISOString().slice(0, 10)).toBe("2027-03-31");
    expect(nextDueDate(d("2026-03-31"), "none")).toBeNull();
  });
});

describe("risks", () => {
  it("rates likelihood × impact", () => {
    expect(riskRating(3, 5)).toEqual({ score: 15, rating: "high" });
    expect(riskRating(2, 4)).toEqual({ score: 8, rating: "medium" });
    expect(riskRating(1, 7 - 5)).toEqual({ score: 2, rating: "low" });
  });
});

describe("sumBy", () => {
  it("totals by key", () => {
    expect(sumBy([{ c: "a", v: 1 }, { c: "b", v: 2 }, { c: "a", v: 3 }], (x) => x.c, (x) => x.v)).toEqual({ a: 4, b: 2 });
  });
});
