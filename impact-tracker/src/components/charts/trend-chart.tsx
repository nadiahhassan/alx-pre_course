"use client";

// Trend line for one parameter: actual values (solid), the expected path from
// baseline to target (dashed), and the target itself (hairline). Campaigns
// can be overlaid as numbered shaded periods.

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricView } from "@/lib/dashboard";
import { formatDate, formatMonth, formatNumber, formatValue } from "@/lib/format";

/** Round tick values (0, 5, 10...) covering lo..hi; never below zero for non-negative data. */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (lo === hi) {
    const d = Math.abs(lo) || 1;
    lo -= d / 2;
    hi += d / 2;
  }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  let start = Math.floor(lo / step) * step;
  if (lo >= 0 && start < 0) start = 0;
  const out: number[] = [];
  for (let v = start; v < hi + step * 0.999; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

export interface CampaignBand {
  /** Number shown on the band; matches the campaign legend. */
  n: number;
  name: string;
  startDate: string;
  endDate: string | null;
}

interface Point {
  t: number;
  actual?: number;
  expected?: number;
  confidence?: string;
}

export function TrendChart({
  metric,
  startDate,
  height = 180,
  compact = false,
  campaigns = [],
}: {
  metric: MetricView;
  startDate: string;
  height?: number;
  compact?: boolean;
  campaigns?: CampaignBand[];
}) {
  const start = new Date(startDate).getTime();
  const end = new Date(metric.targetDate).getTime();
  // One merged dataset so the tooltip and crosshair share an index.
  // Expected is linear from baseline (at start) to target (at the target date).
  const expectedAt = (t: number) =>
    end <= start ? metric.target : metric.baseline + (metric.target - metric.baseline) * Math.min(1, Math.max(0, (t - start) / (end - start)));
  const byT = new Map<number, Point>();
  for (const t of [start, end]) byT.set(t, { t, expected: expectedAt(t) });
  for (const p of metric.series) {
    const t = new Date(p.date).getTime();
    byT.set(t, { t, expected: expectedAt(t), actual: p.level, confidence: p.confidence });
  }
  const data = [...byT.values()].sort((a, b) => a.t - b.t);
  const actual = data.filter((p) => p.actual !== undefined);
  const domainEnd = Math.max(end, data[data.length - 1].t);

  const values = [metric.baseline, metric.target, ...actual.map((p) => p.actual!)];
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yDomain: [number, number] = [ticks[0], ticks[ticks.length - 1]];

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="t" type="number" domain={[start, domainEnd]} hide />
          <YAxis type="number" domain={yDomain} hide />
          <Line dataKey="expected" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
          <Line dataKey="actual" connectNulls stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[start, domainEnd]}
          tickFormatter={(t) => formatMonth(new Date(t))}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--line-strong)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          type="number"
          domain={yDomain}
          ticks={ticks}
          tickFormatter={(v) => formatNumber(v, { compact: true })}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
          className="tabular"
        />
        {campaigns.map((c) => (
          <ReferenceArea
            key={c.n}
            x1={Math.max(start, new Date(c.startDate).getTime())}
            x2={Math.min(domainEnd, c.endDate ? new Date(c.endDate).getTime() : domainEnd)}
            fill="var(--ink)"
            fillOpacity={0.06}
            stroke="none"
            ifOverflow="hidden"
            label={{ value: String(c.n), position: "insideTopLeft", fill: "var(--ink-2)", fontSize: 11 }}
          />
        ))}
        <ReferenceLine
          y={metric.target}
          stroke="var(--line-strong)"
          label={{ value: "Target", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }}
        />
        <Line
          dataKey="expected"
          name="Expected path"
          stroke="var(--muted)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="actual"
          connectNulls
          name="Actual"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as Point | undefined;
            if (!active || !p) return null;
            return (
              <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-sm">
                <div className="text-muted">{formatDate(new Date(p.t))}</div>
                {p.actual !== undefined && (
                  <div className="tabular font-medium text-ink">
                    {formatValue(p.actual, metric.unit)} <span className="font-normal text-ink-2">· {p.confidence}</span>
                  </div>
                )}
                <div className="tabular text-ink-2">Expected {formatValue(p.expected, metric.unit, { round: true })}</div>
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
