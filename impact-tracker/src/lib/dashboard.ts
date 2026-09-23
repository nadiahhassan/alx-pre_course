// Builds the dashboard data for a project: every parameter evaluated against
// its target. The output is plain JSON (ISO date strings), so the same shape
// can feed client charts, the portfolio, and frozen snapshots.

import type { Entry, Parameter, Project } from "@prisma/client";
import { LEVELS } from "./constants";
import {
  computeAtRisk,
  countStatuses,
  evaluateParameter,
  expectedFraction,
  overallRag,
  type Rag,
  type Status,
} from "./status";

export interface MetricPoint {
  date: string;
  value: number;
  level: number;
  confidence: string;
}

export interface MetricView {
  id: string;
  name: string;
  definition: string;
  level: string;
  unit: string;
  direction: string;
  measureType: string;
  baseline: number;
  target: number;
  targetDate: string;
  frequency: string;
  dataSource: string;
  isKey: boolean;
  audience: string;
  leadingIndicatorForId: string | null;
  status: Status;
  current: number | null;
  progress: number | null;
  expected: number | null;
  latestDate: string | null;
  latestConfidence: string | null;
  confidenceCounts: Record<string, number>;
  atRisk: boolean;
  atRiskBecause: string[];
  series: MetricPoint[];
}

export interface ProjectDashboard {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    region: string;
    startDate: string;
    endDate: string;
    budget: number | null;
    currency: string;
  };
  asOf: string;
  timelineElapsed: number;
  metrics: MetricView[];
  counts: Record<Status, number>;
  overall: Rag | null;
}

type ParameterWithEntries = Parameter & { entries: Entry[] };

export function buildDashboard(
  project: Project,
  parameters: ParameterWithEntries[],
  asOf: Date = new Date(),
): ProjectDashboard {
  const timeline = { start: project.startDate, end: project.endDate };
  const active = parameters
    .filter((p) => !p.archivedAt)
    .sort((a, b) => LEVELS.indexOf(a.level as never) - LEVELS.indexOf(b.level as never) || a.sortOrder - b.sortOrder);

  const evaluated = active.map((p) => ({
    p,
    e: evaluateParameter(p, p.entries, timeline, asOf),
  }));
  const risks = computeAtRisk(
    evaluated.map(({ p, e }) => ({ id: p.id, leadingIndicatorForId: p.leadingIndicatorForId, status: e.status })),
  );

  const metrics: MetricView[] = evaluated.map(({ p, e }) => {
    const confidenceCounts: Record<string, number> = {};
    for (const pt of e.series) confidenceCounts[pt.confidence] = (confidenceCounts[pt.confidence] ?? 0) + 1;
    const risk = risks.get(p.id);
    return {
      id: p.id,
      name: p.name,
      definition: p.definition,
      level: p.level,
      unit: p.unit,
      direction: p.direction,
      measureType: p.measureType,
      baseline: p.baseline,
      target: p.target,
      targetDate: (p.targetDate ?? project.endDate).toISOString(),
      frequency: p.frequency,
      dataSource: p.dataSource,
      isKey: p.isKey,
      audience: p.audience,
      leadingIndicatorForId: p.leadingIndicatorForId,
      status: e.status,
      current: e.current,
      progress: e.progress,
      expected: e.expected,
      latestDate: e.latestDate?.toISOString() ?? null,
      latestConfidence: e.latestConfidence,
      confidenceCounts,
      atRisk: risk?.atRisk ?? false,
      atRiskBecause: risk?.because ?? [],
      series: e.series.map((pt) => ({
        date: pt.date.toISOString(),
        value: pt.value,
        level: pt.level,
        confidence: pt.confidence,
      })),
    };
  });

  // Overall status follows the key metrics when any are marked, otherwise all metrics.
  const keyStatuses = metrics.filter((m) => m.isKey).map((m) => m.status);
  const statuses = metrics.map((m) => m.status);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      region: project.region,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate.toISOString(),
      budget: project.budget,
      currency: project.currency,
    },
    asOf: asOf.toISOString(),
    timelineElapsed: expectedFraction(project.startDate, project.endDate, asOf),
    metrics,
    counts: countStatuses(statuses),
    overall: overallRag(keyStatuses.length ? keyStatuses : statuses),
  };
}
