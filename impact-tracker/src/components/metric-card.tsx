// Metric display at three weights, so logic-model levels read differently:
// impact and outcomes get large cards, outputs medium cards, and activities
// and inputs compact rows.

import type { MetricView } from "@/lib/dashboard";
import type { EvidenceView } from "@/lib/payload";
import { formatDate, formatPercent, formatValue } from "@/lib/format";
import { ConfidenceBadge, ProgressBar, StatusBadge } from "./ui";
import { TrendChart, type CampaignBand } from "./charts/trend-chart";
import { EvidenceButton } from "./dashboard/evidence-button";

export interface MetricExtras {
  evidence?: EvidenceView[];
  campaigns?: CampaignBand[];
  /** Names of the leading indicators that are behind, when this metric is at risk. */
  riskFrom?: string[];
}

function expectedAt(m: MetricView) {
  if (m.expected === null) return null;
  return m.baseline + (m.target - m.baseline) * m.expected;
}

function ConfidenceMix({ m }: { m: MetricView }) {
  const parts = Object.entries(m.confidenceCounts);
  if (parts.length <= 1) return null;
  return <span className="text-xs text-muted">History: {parts.map(([c, n]) => `${n} ${c}`).join(", ")}</span>;
}

export function AtRiskFlag({ from }: { from: string[] }) {
  return (
    <p className="flex items-start gap-1.5 rounded-md border border-warning/50 bg-warning/10 px-2 py-1.5 text-xs text-ink">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="mt-0.5 shrink-0">
        <path d="M6 1 L11 10.5 L1 10.5 Z" fill="none" stroke="var(--warning-ink)" strokeWidth="1.5" />
      </svg>
      <span>
        <strong className="font-medium">At risk:</strong> leading indicator {from.join(", ")} {from.length === 1 ? "is" : "are"} behind
        target.
      </span>
    </p>
  );
}

export function MetricCard({
  m,
  startDate,
  size,
  extras = {},
}: {
  m: MetricView;
  startDate: string;
  size: "lg" | "md";
  extras?: MetricExtras;
}) {
  const exp = expectedAt(m);
  return (
    <article className="card flex break-inside-avoid flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-medium leading-snug ${size === "lg" ? "text-base" : "text-sm"}`}>{m.name}</h3>
          {size === "lg" && m.definition && <p className="mt-0.5 text-xs text-ink-2">{m.definition}</p>}
        </div>
        <StatusBadge status={m.status} />
      </header>

      {extras.riskFrom && extras.riskFrom.length > 0 && <AtRiskFlag from={extras.riskFrom} />}

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-semibold tracking-tight ${size === "lg" ? "text-3xl" : "text-2xl"}`}>
          {formatValue(m.current, m.unit, { compact: true })}
        </span>
        <span className="text-sm text-ink-2">
          of {formatValue(m.target, m.unit, { compact: true })} target by {formatDate(m.targetDate)}
        </span>
      </div>

      <div className="space-y-1">
        <ProgressBar progress={m.progress} expected={m.expected} />
        <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-2">
          <span>{formatPercent(m.progress === null ? null : Math.max(0, m.progress))} of the way from baseline</span>
          {exp !== null && <span>Expected at last update: {formatValue(exp, m.unit, { compact: true, round: true })}</span>}
        </div>
      </div>

      {m.series.length > 0 && (
        <div className="-mx-1">
          <TrendChart metric={m} startDate={startDate} height={size === "lg" ? 180 : 130} campaigns={extras.campaigns} />
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <ConfidenceBadge confidence={m.latestConfidence} />
        <span className="text-xs text-muted">
          {m.latestDate ? `Updated ${formatDate(m.latestDate)}` : "No entries yet"}
          {m.dataSource && ` · ${m.dataSource}`}
        </span>
        <ConfidenceMix m={m} />
        {extras.evidence && (
          <span className="ml-auto">
            <EvidenceButton metricName={m.name} items={extras.evidence} />
          </span>
        )}
      </footer>
    </article>
  );
}

export function MetricRow({ m, startDate, extras = {} }: { m: MetricView; startDate: string; extras?: MetricExtras }) {
  return (
    <tr className="align-middle">
      <td className="px-4 py-3">
        <div className="text-sm font-medium">{m.name}</div>
        <div className="text-xs text-muted">{m.latestDate ? `Updated ${formatDate(m.latestDate)}` : "No entries yet"}</div>
        {extras.riskFrom && extras.riskFrom.length > 0 && (
          <div className="mt-1 text-xs text-warning-ink">At risk: {extras.riskFrom.join(", ")} behind</div>
        )}
      </td>
      <td className="tabular whitespace-nowrap px-4 py-3 text-sm">
        <span className="font-semibold">{formatValue(m.current, m.unit, { compact: true })}</span>
        <span className="text-ink-2"> / {formatValue(m.target, m.unit, { compact: true })}</span>
      </td>
      <td className="w-48 px-4 py-3">
        <ProgressBar progress={m.progress} expected={m.expected} />
      </td>
      <td className="w-32 px-2 py-1">{m.series.length > 0 && <TrendChart metric={m} startDate={startDate} height={36} compact />}</td>
      <td className="px-4 py-3">
        <StatusBadge status={m.status} />
      </td>
      <td className="px-4 py-3">
        <ConfidenceBadge confidence={m.latestConfidence} />
      </td>
      <td className="px-4 py-3 text-right">{extras.evidence && <EvidenceButton metricName={m.name} items={extras.evidence} />}</td>
    </tr>
  );
}
