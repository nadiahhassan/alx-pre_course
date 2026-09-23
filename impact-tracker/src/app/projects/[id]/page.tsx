import Link from "next/link";
import { LEVEL_LABELS, type Level } from "@/lib/constants";
import { currencySymbol, formatDate, formatPercent, formatValue } from "@/lib/format";
import { DEFAULT_THRESHOLDS } from "@/lib/status";
import { EmptyState, StatusBadge } from "@/components/ui";
import { MetricCard, MetricRow } from "@/components/metric-card";
import { getProject, getProjectDashboard } from "@/server/queries";

// Most important first for readers; the theory of change strip shows the causal order.
const SECTIONS: { levels: Level[]; size: "lg" | "md" | "row"; blurb: string }[] = [
  { levels: ["impact"], size: "lg", blurb: "The long-term change the programme contributes to." },
  { levels: ["outcome"], size: "lg", blurb: "Changes for participants and communities." },
  { levels: ["output"], size: "md", blurb: "What the programme has directly delivered." },
  { levels: ["activity", "input"], size: "row", blurb: "Delivery and resources." },
];

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, dash] = await Promise.all([getProject(id), getProjectDashboard(id)]);
  const { metrics, counts } = dash;

  if (!metrics.length) {
    return (
      <EmptyState title="Nothing to show yet">
        <Link href={`/projects/${id}/parameters/new`} className="text-accent-ink underline">
          Add parameters
        </Link>{" "}
        and log some data to see the dashboard.
      </EmptyState>
    );
  }

  const toc: { level: Level; text: string }[] = [
    { level: "input", text: project.tocInputs },
    { level: "activity", text: project.tocActivities },
    { level: "output", text: project.tocOutputs },
    { level: "outcome", text: project.tocOutcomes },
    { level: "impact", text: project.tocImpact },
  ];
  const hasToc = toc.some((t) => t.text);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="card p-4">
          <div className="text-xs text-muted">Overall status</div>
          <div className="mt-1">{dash.overall ? <StatusBadge status={dash.overall} size="lg" /> : <StatusBadge status="no-data" size="lg" />}</div>
          <p className="mt-2 text-xs text-ink-2">
            Worst status among {metrics.some((m) => m.isKey) ? "key metrics" : "all metrics"}.
          </p>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Timeline</div>
          <div className="mt-1 text-2xl font-semibold">{formatPercent(dash.timelineElapsed)}</div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2">
            <div className="h-1.5 rounded-full bg-ink-2" style={{ width: `${dash.timelineElapsed * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-2">
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
            {project.budget !== null && <> · Budget {formatValue(project.budget, currencySymbol(project.currency), { compact: true })}</>}
          </p>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Metrics</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(["green", "amber", "red", "no-data"] as const).map((s) =>
              counts[s] ? (
                <li key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="tabular font-medium">{counts[s]}</span>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </section>

      {hasToc && (
        <details className="card group p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">Theory of change</summary>
          <ol className="mt-3 grid gap-2 md:grid-cols-5">
            {toc.map((t, i) => (
              <li key={t.level} className="relative rounded-md bg-surface-2 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                  {i + 1}. {LEVEL_LABELS[t.level]}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink">{t.text || <span className="text-muted">Not set</span>}</p>
              </li>
            ))}
          </ol>
        </details>
      )}

      <p className="text-xs text-muted">
        Status compares progress with where the metric should be by its latest entry, assuming steady progress from baseline at the
        project start to target at the target date: on track ≥ {DEFAULT_THRESHOLDS.green * 100}% of expected, behind ≥{" "}
        {DEFAULT_THRESHOLDS.amber * 100}%, off track below that. The tick on each bar marks where it should have been at its latest update.
      </p>

      {SECTIONS.map((section) => {
        const items = metrics.filter((m) => section.levels.includes(m.level as Level));
        if (!items.length) return null;
        const title = section.levels.map((l) => LEVEL_LABELS[l]).join(" & ");
        return (
          <section key={title}>
            <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
              <h2 className={section.size === "row" ? "text-base font-semibold" : "text-lg font-semibold"}>{title}</h2>
              <p className="text-sm text-ink-2">{section.blurb}</p>
            </div>
            {section.size === "row" ? (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-line">
                    {items.map((m) => (
                      <MetricRow key={m.id} m={m} startDate={dash.project.startDate} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`grid gap-4 ${section.size === "lg" ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {items.map((m) => (
                  <MetricCard key={m.id} m={m} startDate={dash.project.startDate} size={section.size as "lg" | "md"} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-xs text-muted">
        Solid line: actual values (running total for cumulative metrics). Dashed line: expected path to target. Data as of{" "}
        {formatDate(dash.asOf)}.
      </p>
    </div>
  );
}
