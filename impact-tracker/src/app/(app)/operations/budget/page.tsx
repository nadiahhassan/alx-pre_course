import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { SPEND_CATEGORY_LABELS } from "@/lib/constants";
import { currencySymbol, formatDate, formatPercent, formatValue } from "@/lib/format";
import { sumBy } from "@/lib/operations";
import { BudgetBadge, BudgetSummary, SpendBar } from "@/components/operations/ops-ui";
import { DeleteButton } from "@/components/operations/ops-controls";
import { SpendChart } from "@/components/charts/spend-chart";
import { getOperations } from "@/server/operations-queries";

export default async function BudgetPage() {
  const user = await requireUser();
  const ops = await getOperations();
  const sym = currencySymbol(ops.programme.currency);
  const v = (n: number) => formatValue(n, sym, { compact: true });
  const paid = ops.spend.filter((s) => s.status === "actual");
  const byCategory = Object.entries(sumBy(ops.spend, (s) => s.category, (s) => s.amount)).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...byCategory.map(([, n]) => n));
  const editable = can(user, "edit-operations");
  const groups = [...ops.areas.map((a) => ({ title: a.focusArea.name, health: a.health, rows: a.initiatives })), ...(ops.unassigned.length ? [{ title: "Not in a focus area", health: null, rows: ops.unassigned }] : [])];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-2">
          Paid and committed spend against each budget. Status compares spend with how far through the year we are: red when over budget or heading more than 10% over,
          amber when heading over or more than 20 points behind the timeline (money may go unused).
        </p>
        {editable && (
          <div className="flex gap-2">
            <Link href="/operations/budget/import" className="btn-secondary">
              Import finance CSV
            </Link>
            <Link href="/operations/budget/new" className="btn-primary">
              Add spend
            </Link>
          </div>
        )}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Programme spend to date</h2>
            <BudgetBadge health={ops.programmeHealth} />
          </div>
          <SpendChart
            spend={paid.map((s) => ({ date: s.date.toISOString(), amount: s.amount }))}
            budget={ops.programme.budget}
            start={ops.programme.startDate.toISOString()}
            end={ops.programme.endDate.toISOString()}
            currency={sym}
          />
          <p className="text-xs text-muted">Solid line: paid spend, added up by month. Dashed line: an even pace from zero to the full budget.</p>
          <div className="mt-3">
            <BudgetSummary health={ops.programmeHealth} currency={sym} />
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold">By category</h2>
          <p className="text-xs text-muted">Paid and committed</p>
          <ul className="mt-3 space-y-2">
            {byCategory.map(([c, n]) => (
              <li key={c} className="text-sm">
                <div className="flex justify-between">
                  <span>{SPEND_CATEGORY_LABELS[c] ?? c}</span>
                  <span className="tabular font-medium">{v(n)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(n / catMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-line pb-2 text-lg font-semibold">By focus area and initiative</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Budget holder</th>
                <th className="px-4 py-2 text-right font-medium">Budget</th>
                <th className="px-4 py-2 text-right font-medium">Paid</th>
                <th className="px-4 py-2 text-right font-medium">Committed</th>
                <th className="px-4 py-2 text-right font-medium">Remaining</th>
                <th className="w-44 px-4 py-2 font-medium">Paid vs time</th>
                <th className="px-4 py-2 text-right font-medium">Year-end at this pace</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title} className="tabular divide-y divide-line border-b border-line">
                {g.health && (
                  <tr className="bg-surface-2 font-medium">
                    <td className="px-4 py-2">{g.title}</td>
                    <td className="px-4 py-2 text-right">{v(g.health.budget)}</td>
                    <td className="px-4 py-2 text-right">{v(g.health.actual)}</td>
                    <td className="px-4 py-2 text-right">{v(g.health.committed)}</td>
                    <td className={`px-4 py-2 text-right ${g.health.remaining < 0 ? "text-critical-ink" : ""}`}>{v(g.health.remaining)}</td>
                    <td className="px-4 py-2"><SpendBar health={g.health} /></td>
                    <td className="px-4 py-2 text-right">{v(g.health.forecast)}</td>
                    <td className="px-4 py-2"><BudgetBadge health={g.health} /></td>
                  </tr>
                )}
                {g.rows.map(({ project, health }) => (
                  <tr key={project.id}>
                    <td className="px-4 py-2 pl-8">
                      <Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link>
                      <div className="text-xs text-muted">{formatPercent(health.elapsed)} of its timeline elapsed</div>
                    </td>
                    <td className="px-4 py-2 text-right">{v(health.budget)}</td>
                    <td className="px-4 py-2 text-right">{v(health.actual)}</td>
                    <td className="px-4 py-2 text-right">{v(health.committed)}</td>
                    <td className={`px-4 py-2 text-right ${health.remaining < 0 ? "text-critical-ink" : ""}`}>{v(health.remaining)}</td>
                    <td className="px-4 py-2"><SpendBar health={health} /></td>
                    <td className="px-4 py-2 text-right">{v(health.forecast)}</td>
                    <td className="px-4 py-2"><BudgetBadge health={health} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="text-xs text-muted">Bars: solid is paid, lighter is committed; the tick marks an even pace through the timeline.</p>
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-line pb-2 text-lg font-semibold">Spend log</h2>
        {ops.spend.length === 0 ? (
          <p className="text-sm text-muted">No spend recorded yet.</p>
        ) : (
          <div className="card max-h-[32rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-line bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Initiative</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ops.spend.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(s.date)}</td>
                    <td className="px-4 py-2">{s.project.name}</td>
                    <td className="px-4 py-2">
                      {s.description || <span className="text-muted">–</span>}
                      {s.reference && <span className="text-xs text-muted"> · {s.reference}</span>}
                    </td>
                    <td className="px-4 py-2">{SPEND_CATEGORY_LABELS[s.category] ?? s.category}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right">
                      {formatValue(s.amount, sym)}
                      {s.status === "committed" && <div className="text-xs text-warning-ink">Committed</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {editable && (
                        <>
                          <Link href={`/operations/budget/${s.id}`} className="btn-ghost px-2 py-1">Edit</Link>
                          <DeleteButton kind="spend" id={s.id} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
