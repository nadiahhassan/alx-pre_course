// Renders a DashboardPayload as one of four stakeholder views. Used by the
// live dashboard, snapshots and public share pages, so they always match.

import type { MetricView } from "@/lib/dashboard";
import type { DashboardPayload } from "@/lib/payload";
import { LEVEL_LABELS, type Level } from "@/lib/constants";
import { currencySymbol, formatDate, formatPercent, formatValue } from "@/lib/format";
import { DEFAULT_THRESHOLDS } from "@/lib/status";
import { StatusBadge } from "@/components/ui";
import { MetricCard, MetricRow, type MetricExtras } from "@/components/metric-card";
import type { CampaignBand } from "@/components/charts/trend-chart";
import { CampaignLegend, CampaignTable, CampaignTimeline } from "./campaign-panels";
import { EvidenceItem } from "./evidence-item";
import type { View } from "@/lib/views";

export { VIEWS, VIEW_LABELS, VIEW_BLURBS, parseView, type View } from "@/lib/views";

// Most important first for readers; the theory of change strip shows the causal order.
const SECTIONS: { levels: Level[]; size: "lg" | "md" | "row"; blurb: string }[] = [
  { levels: ["impact"], size: "lg", blurb: "The long-term change the programme contributes to." },
  { levels: ["outcome"], size: "lg", blurb: "Changes for participants and communities." },
  { levels: ["output"], size: "md", blurb: "What the programme has directly delivered." },
  { levels: ["activity", "input"], size: "row", blurb: "Delivery and resources." },
];

function makeExtras(payload: DashboardPayload, opts: { evidence: boolean; campaigns: boolean }) {
  const names = new Map(payload.dashboard.metrics.map((m) => [m.id, m.name]));
  const bands: CampaignBand[] = payload.campaigns.map((c, i) => ({ n: i + 1, name: c.name, startDate: c.startDate, endDate: c.endDate }));
  return (m: MetricView): MetricExtras => ({
    evidence: opts.evidence ? payload.evidence.filter((e) => e.parameterId === m.id) : undefined,
    campaigns: opts.campaigns ? bands : undefined,
    riskFrom: m.atRisk ? m.atRiskBecause.map((id) => names.get(id) ?? "unknown") : undefined,
  });
}

export function DashboardView({ payload, view }: { payload: DashboardPayload; view: View }) {
  if (!payload.dashboard.metrics.length) {
    return <div className="card px-6 py-10 text-center text-sm text-ink-2">No metrics to show yet.</div>;
  }
  switch (view) {
    case "leadership":
      return <LeadershipView payload={payload} />;
    case "comms":
      return <CommsView payload={payload} />;
    case "marketing":
      return <MarketingView payload={payload} />;
    default:
      return <LeadView payload={payload} />;
  }
}

// Shared pieces

