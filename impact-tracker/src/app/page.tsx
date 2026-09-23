import Link from "next/link";
import { db } from "@/lib/db";
import { buildDashboard, type MetricView } from "@/lib/dashboard";
import { currencySymbol, formatPercent, formatValue } from "@/lib/format";
import type { Status } from "@/lib/status";
import { EmptyState, PageHeader, StatusBadge, statusLabel } from "@/components/ui";

/** Key metrics if marked, otherwise the highest-level ones (impact, then outcomes). */
function headlineMetrics(metrics: MetricView[]) {
  const key = metrics.filter((m) => m.isKey);
  if (key.length) return key.slice(0, 3);
  const rank = ["impact", "outcome", "output", "activity", "input"];
  return [...metrics].sort((a, b) => rank.indexOf(a.level) - rank.indexOf(b.level)).slice(0, 3);
}

const RAG_ORDER: Status[] = ["green", "amber", "red", "no-data"];

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const showArchived = (await searchParams).archived === "1";
  const projects = await db.project.findMany({
    where: showArchived ? {} : { archivedAt: null },
    include: { owner: true, parameters: { where: { archivedAt: null }, include: { entries: true } } },
    orderBy: { startDate: "desc" },
  });
  const rows = projects.map((p) => ({ project: p, dash: buildDashboard(p, p.parameters) }));

  const totals = { green: 0, amber: 0, red: 0, "no-data": 0 } as Record<string, number>;
  for (const r of rows) for (const s of RAG_ORDER) totals[s] += r.dash.counts[s];
  const budgets = new Map<string, number>();
  for (const { project } of rows) {
    if (project.budget) budgets.set(project.currency, (budgets.get(project.currency) ?? 0) + project.budget);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Every project's status at a glance. Open a project for its full dashboard."
        actions={
          <Link href="/projects/new" className="btn-primary">
            New project
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="No projects yet">
          <Link href="/projects/new" className="text-accent-ink underline">
            Create your first project
          </Link>{" "}
          or run <code>npm run db:seed</code> to load the example.
        </EmptyState>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <div className="text-xs text-muted">Projects</div>
              <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
              <div className="mt-1 text-xs text-ink-2">
                {rows.filter((r) => r.project.status === "active").length} active
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-muted">Total budget</div>
              <div className="mt-1 text-2xl font-semibold">
                {budgets.size
                  ? [...budgets].map(([c, v]) => formatValue(v, currencySymbol(c), { compact: true })).join(" + ")
                  : "–"}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-muted">Metrics across projects</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {RAG_ORDER.filter((s) => totals[s]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-sm">
                    <StatusBadge status={s} /> <span className="tabular font-medium">{totals[s]}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Project</th>
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
        </>
      )}

      <Link href={showArchived ? "/" : "/?archived=1"} className="inline-block text-sm text-ink-2 hover:text-ink">
        {showArchived ? "Hide archived projects" : "Show archived projects"}
      </Link>
    </div>
  );
}

/** Proportional strip of metric statuses with counts; shape icons in the legend carry meaning. */
function RagStrip({ counts }: { counts: Record<Status, number> }) {
  const total = RAG_ORDER.reduce((n, s) => n + counts[s], 0);
  if (!total) return <span className="text-xs text-muted">–</span>;
  const color: Record<string, string> = { green: "var(--good)", amber: "var(--warning)", red: "var(--critical)", "no-data": "var(--line-strong)" };
  return (
    <div className="w-44">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={RAG_ORDER.map((s) => `${counts[s]} ${statusLabel(s)}`).join(", ")}>
        {RAG_ORDER.filter((s) => counts[s]).map((s) => (
          <div key={s} style={{ flexGrow: counts[s], background: color[s] }} />
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
