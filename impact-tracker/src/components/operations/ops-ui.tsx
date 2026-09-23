// Small display pieces for the Operations pages.

import type { BudgetHealth, DeadlineState, RiskRating } from "@/lib/operations";
import { formatDate, formatPercent, formatValue } from "@/lib/format";
import { StatusBadge } from "@/components/ui";

export function BudgetBadge({ health }: { health: BudgetHealth }) {
  return <StatusBadge status={health.status === "no-budget" ? "no-data" : health.status} label={health.label} />;
}

/**
 * Spend against budget: paid (solid), committed (lighter), with a tick where
 * spend would be if it kept pace with the timeline.
 */
export function SpendBar({ health }: { health: BudgetHealth }) {
  const b = health.budget || 1;
  const paid = Math.min(100, (health.actual / b) * 100);
  const committed = Math.min(100 - paid, (health.committed / b) * 100);
  return (
    <div>
      <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-surface-2" role="presentation">
        <div className="h-2 bg-accent" style={{ width: `${paid}%` }} />
        <div className="h-2 bg-accent/40" style={{ width: `${committed}%` }} />
      </div>
      <div className="relative -mt-3 h-4">
        <div className="absolute h-4 w-0.5 rounded bg-ink" style={{ left: `calc(${Math.min(1, health.elapsed) * 100}% - 1px)` }} title="Where spend would be at an even pace" />
      </div>
    </div>
  );
}

export function BudgetSummary({ health, currency }: { health: BudgetHealth; currency: string }) {
  const v = (n: number) => formatValue(n, currency, { compact: true });
  return (
    <div className="space-y-2">
      <SpendBar health={health} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted">Paid</dt>
          <dd className="tabular font-medium">{v(health.actual)} <span className="font-normal text-ink-2">({formatPercent(health.spentShare)})</span></dd>
        </div>
        <div>
          <dt className="text-muted">Committed</dt>
          <dd className="tabular font-medium">{v(health.committed)}</dd>
        </div>
        <div>
          <dt className="text-muted">Remaining</dt>
          <dd className={`tabular font-medium ${health.remaining < 0 ? "text-critical-ink" : ""}`}>{v(health.remaining)}</dd>
        </div>
        <div>
          <dt className="text-muted">Year-end at this pace</dt>
          <dd className="tabular font-medium">{v(health.forecast)}</dd>
        </div>
      </dl>
    </div>
  );
}

const DEADLINE_META: Record<DeadlineState, { label: string; cls: string }> = {
  overdue: { label: "Overdue", cls: "border-critical/50 text-critical-ink" },
  "due-soon": { label: "Due soon", cls: "border-warning/60 text-warning-ink" },
  upcoming: { label: "Upcoming", cls: "border-line text-ink-2" },
  done: { label: "Done", cls: "border-good/50 text-good-ink" },
};

export function DeadlineBadge({ state, due }: { state: DeadlineState; due: Date }) {
  const m = DEADLINE_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 text-xs ${m.cls}`}>
      <span className="font-medium">{m.label}</span>
      <span className="text-ink-2">{formatDate(due)}</span>
    </span>
  );
}

const RISK_META: Record<RiskRating, { label: string; status: "red" | "amber" | "green" }> = {
  high: { label: "High", status: "red" },
  medium: { label: "Medium", status: "amber" },
  low: { label: "Low", status: "green" },
};

export function RiskBadge({ rating, score }: { rating: RiskRating; score: number }) {
  return <StatusBadge status={RISK_META[rating].status} label={`${RISK_META[rating].label} · ${score}`} />;
}

/** 5 × 5 grid of likelihood (rows, high at top) by impact (columns). Cells show how many open risks sit there. */
export function RiskMatrix({ risks }: { risks: { likelihood: number; impact: number; status: string; title: string }[] }) {
  const open = risks.filter((r) => r.status !== "closed");
  const cellTone = (score: number) => (score >= 15 ? "bg-critical/15" : score >= 8 ? "bg-warning/15" : "bg-good/10");
  return (
    <div className="card p-4">
      <div className="flex gap-2">
        <div className="flex w-5 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-xs text-muted">Likelihood →</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].flatMap((l) =>
              [1, 2, 3, 4, 5].map((i) => {
                const here = open.filter((r) => r.likelihood === l && r.impact === i);
                return (
                  <div
                    key={`${l}-${i}`}
                    className={`flex aspect-[2/1] items-center justify-center rounded text-sm font-semibold ${cellTone(l * i)}`}
                    title={here.map((r) => r.title).join("\n") || `Likelihood ${l}, impact ${i}`}
                  >
                    {here.length || ""}
                  </div>
                );
              }),
            )}
          </div>
          <p className="mt-1 text-center text-xs text-muted">Impact →</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-2">Open risks by likelihood and impact (1–5). Hover a cell to see which risks are there.</p>
    </div>
  );
}