function SummaryCards({ payload }: { payload: DashboardPayload }) {
  const { dashboard: dash } = payload;
  const counts = dash.counts;
  return (
    <section className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
      <div className="card p-4">
        <div className="text-xs text-muted">Overall status</div>
        <div className="mt-1">
          <StatusBadge status={dash.overall ?? "no-data"} size="lg" />
        </div>
        <p className="mt-2 text-xs text-ink-2">Worst status among {dash.metrics.some((m) => m.isKey) ? "key metrics" : "all metrics"}.</p>
      </div>
      <div className="card p-4">
        <div className="text-xs text-muted">Timeline</div>
        <div className="mt-1 text-2xl font-semibold">{formatPercent(dash.timelineElapsed)}</div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-2">
          <div className="h-1.5 rounded-full bg-ink-2" style={{ width: `${dash.timelineElapsed * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-2">
          {formatDate(dash.project.startDate)} – {formatDate(dash.project.endDate)}
          {dash.project.budget !== null && (
            <> · Budget {formatValue(dash.project.budget, currencySymbol(dash.project.currency), { compact: true })}</>
          )}
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
  );
}

function TocStrip({ toc, open = true }: { toc: DashboardPayload["toc"]; open?: boolean }) {
  const items: { level: Level; text: string }[] = [
    { level: "input", text: toc.inputs },
    { level: "activity", text: toc.activities },
    { level: "output", text: toc.outputs },
    { level: "outcome", text: toc.outcomes },
    { level: "impact", text: toc.impact },
  ];
  if (!items.some((t) => t.text)) return null;
  return (
    <details className="card p-4" open={open}>
      <summary className="cursor-pointer text-sm font-semibold">Theory of change</summary>
      <ol className="mt-3 grid gap-2 md:grid-cols-5">
        {items.map((t, i) => (
          <li key={t.level} className="rounded-md bg-surface-2 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-2">
              {i + 1}. {LEVEL_LABELS[t.level]}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink">{t.text || <span className="text-muted">Not set</span>}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function AtRiskAlert({ payload }: { payload: DashboardPayload }) {
  const metrics = payload.dashboard.metrics;
  const atRisk = metrics.filter((m) => m.atRisk);
  if (!atRisk.length) return null;
  const names = new Map(metrics.map((m) => [m.id, m.name]));
  return (
    <section className="rounded-lg border border-warning/60 bg-warning/10 p-4" aria-label="At-risk metrics">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden>
          <path d="M6 1 L11 10.5 L1 10.5 Z" fill="var(--warning)" />
        </svg>
        {atRisk.length} {atRisk.length === 1 ? "metric is" : "metrics are"} at risk
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {atRisk.map((m) => (
          <li key={m.id}>
            <strong className="font-medium">{m.name}</strong>
            <span className="text-ink-2">
              {" "}
              ({m.status === "no-data" ? "no data yet" : `currently ${STATUS_WORDS[m.status]}`}): its leading indicator{" "}
              {m.atRiskBecause.map((id) => names.get(id)).join(", ")} {m.atRiskBecause.length === 1 ? "is" : "are"} behind target.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STATUS_WORDS: Record<string, string> = { green: "on track", amber: "behind", red: "off track", "no-data": "no data", "not-started": "not started" };

function StatusExplainer() {
  return (
    <p className="text-xs text-muted">
      Status compares progress with where the metric should be by its latest entry, assuming steady progress from baseline at the project start to
      target at the target date: on track ≥ {DEFAULT_THRESHOLDS.green * 100}% of expected, behind ≥ {DEFAULT_THRESHOLDS.amber * 100}%, off track below
      that. The tick on each bar marks where it should have been at its latest update.
    </p>
  );
}

function LevelSections({ payload, extras, levels }: { payload: DashboardPayload; extras: (m: MetricView) => MetricExtras; levels?: Level[] }) {
  const { metrics, project } = payload.dashboard;
  return (
    <>
      {SECTIONS.map((section) => {
        const lv = section.levels.filter((l) => !levels || levels.includes(l));
        const items = metrics.filter((m) => lv.includes(m.level as Level));
        if (!items.length) return null;
        const title = lv.map((l) => LEVEL_LABELS[l]).join(" & ");
        return (
          <section key={title}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2">
              <h2 className={section.size === "row" ? "text-base font-semibold" : "text-lg font-semibold"}>{title}</h2>
              <p className="text-sm text-ink-2">{section.blurb}</p>
            </div>
            {section.size === "row" ? (
              <div className="card overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-line">
                    {items.map((m) => (
                      <MetricRow key={m.id} m={m} startDate={project.startDate} extras={extras(m)} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`grid gap-4 ${section.size === "lg" ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {items.map((m) => (
                  <MetricCard key={m.id} m={m} startDate={project.startDate} size={section.size as "lg" | "md"} extras={extras(m)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

function Footnote({ payload }: { payload: DashboardPayload }) {
  return (
    <p className="text-xs text-muted">
      Solid line: actual values (running total for cumulative metrics). Dashed line: expected path to target. Data as of {formatDate(payload.dashboard.asOf)}.
    </p>
  );
}

// Views

function LeadView({ payload }: { payload: DashboardPayload }) {
  const extras = makeExtras(payload, { evidence: true, campaigns: true });
  return (
    <div className="space-y-8">
      <SummaryCards payload={payload} />
      <AtRiskAlert payload={payload} />
      <TocStrip toc={payload.toc} />
      <StatusExplainer />
      <CampaignLegend campaigns={payload.campaigns} />
      <LevelSections payload={payload} extras={extras} />
      <Footnote payload={payload} />
    </div>
  );
}

function LeadershipView({ payload }: { payload: DashboardPayload }) {
  const extras = makeExtras(payload, { evidence: false, campaigns: false });
  const { metrics, project } = payload.dashboard;
  const key = metrics.filter((m) => m.isKey);
  return (
    <div className="space-y-8">
      <SummaryCards payload={payload} />
      <AtRiskAlert payload={payload} />
      {key.length > 0 && (
        <section>
          <h2 className="mb-3 border-b border-line pb-2 text-lg font-semibold">Key metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {key.map((m) => (
              <MetricCard key={m.id} m={m} startDate={project.startDate} size="md" extras={extras(m)} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 border-b border-line pb-2 text-lg font-semibold">All metrics by level</h2>
        <div className="card overflow-x-auto">
          <table className="w-full">
            {(["impact", "outcome", "output", "activity", "input"] as Level[]).map((level) => {
              const rows = metrics.filter((m) => m.level === level);
              if (!rows.length) return null;
              return (
                <tbody key={level} className="divide-y divide-line">
                  <tr>
                    <th colSpan={7} className="bg-surface-2 px-4 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {LEVEL_LABELS[level]}
                    </th>
                  </tr>
                  {rows.map((m) => (
                    <MetricRow key={m.id} m={m} startDate={project.startDate} extras={extras(m)} />
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
      <StatusExplainer />
    </div>
  );
}

function CommsView({ payload }: { payload: DashboardPayload }) {
  const { metrics } = payload.dashboard;
  const rank = ["impact", "outcome", "output", "activity", "input"];
  const headline = [...metrics]
    .filter((m) => m.current !== null && (m.isKey || m.level === "impact" || m.level === "outcome" || m.level === "output"))
    .sort((a, b) => Number(b.isKey) - Number(a.isKey) || rank.indexOf(a.level) - rank.indexOf(b.level))
    .slice(0, 6);
  const stories = payload.evidence.filter((e) => e.type === "quote" || e.type === "case-study" || e.type === "survey");
  const links = payload.evidence.filter((e) => e.type === "link");

  return (
    <div className="space-y-8">
      {payload.toc.impact && (
        <section className="card p-5">
          <div className="text-xs text-muted">What we are working towards</div>
          <p className="mt-1 text-lg leading-snug">{payload.toc.impact}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 border-b border-line pb-2 text-lg font-semibold">Headline figures</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {headline.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="text-3xl font-semibold tracking-tight">{formatValue(m.current, m.unit, { compact: true })}</div>
              <div className="mt-1 text-sm">{m.name}</div>
              <div className="mt-2 text-xs text-ink-2">
                {formatPercent(Math.max(0, m.progress ?? 0))} of the way to a target of {formatValue(m.target, m.unit, { compact: true })} by{" "}
                {formatDate(m.targetDate)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{m.latestConfidence ? `${m.latestConfidence[0].toUpperCase()}${m.latestConfidence.slice(1)}` : ""}</span>
                {m.latestDate && <span>· as of {formatDate(m.latestDate)}</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Check the confidence level before quoting a figure: self-reported, estimated and modelled figures should be described as such.
        </p>
      </section>

      {stories.length > 0 && (
        <section>
          <h2 className="mb-3 border-b border-line pb-2 text-lg font-semibold">Stories and quotes</h2>
          <div className="columns-1 gap-4 md:columns-2">
            {stories.map((e) => (
              <div key={e.id} className="card mb-4 break-inside-avoid p-4">
                <EvidenceItem e={e} compact />
                {e.parameterId && (
                  <p className="mt-2 text-xs text-muted">Relates to: {metrics.find((m) => m.id === e.parameterId)?.name}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section>
          <h2 className="mb-3 border-b border-line pb-2 text-base font-semibold">Coverage and links</h2>
          <ul className="card divide-y divide-line">
            {links.map((e) => (
              <li key={e.id} className="p-4">
                <EvidenceItem e={e} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MarketingView({ payload }: { payload: DashboardPayload }) {
  const { campaigns } = payload;
  const { project, metrics } = payload.dashboard;
  const extras = makeExtras(payload, { evidence: false, campaigns: true });
  const symbol = currencySymbol(project.currency);
  const spend = campaigns.reduce((n, c) => n + c.spend, 0);
  const signups = campaigns.reduce((n, c) => n + (c.totals["sign-ups"] ?? 0), 0);
  const outcomes = metrics.filter((m) => (m.level === "outcome" || m.level === "impact" || m.isKey) && m.series.length > 0);

  if (!campaigns.length) {
    return <div className="card px-6 py-10 text-center text-sm text-ink-2">No campaigns logged for this project yet.</div>;
  }
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Campaigns</div>
          <div className="mt-1 text-2xl font-semibold">{campaigns.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Total spend</div>
          <div className="mt-1 text-2xl font-semibold">{formatValue(spend, symbol, { compact: true })}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Sign-ups</div>
          <div className="mt-1 text-2xl font-semibold">{formatValue(signups, "", { compact: true })}</div>
          {signups > 0 && spend > 0 && (
            <div className="mt-1 text-xs text-ink-2">{formatValue(spend / signups, symbol, { round: true })} per sign-up overall</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-line pb-2 text-lg font-semibold">Campaign performance</h2>
        <CampaignTable campaigns={campaigns} currency={symbol} />
        <CampaignTimeline campaigns={campaigns} start={project.startDate} end={project.endDate} asOf={payload.dashboard.asOf} />
      </section>

      {outcomes.length > 0 && (
        <section className="space-y-3">
          <h2 className="border-b border-line pb-2 text-lg font-semibold">Outcomes during campaigns</h2>
          <CampaignLegend campaigns={campaigns} />
          <div className="grid gap-4 md:grid-cols-2">
            {outcomes.map((m) => (
              <MetricCard key={m.id} m={m} startDate={project.startDate} size="md" extras={extras(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
