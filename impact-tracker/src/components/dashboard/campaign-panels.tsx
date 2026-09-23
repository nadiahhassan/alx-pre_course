import type { CampaignView } from "@/lib/payload";
import { formatDate, formatMonth, formatNumber, formatPercent, formatValue } from "@/lib/format";
import { sentence } from "@/components/ui";
import { CHANNEL_LABELS } from "@/lib/constants";


export function CorrelationNote() {
  return (
    <p className="text-xs text-ink-2">
      Shaded periods show when campaigns ran. Changes during a campaign show <strong className="font-medium text-ink">correlation, not proof
      of cause</strong>: other things were happening at the same time.
    </p>
  );
}

/** Numbered key matching the numbers on chart bands. */
export function CampaignLegend({ campaigns }: { campaigns: CampaignView[] }) {
  if (!campaigns.length) return null;
  return (
    <div className="card space-y-2 p-3">
      <ol className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {campaigns.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-sm bg-ink/10 text-[10px] font-semibold text-ink-2">{i + 1}</span>
            <span className="font-medium">{c.name}</span>
            <span className="text-muted">
              {CHANNEL_LABELS[c.channel] ?? c.channel} · {formatDate(c.startDate)} – {c.endDate ? formatDate(c.endDate) : "ongoing"}
            </span>
          </li>
        ))}
      </ol>
      <CorrelationNote />
    </div>
  );
}

/** Gantt-style bars across the project timeline. */
export function CampaignTimeline({ campaigns, start, end, asOf }: { campaigns: CampaignView[]; start: string; end: string; asOf: string }) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - s) / (e - s)) * 100));
  const months: Date[] = [];
  for (let d = new Date(start); d.getTime() <= e; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }
  return (
    <div className="card p-4">
      <div className="relative ml-48 h-5 text-[11px] text-muted">
        {months.map((m, i) =>
          i % 2 === 0 ? (
            <span key={m.toISOString()} className="absolute -translate-x-1/2" style={{ left: `${pct(m.getTime())}%` }}>
              {formatMonth(m)}
            </span>
          ) : null,
        )}
      </div>
      <ul className="space-y-2">
        {campaigns.map((c, i) => {
          const left = pct(new Date(c.startDate).getTime());
          const right = pct(new Date(c.endDate ?? asOf).getTime());
          return (
            <li key={c.id} className="flex items-center gap-0 text-sm">
              <span className="w-48 shrink-0 truncate pr-3" title={c.name}>
                <span className="mr-1.5 text-xs text-muted">{i + 1}</span>
                {c.name}
              </span>
              <span className="relative h-5 flex-1 rounded bg-surface-2">
                <span
                  className="absolute top-0 h-5 rounded bg-accent"
                  style={{ left: `${left}%`, width: `max(${right - left}%, 4px)` }}
                  title={`${formatDate(c.startDate)} – ${c.endDate ? formatDate(c.endDate) : "ongoing"}`}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One row per campaign with spend, main metrics and derived ratios. */
export function CampaignTable({ campaigns, currency = "£" }: { campaigns: CampaignView[]; currency?: string }) {
  const metricNames = [...new Set(campaigns.flatMap((c) => Object.keys(c.totals)))];
  const preferred = ["impressions", "views", "sent", "opens", "attendees", "clicks", "sign-ups"];
  metricNames.sort((a, b) => (preferred.indexOf(a) + 1 || 99) - (preferred.indexOf(b) + 1 || 99));
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Campaign</th>
            <th className="px-4 py-2 text-right font-medium">Spend</th>
            {metricNames.map((m) => (
              <th key={m} className="px-4 py-2 text-right font-medium">
                {sentence(m.replace(/-/g, " "))}
              </th>
            ))}
            <th className="px-4 py-2 text-right font-medium">Click-through</th>
            <th className="px-4 py-2 text-right font-medium">Cost per sign-up</th>
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-line">
          {campaigns.map((c, i) => (
            <tr key={c.id}>
              <td className="px-4 py-2">
                <div className="font-medium">
                  <span className="mr-1.5 text-xs font-normal text-muted">{i + 1}</span>
                  {c.name}
                </div>
                <div className="text-xs text-muted">
                  {CHANNEL_LABELS[c.channel] ?? c.channel}
                  {c.trackingTag && ` · ${c.trackingTag}`}
                </div>
              </td>
              <td className="px-4 py-2 text-right">{formatValue(c.spend, currency, { compact: true })}</td>
              {metricNames.map((m) => (
                <td key={m} className="px-4 py-2 text-right">
                  {c.totals[m] !== undefined ? formatNumber(c.totals[m], { compact: true }) : <span className="text-muted">–</span>}
                </td>
              ))}
              <td className="px-4 py-2 text-right">{c.clickThroughRate === null ? <span className="text-muted">–</span> : formatPercent(c.clickThroughRate, 1)}</td>
              <td className="px-4 py-2 text-right">
                {c.costPerSignup === null ? <span className="text-muted">–</span> : formatValue(c.costPerSignup, currency, { round: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
