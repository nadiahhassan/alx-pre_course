import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can, canUpdateResponsibility } from "@/lib/permissions";
import { OWNER_TEAM_LABELS, OWNER_TEAMS, RESPONSIBILITY_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DeadlineBadge } from "@/components/operations/ops-ui";
import { DeleteButton, ResponsibilityStatus } from "@/components/operations/ops-controls";
import { getOperations } from "@/server/operations-queries";

const GROUPS = [
  ["overdue", "Overdue"],
  ["due-soon", "Due in the next 14 days"],
  ["upcoming", "Later"],
] as const;

export default async function ResponsibilitiesPage({ searchParams }: { searchParams: Promise<{ team?: string; mine?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const ops = await getOperations();
  const team = (OWNER_TEAMS as readonly string[]).includes(sp.team ?? "") ? sp.team! : "";
  const items = ops.responsibilities.filter((r) => (!team || r.team === team) && (!sp.mine || r.ownerId === user.id));
  const done = items.filter((r) => r.state === "done").sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  const row = (r: (typeof items)[number]) => (
    <tr key={r.id} className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{r.title}</div>
        {r.description && <div className="max-w-xl text-xs text-ink-2">{r.description}</div>}
        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
          <span className="rounded bg-surface-2 px-1.5 text-ink-2">{RESPONSIBILITY_TYPE_LABELS[r.type]}</span>
          {r.recurrence !== "none" && <span>Repeats {r.recurrence}</span>}
          {r.project && <span>· {r.project.name}</span>}
          {!r.project && r.focusArea && <span>· {r.focusArea.name}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {OWNER_TEAM_LABELS[r.team]}
        {r.owner && <div className="text-xs text-ink-2">{r.owner.name}</div>}
      </td>
      <td className="px-4 py-3">
        {r.state === "done" ? <span className="text-xs text-good-ink">Done {formatDate(r.completedAt)}</span> : <DeadlineBadge state={r.state} due={r.dueDate} />}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {canUpdateResponsibility(user, r.team) && <ResponsibilityStatus id={r.id} status={r.status} />}
        {can(user, "edit-operations") && (
          <div className="mt-1">
            <Link href={`/operations/responsibilities/${r.id}`} className="btn-ghost px-2 py-1">Edit</Link>
            <DeleteButton kind="responsibility" id={r.id} />
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="team" className="text-ink-2">Team</label>
          <select id="team" name="team" defaultValue={team} className="input w-auto py-1">
            <option value="">All teams</option>
            {OWNER_TEAMS.map((t) => (
              <option key={t} value={t}>{OWNER_TEAM_LABELS[t]}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} /> Only mine
          </label>
          <button className="btn-secondary py-1">Filter</button>
        </form>
        {can(user, "edit-operations") && (
          <Link href="/operations/responsibilities/new" className="btn-primary">Add responsibility</Link>
        )}
      </div>
      <p className="text-xs text-muted">Reports, contracts, approvals and compliance tasks. Partner teams can update the status of items assigned to them. Marking a repeating item done creates the next one.</p>

      {GROUPS.map(([state, title]) => {
        const rows = items.filter((r) => r.state === state);
        if (!rows.length) return null;
        return (
          <section key={state} className="space-y-2">
            <h2 className={`text-sm font-semibold ${state === "overdue" ? "text-critical-ink" : ""}`}>
              {title} ({rows.length})
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm"><tbody className="divide-y divide-line">{rows.map(row)}</tbody></table>
            </div>
          </section>
        );
      })}
      {items.length === done.length && <p className="text-sm text-ink-2">Nothing open{team || sp.mine ? " for this filter" : ""}.</p>}
      {done.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Done ({done.length})</summary>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm"><tbody className="divide-y divide-line">{done.map(row)}</tbody></table>
          </div>
        </details>
      )}
    </div>
  );
}
