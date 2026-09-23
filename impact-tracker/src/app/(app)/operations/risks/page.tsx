import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate, today } from "@/lib/format";
import { RiskBadge, RiskMatrix } from "@/components/operations/ops-ui";
import { DeleteButton } from "@/components/operations/ops-controls";
import { getOperations } from "@/server/operations-queries";

export default async function RisksPage() {
  const user = await requireUser();
  const ops = await getOperations();
  const now = today();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-2">
          Score = likelihood × impact (each 1–5). High is 15 or more, medium 8–14, low below 8. Review dates in the past are flagged.
        </p>
        {can(user, "edit-operations") && <Link href="/operations/risks/new" className="btn-primary">Add risk</Link>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Risk</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Review</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ops.risks.map((r) => (
                <tr key={r.id} className={`align-top ${r.status === "closed" ? "text-muted" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.title}</div>
                    {r.mitigation && <div className="mt-0.5 max-w-xl text-xs text-ink-2"><span className="font-medium">Mitigation:</span> {r.mitigation}</div>}
                    <div className="mt-1 text-xs text-muted">
                      {r.status[0].toUpperCase() + r.status.slice(1)} · L{r.likelihood} × I{r.impact}
                      {r.project ? ` · ${r.project.name}` : r.focusArea ? ` · ${r.focusArea.name}` : " · Whole programme"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.status === "closed" ? <span className="text-xs">Closed</span> : <RiskBadge rating={r.rating} score={r.score} />}</td>
                  <td className="px-4 py-3">{r.owner?.name ?? <span className="text-muted">–</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.reviewDate ? (
                      <span className={r.status !== "closed" && r.reviewDate < now ? "text-critical-ink" : ""}>
                        {formatDate(r.reviewDate)}
                        {r.status !== "closed" && r.reviewDate < now && <span className="block text-xs">Review overdue</span>}
                      </span>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {can(user, "edit-operations") && (
                      <>
                        <Link href={`/operations/risks/${r.id}`} className="btn-ghost px-2 py-1">Edit</Link>
                        <DeleteButton kind="risk" id={r.id} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ops.risks.length === 0 && <p className="p-4 text-sm text-muted">No risks logged yet.</p>}
        </div>
        <RiskMatrix risks={ops.risks} />
      </div>
    </div>
  );
}
