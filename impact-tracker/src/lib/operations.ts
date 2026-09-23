// Operations calculations: budget health, responsibility deadlines and risk
// ratings. Pure functions, tested in tests/operations.test.ts.

import type { Rag } from "./status";

export interface SpendInput {
  amount: number;
  status: string; // actual | committed
  date: Date | string;
}

export interface BudgetHealth {
  status: Rag | "no-budget";
  label: string;
  budget: number;
  actual: number;
  committed: number;
  remaining: number;
  /** Share of the budget paid so far. */
  spentShare: number;
  /** Share of the timeline elapsed. */
  elapsed: number;
  /** Year-end spend if paying continues at the current pace (never less than actual + committed). */
  forecast: number;
}

/**
 * Budget health compares spend with time:
 * - red: actual + committed already exceed the budget, or the forecast is over 110% of it
 * - amber: forecast between 100% and 110% of budget (overspending), or paid spend is
 *   more than 20 points behind the timeline (underspending: money may go unused)
 * - green: otherwise
 * Early in the timeline (under 10% elapsed) the pace isn't meaningful, so only
 * the hard overspend check applies.
 */
export function budgetHealth(budget: number, spend: SpendInput[], elapsed: number): BudgetHealth {
  const actual = spend.filter((s) => s.status !== "committed").reduce((n, s) => n + s.amount, 0);
  const committed = spend.filter((s) => s.status === "committed").reduce((n, s) => n + s.amount, 0);
  const pace = elapsed > 0 ? actual / elapsed : actual;
  const forecast = Math.max(actual + committed, elapsed >= 0.1 ? pace : actual + committed);
  const base = { budget, actual, committed, remaining: budget - actual - committed, spentShare: budget > 0 ? actual / budget : 0, elapsed, forecast };

  if (budget <= 0) return { ...base, status: "no-budget", label: "No budget set" };
  if (actual + committed > budget) return { ...base, status: "red", label: "Over budget" };
  if (elapsed >= 0.1) {
    if (forecast > budget * 1.1) return { ...base, status: "red", label: "Forecast well over budget" };
    if (forecast > budget) return { ...base, status: "amber", label: "Forecast over budget" };
    if (base.spentShare < elapsed - 0.2) return { ...base, status: "amber", label: "Underspending" };
  }
  return { ...base, status: "green", label: "On budget" };
}

export type DeadlineState = "done" | "overdue" | "due-soon" | "upcoming";

export const DUE_SOON_DAYS = 14;

/** Where a responsibility stands against its due date. */
export function deadlineState(dueDate: Date, status: string, today: Date): DeadlineState {
  if (status === "done") return "done";
  const days = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due-soon";
  return "upcoming";
}

/** Next due date for a recurring responsibility; null if it doesn't recur. Keeps month-end dates sensible. */
export function nextDueDate(dueDate: Date, recurrence: string): Date | null {
  const months = { monthly: 1, quarterly: 3, annually: 12 }[recurrence];
  if (!months) return null;
  const y = dueDate.getUTCFullYear();
  const m = dueDate.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(dueDate.getUTCDate(), lastDay)));
}

export type RiskRating = "high" | "medium" | "low";

/** Risk score = likelihood × impact (each 1–5). High ≥ 15, medium 8–14, low below 8. */
export function riskRating(likelihood: number, impact: number): { score: number; rating: RiskRating } {
  const score = likelihood * impact;
  return { score, rating: score >= 15 ? "high" : score >= 8 ? "medium" : "low" };
}

/** Totals by key, e.g. spend by category or by month. */
export function sumBy<T>(items: T[], key: (t: T) => string, value: (t: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[key(i)] = (out[key(i)] ?? 0) + value(i);
  return out;
}
