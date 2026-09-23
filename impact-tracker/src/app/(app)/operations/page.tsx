import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { OWNER_TEAM_LABELS } from "@/lib/constants";
import { currencySymbol, formatDate, formatValue } from "@/lib/format";
import { canUpdateResponsibility } from "@/lib/permissions";
import { BudgetBadge, BudgetSummary, DeadlineBadge, RiskBadge, RiskMatrix } from "@/components/operations/ops-ui";
import { ResponsibilityStatus } from "@/components/operations/ops-controls";
import { getOperations } from "@/server/operations-queries";

export default async function OperationsOverview() {
  const user = await requireUser();
  const ops = await getOperations();
  const sym = currencySymbol(ops.programme.currency);
  const urgent = ops.responsibilities.filter((r) => r.state === "overdue" || r.state === "due-soon");
  const overdue = urgent.filter((r) => r.state === "overdue").length;
  const openRisks = ops.risks.filter((r) => r.status !== "closed");
  const high = openRisks.filter((r) => r.rating === "high");

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4 md:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">Programme budget</div>
            <BudgetBadge health={ops.programmeHealth} />
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatValue(ops.programmeHealth.actual, sym, { compact: true })}{" "}
            <span className="text-sm font-normal text-ink-2">paid of {formatValue(ops.programme.budget, sym, { compact: true })}</span>
          </div>
          <div className="mt-3">
            <BudgetSummary health={ops.programmeHealth} currency={sym} />
          </div>
        </div>
        <Link href="/operations/responsibilities" className="card block p-4 hover:bg-surface-2">
          <div className="text-xs text-muted">Responsibilities</div>
          <div className="mt-1 text-2xl font-semibold">
            <span className={overdue ? "text-critical-ink" : ""}>{overdue} overdue</span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{urgent.length - overdue} due in the next 14 days · {ops.responsibilities.filter((r) => r.state !== "done").length} open in total</p>
        </Link>
        <Link href="/operations/risks" className="card block p-4 hover:bg-surface-2">
          <div className="text-xs text-muted">Risks</div>
          <div className="mt-1 text-2xl font-semibold">
            <span className={high.length ? "text-critical-ink" : ""}>{high.length} high</span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{openRisks.length} open risks · {ops.decisions.length} decisions logged</p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-line pb-2 text-lg font-semibold">Overdue and due soon</h2>
        {urgent.length === 0 ? (
          <p className="text-sm text-ink-2">Nothing overdue or due in the next 14 days.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {urgent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-ink-2">
                        {OWNER_TEAM_LABELS[r.team]}
                        {r.owner && ` · ${r.owner.name}`}
                        {r.project && ` · ${r.project.name}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DeadlineBadge state={r.state} due={r.dueDate} />
                    </td>
                    <td className="px-4 py-3 text-right">{canUpdateResponsibility(user, r.team) && <ResponsibilityStatus id={r.id} status={r.status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          <h2 className="border-b border-line pb-2 text-lg font-semibold">Budget by focus area</h2>
          {ops.areas.map(({ focusArea, health, initiatives }) => (
            <div key={focusArea.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/focus-areas/${focusArea.id}`} className="font-medium hover:underline">
                  {focusArea.name}
                </Link>
                <BudgetBadge health={health} />
              </div>
              <BudgetSummary health={health} currency={sym} />
              <p className="text-xs text-muted">{initiatives.length} initiatives · the tick shows where spend would be at an even pace through the year</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="border-b border-line pb-2 text-lg font-semibold">Top risks</h2>
          <RiskMatrix risks={ops.risks} />
          <ul className="card divide-y divide-line text-sm">
            {openRisks.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 p-3">
                <span>{r.title}</span>
                <RiskBadge rating={r.rating} score={r.score} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {ops.decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="border-b border-line pb-2 text-lg font-semibold">Recent decisions</h2>
          <ul className="card divide-y divide-line text-sm">
            {ops.decisions.slice(0, 3).map((d) => (
              <li key={d.id} className="p-3">
                <div className="font-medium">{d.title}</div>
                <div className="text-ink-2">{d.decision}</div>
                <div className="text-xs text-muted">
                  {formatDate(d.date)}
                  {d.madeBy && ` · ${d.madeBy}`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
