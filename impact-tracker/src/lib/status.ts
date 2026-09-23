// Status calculations: progress vs target, red / amber / green, and at-risk.
// Pure functions with no database access, so they are easy to test and can be
// reused for live dashboards and frozen snapshots alike.

import type { Confidence, Direction, MeasureType } from "./constants";

export type Rag = "green" | "amber" | "red";
export type Status = Rag | "no-data" | "not-started";

export interface Thresholds {
  /** Minimum share of expected progress for green (e.g. 0.9 = 90%). */
  green: number;
  /** Minimum share of expected progress for amber. Below this is red. */
  amber: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { green: 0.9, amber: 0.7 };

export interface ParameterInput {
  baseline: number;
  target: number;
  direction: Direction | string;
  measureType: MeasureType | string;
  targetDate: Date | null;
}

export interface EntryInput {
  date: Date;
  value: number;
  confidence: Confidence | string;
}

export interface Timeline {
  start: Date;
  /** Project end; used when the parameter has no target date. */
  end: Date;
}

export interface SeriesPoint {
  date: Date;
  /** Raw entry value. */
  value: number;
  /** Value on the target's scale: the latest value, or the running total for cumulative measures. */
  level: number;
  confidence: string;
}

export interface Evaluation {
  status: Status;
  /** Current value on the target's scale, or null with no data. */
  current: number | null;
  /** Share of the baseline-to-target distance covered (0 = baseline, 1 = target). Can exceed 1 or be negative. */
  progress: number | null;
  /** Share of the timeline elapsed at the latest measurement (0..1). */
  expected: number | null;
  /** progress / expected, or null when not meaningful. */
  ratio: number | null;
  latestDate: Date | null;
  latestConfidence: string | null;
  series: SeriesPoint[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Entries up to `asOf`, oldest first. */
function entriesUpTo(entries: EntryInput[], asOf: Date): EntryInput[] {
  return entries
    .filter((e) => e.date.getTime() <= asOf.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Build the trend series: running total for cumulative measures, raw values otherwise. */
export function buildSeries(param: ParameterInput, entries: EntryInput[], asOf: Date): SeriesPoint[] {
  let running = param.baseline;
  return entriesUpTo(entries, asOf).map((e) => {
    running += e.value;
    return {
      date: e.date,
      value: e.value,
      level: param.measureType === "cumulative" ? running : e.value,
      confidence: e.confidence,
    };
  });
}

/** Current value on the target's scale, or null if nothing has been logged yet. */
export function currentValue(param: ParameterInput, entries: EntryInput[], asOf: Date): number | null {
  const series = buildSeries(param, entries, asOf);
  return series.length ? series[series.length - 1].level : null;
}

/**
 * Share of the way from baseline to target. Direction is implied by the sign
 * of (target - baseline), so "reduce from 40 to 20" works the same as
 * "grow from 20 to 40". When baseline equals target (a "maintain" metric),
 * the result is 1 when on the right side of the target and 0 otherwise.
 */
export function progressFraction(param: ParameterInput, current: number): number {
  const span = param.target - param.baseline;
  if (span === 0) {
    const ok = param.direction === "decrease" ? current <= param.target : current >= param.target;
    return ok ? 1 : 0;
  }
  return (current - param.baseline) / span;
}

/** Share of the timeline (start to target date) elapsed at `at`, clamped to 0..1. */
export function expectedFraction(start: Date, targetDate: Date, at: Date): number {
  const total = targetDate.getTime() - start.getTime();
  if (total <= 0) return 1;
  return clamp((at.getTime() - start.getTime()) / total, 0, 1);
}

/**
 * Red / amber / green from actual vs expected progress.
 * Target reached is always green; so is anything before the clock has started.
 */
export function rag(progress: number, expected: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): Rag {
  if (progress >= 1) return "green";
  if (expected <= 0) return progress >= 0 ? "green" : "red";
  const ratio = progress / expected;
  if (ratio >= thresholds.green) return "green";
  if (ratio >= thresholds.amber) return "amber";
  return "red";
}

/**
 * Full evaluation of one parameter.
 *
 * Expected progress is linear from the project start (at baseline) to the
 * parameter's target date (at target), falling back to the project end.
 * It is measured at the date of the latest entry rather than today, so a
 * quarterly metric isn't marked down in the weeks between measurements.
 */
export function evaluateParameter(
  param: ParameterInput,
  entries: EntryInput[],
  timeline: Timeline,
  asOf: Date = new Date(),
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Evaluation {
  const series = buildSeries(param, entries, asOf);
  const latest = series[series.length - 1];
  const base: Evaluation = {
    status: "no-data",
    current: null,
    progress: null,
    expected: null,
    ratio: null,
    latestDate: latest?.date ?? null,
    latestConfidence: latest?.confidence ?? null,
    series,
  };

  if (!latest) {
    return { ...base, status: asOf.getTime() < timeline.start.getTime() ? "not-started" : "no-data" };
  }

  const targetDate = param.targetDate ?? timeline.end;
  const current = latest.level;
  const progress = progressFraction(param, current);
  const expected = expectedFraction(timeline.start, targetDate, latest.date);

  return {
    ...base,
    status: rag(progress, expected, thresholds),
    current,
    progress,
    expected,
    ratio: expected > 0 ? progress / expected : null,
  };
}

export interface RiskInput {
  id: string;
  leadingIndicatorForId: string | null;
  status: Status;
}

export interface Risk {
  atRisk: boolean;
  /** Ids of the leading indicators that are behind. */
  because: string[];
}

/**
 * A parameter is "at risk" when any leading indicator linked to it is amber
 * or red. Only direct links count; indicators with no data are ignored.
 */
export function computeAtRisk(params: RiskInput[]): Map<string, Risk> {
  const result = new Map<string, Risk>();
  for (const p of params) result.set(p.id, { atRisk: false, because: [] });
  for (const p of params) {
    if (!p.leadingIndicatorForId) continue;
    const target = result.get(p.leadingIndicatorForId);
    if (!target) continue;
    if (p.status === "amber" || p.status === "red") {
      target.atRisk = true;
      target.because.push(p.id);
    }
  }
  return result;
}

/** Count statuses, e.g. for the portfolio view. */
export function countStatuses(statuses: Status[]): Record<Status, number> {
  const counts: Record<Status, number> = { green: 0, amber: 0, red: 0, "no-data": 0, "not-started": 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}

/** Overall project RAG: worst of its parameters' RAG statuses, or null if none have data. */
export function overallRag(statuses: Status[]): Rag | null {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  if (statuses.includes("green")) return "green";
  return null;
}
