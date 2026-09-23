"use client";

// Cumulative paid spend (solid) against an even-pace budget line (dashed).

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMonth, formatNumber, formatValue } from "@/lib/format";
import { niceTicks } from "./trend-chart";

interface Point {
  t: number;
  paid?: number;
  pace: number;
}

export function SpendChart({
  spend, budget, start, end, currency, height = 220,
}: { spend: { date: string; amount: number }[]; budget: number; start: string; end: string; currency: string; height?: number }) {
  const t0 = new Date(start).getTime();
  const t1 = new Date(end).getTime();
  const paceAt = (t: number) => budget * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const byMonth = new Map<number, number>();
  for (const s of spend) {
    const d = new Date(s.date);
    const m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0); // month end
    byMonth.set(m, (byMonth.get(m) ?? 0) + s.amount);
  }
  let run = 0;
  const paid: Point[] = [...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, paid: (run += v), pace: paceAt(t) }));
  const data: Point[] = [{ t: t0, paid: 0, pace: 0 }, ...paid, { t: t1, pace: budget }].sort((a, b) => a.t - b.t);
  const ticks = niceTicks(0, Math.max(budget, run));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={[t0, t1]} tickFormatter={(t) => formatMonth(new Date(t))} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--line-strong)" }} tickLine={false} minTickGap={24} />
        <YAxis domain={[0, ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={(v) => formatNumber(v, { compact: true })} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <ReferenceLine y={budget} stroke="var(--line-strong)" label={{ value: "Budget", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }} />
        <Line dataKey="pace" name="Even pace" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
        <Line dataKey="paid" name="Paid to date" connectNulls stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as Point | undefined;
            if (!active || !p) return null;
            return (
              <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-sm">
                <div className="text-muted">{formatDate(new Date(p.t))}</div>
                {p.paid !== undefined && <div className="tabular font-medium">Paid {formatValue(p.paid, currency, { round: true })}</div>}
                <div className="tabular text-ink-2">Even pace {formatValue(p.pace, currency, { round: true })}</div>
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
