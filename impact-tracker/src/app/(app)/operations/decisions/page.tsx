import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { DeleteButton } from "@/components/operations/ops-controls";
import { getOperations } from "@/server/operations-queries";

export default async function DecisionsPage() {
  const user = await requireUser();
  const ops = await getOperations();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-2">A record of what was decided, when, by whom and why, so the reasoning isn't lost when people move on.</p>
        {can(user, "edit-operations") && <Link href="/operations/decisions/new" className="btn-primary">Log decision</Link>}
      </div>
      {ops.decisions.length === 0 ? (
        <p className="text-sm text-muted">No decisions logged yet.</p>
      ) : (
        <ol className="space-y-3">
          {ops.decisions.map((d) => (
            <li key={d.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted">
                    {formatDate(d.date)}
                    {d.madeBy && ` · ${d.madeBy}`}
                    {d.project ? ` · ${d.project.name}` : d.focusArea ? ` · ${d.focusArea.name}` : ""}
                  </div>
                  <h3 className="font-medium">{d.title}</h3>
                </div>
                {can(user, "edit-operations") && (
                  <div>
                    <Link href={`/operations/decisions/${d.id}`} className="btn-ghost px-2 py-1">Edit</Link>
                    <DeleteButton kind="decision" id={d.id} />
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm">{d.decision}</p>
              {d.rationale && <p className="mt-1 text-sm text-ink-2"><span className="font-medium text-ink">Why:</span> {d.rationale}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
