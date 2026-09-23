import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { currencySymbol, formatDate, formatPercent, formatValue, today } from "@/lib/format";
import { countStatuses, expectedFraction, overallRag } from "@/lib/status";
import { EmptyState, StatusBadge } from "@/components/ui";
import { AudienceSplit, InitiativeTable, NeedsAttention, RagStrip, type InitiativeRow } from "@/components/programme-panels";
import { getProgrammeOverview } from "@/server/queries";
import { getOperations } from "@/server/operations-queries";
import { BudgetBadge, SpendBar } from "@/components/operations/ops-ui";

export default async function ProgrammeHome({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const user = await requireUser();
  const showArchived = (await searchParams).archived === "1";
  const [{ programme, focusAreas, initiatives }, ops] = await Promise.all([getProgrammeOverview({ includeArchived: showArchived }), getOperations()]);
  const overdue = ops.responsibilities.filter((r) => r.state === "overdue").length;
  const dueSoon = ops.responsibilities.filter((r) => r.state === "due-soon").length;
  const highRisks = ops.risks.filter((r) => r.status !== "closed" && r.rating === "high").length;
  const sym = currencySymbol(programme.currency);
  const allMetrics = initiatives.flatMap((i) => i.dash.metrics);
  const keyStatuses = allMetrics.filter((m) => m.isKey).map((m) => m.status);
  const overall = overallRag(keyStatuses.length ? keyStatuses : allMetrics.map((m) => m.status));
  const counts = countStatuses(allMetrics.map((m) => m.status));
  const elapsed = expectedFraction(programme.startDate, programme.endDate, today());
  const allocated = focusAreas.reduce((n, f) => n + f.budget, 0);
  const byFocus = (id: string | null) => initiatives.filter((i) => i.project.focusAreaId === id);
  const unassigned = byFocus(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Programme</p>
          <h1 className="text-2xl font-semibold tracking-tight">{programme.name}</h1>
          {programme.mission && <p className="mt-1 text-ink-2">{programme.mission}</p>}
          <p className="mt-1 text-sm text-muted">
            {formatDate(programme.startDate)} – {formatDate(programme.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user, "manage-programme") && (
            <>
              <Link href="/programme" className="btn-secondary">
                Programme settings
              </Link>
              <Link href="/focus-areas/new" className="btn-secondary">
                New focus area
              </Link>
            </>
          )}
          {can(user, "edit-data") && (
            <Link href="/projects/new" className="btn-primary">
              New initiative
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-muted">Overall status</div>
          <div className="mt-1">
            <StatusBadge status={overall ?? "no-data"} size="lg" />
          </div>
          <p className="mt-2 text-xs text-ink-2">Worst status among key metrics across all initiatives.</p>
          <div className="mt-3">
            <RagStrip counts={counts} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Timeline</div>
          <div className="mt-1 text-2xl font-semibold">{formatPercent(elapsed)}</div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2">
            <div className="h-1.5 rounded-full bg-ink-2" style={{ width: `${elapsed * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-2">of the programme year elapsed</p>
        </div>
        <Link href="/operations/budget" className="card block p-4 hover:bg-surface-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted">Budget</div>
            <BudgetBadge health={ops.programmeHealth} />
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatValue(ops.programmeHealth.actual, sym, { compact: true })}{" "}
            <span className="text-sm font-normal text-ink-2">paid of {formatValue(programme.budget, sym, { compact: true })}</span>
          </div>
          <div className="mt-2">
            <SpendBar health={ops.programmeHealth} />
          </div>
          <p className="mt-1 text-xs text-ink-2">
            {formatValue(ops.programmeHealth.committed, sym, { compact: true })} committed · {formatValue(allocated, sym, { compact: true })} allocated to focus areas
            {programme.budget - allocated > 0 && ` · ${formatValue(programme.budget - allocated, sym, { compact: true })} unallocated`}
            {programme.budget - allocated < 0 && ` · over-allocated by ${formatValue(allocated - programme.budget, sym, { compact: true })}`}
          </p>
        </Link>
        <AudienceSplit metrics={allMetrics} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <NeedsAttention rows={initiatives} />
        <Link href="/operations" className="card block p-4 hover:bg-surface-2">
          <h2 className="text-sm font-semibold">Operations</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className={overdue ? "text-critical-ink" : "text-ink-2"}>{overdue} overdue responsibilities</li>
            <li className="text-ink-2">{dueSoon} due in the next 14 days</li>
            <li className={highRisks ? "text-critical-ink" : "text-ink-2"}>{highRisks} high risks open</li>
            <li className="text-ink-2">{ops.decisions.length} decisions logged</li>
          </ul>
          <p className="mt-3 text-xs text-accent-ink">Open Operations →</p>
        </Link>
      </div>

      {focusAreas.length === 0 && initiatives.length === 0 && (
        <EmptyState title="No focus areas yet">
          {can(user, "manage-programme") ? (
            <Link href="/focus-areas/new" className="text-accent-ink underline">
              Create the first focus area
            </Link>
          ) : (
            "The Global lead sets up focus areas."
          )}
        </EmptyState>
      )}

      {focusAreas.map((fa) => {
        const rows = byFocus(fa.id);
        const initiativeBudget = rows.reduce((n, r) => n + (r.project.budget ?? 0), 0);
        return (
          <FocusAreaSection
            key={fa.id}
            title={fa.name}
            href={`/focus-areas/${fa.id}`}
            meta={
              <>
                {fa.owner ? `Owner: ${fa.owner.name}` : "No owner"} · Budget {formatValue(fa.budget, sym, { compact: true })}
                {rows.length > 0 && ` · ${formatValue(initiativeBudget, sym, { compact: true })} allocated to initiatives`}
                {fa.archivedAt && " · Archived"}
              </>
            }
            rows={rows}
            currency={sym}
            newHref={can(user, "edit-data") ? `/projects/new?focusArea=${fa.id}` : undefined}
          />
        );
      })}

      {unassigned.length > 0 && (
        <FocusAreaSection title="Not in a focus area" meta="Assign these under Project & theory of change." rows={unassigned} currency={sym} />
      )}

      <Link href={showArchived ? "/" : "/?archived=1"} className="inline-block text-sm text-ink-2 hover:text-ink">
        {showArchived ? "Hide archived" : "Show archived focus areas and initiatives"}
      </Link>
    </div>
  );
}

function FocusAreaSection({
  title,
  href,
  meta,
  rows,
  currency,
  newHref,
}: {
  title: string;
  href?: string;
  meta: React.ReactNode;
  rows: InitiativeRow[];
  currency: string;
  newHref?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
        <div>
          <h2 className="text-lg font-semibold">
            {href ? (
              <Link href={href} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="text-xs text-ink-2">{meta}</p>
        </div>
        {newHref && (
          <Link href={newHref} className="btn-ghost">
            Add initiative
          </Link>
        )}
      </div>
      {rows.length ? <InitiativeTable rows={rows} currency={currency} /> : <p className="text-sm text-muted">No initiatives yet.</p>}
    </section>
  );
}
