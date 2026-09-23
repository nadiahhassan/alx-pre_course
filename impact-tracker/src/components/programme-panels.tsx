// Building blocks for the programme home and focus area pages.

import Link from "next/link";
import type { ProjectDashboard, MetricView } from "@/lib/dashboard";
import { audienceBreakdown } from "@/lib/audience";
import { formatPercent, formatValue } from "@/lib/format";
import type { Status } from "@/lib/status";
import { StatusBadge, statusLabel } from "@/components/ui";

export interface InitiativeRow {
  project: { id: string; name: string; status: string; region: string; archivedAt: Date | null; budget: number | null; owner: { name: string } | null };
  dash: ProjectDashboard;
}

const RAG_ORDER: Status[] = ["green", "amber", "red", "no-data"];
const RAG_COLOR: Record<string, string> = { green: "var(--good)", amber: "var(--warning)", red: "var(--critical)", "no-data": "var(--line-strong)" };

/** Key metrics if marked, otherwise the highest-level ones. */
export function headlineMetrics(metrics: MetricView[], n = 3) {
  const key = metrics.filter((m) => m.isKey);
  if (key.length) return key.slice(0, n);
  const rank = ["impact", "outcome", "output", "activity", "input"];
  return [...metrics].sort((a, b) => rank.indexOf(a.level) - rank.indexOf(b.level)).slice(0, n);
}

/** Proportional strip of metric statuses; the counts underneath carry the meaning. */
export function RagStrip({ counts }: { counts: Record<string, number> }) {
  const total = RAG_ORDER.reduce((n, s) => n + (counts[s] ?? 0), 0);
  if (!total) return <span className="text-xs text-muted">No metrics</span>;
  return (
    <div className="min-w-40">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={RAG_ORDER.map((s) => `${counts[s] ?? 0} ${statusLabel(s)}`).join(", ")}>
        {RAG_ORDER.filter((s) => counts[s]).map((s) => (
          <div key={s} style={{ flexGrow: counts[s], background: RAG_COLOR[s] }} />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink-2">
        {RAG_ORDER.filter((s) => counts[s]).map((s) => (
          <span key={s}>
            {counts[s]} {statusLabel(s).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InitiativeTable({ rows, currency }: { rows: InitiativeRow[]; currency: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Initiative</th>
            <th className="px-4 py-2 font-medium">Overall</th>
            <th className="px-4 py-2 font-medium">Timeline</th>
            <th className="px-4 py-2 font-medium">Metrics</th>
            <th className="px-4 py-2 font-medium">Key metrics</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ project, dash }) => (
            <tr key={project.id} className="align-top">
              <td className="px-4 py-3">
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {project.name}
                </Link>
                {project.archivedAt && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">Archived</span>}
                <div className="mt-0.5 text-xs text-ink-2">
                  <span className="capitalize">{project.status}</span>
                  {project.region && ` · ${project.region}`}
                  {project.owner && ` · ${project.owner.name}`}
                  {project.budget !== null && ` · ${formatValue(project.budget, currency, { compact: true })}`}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={dash.overall ?? "no-data"} />
              </td>
              <td className="w-36 px-4 py-3">
                <div className="text-xs text-ink-2">{formatPercent(dash.timelineElapsed)} elapsed</div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full bg-ink-2" style={{ width: `${dash.timelineElapsed * 100}%` }} />
                </div>
              </td>
              <td className="px-4 py-3">
                <RagStrip counts={dash.counts} />
              </td>
              <td className="px-4 py-3">
                {dash.metrics.length === 0 ? (
                  <span className="text-xs text-muted">No parameters yet</span>
                ) : (
                  <ul className="space-y-1.5">
                    {headlineMetrics(dash.metrics).map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                        <StatusBadge status={m.status} />
                        <span className="text-ink-2">{m.name}:</span>
                        <span className="tabular font-medium">
                          {formatValue(m.current, m.unit, { compact: true })} / {formatValue(m.target, m.unit, { compact: true })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How metrics for internal vs external audiences are doing. */
export function AudienceSplit({ metrics }: { metrics: MetricView[] }) {
  const b = audienceBreakdown(metrics);
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">By audience</div>
      <dl className="mt-2 space-y-3">
        {(["external", "internal"] as const).map((a) => (
          <div key={a}>
            <dt className="text-sm font-medium">
              {a === "external" ? "External" : "Internal"} <span className="font-normal text-muted">· {b[a].total} metrics</span>
            </dt>
            <dd className="mt-1">
              <RagStrip counts={b[a]} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Off-track key metrics and at-risk outcomes across initiatives. */
export function NeedsAttention({ rows }: { rows: InitiativeRow[] }) {
  const items = rows.flatMap(({ project, dash }) =>
    dash.metrics
      .filter((m) => m.atRisk || (m.status === "red" && m.isKey))
      .map((m) => ({ project, m, why: m.atRisk ? "At risk: a leading indicator is behind" : "Key metric off track" })),
  );
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">Needs attention</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">Nothing flagged. Key metrics are on track or behind by less than the red threshold.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map(({ project, m, why }) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {m.name}
                </Link>
                <span className="text-ink-2"> · {project.name}</span>
                <span className="block text-xs text-muted">{why}</span>
              </span>
              <StatusBadge status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
