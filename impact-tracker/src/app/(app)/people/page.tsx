import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, TEAM_LABELS, type Role, type Team } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { UserActiveButton } from "@/components/user-active-button";

export default async function PeoplePage() {
  const me = await requireUser();
  if (!can(me, "manage-users")) notFound();
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        subtitle="Who can sign in, and what they can do. Partners from Comms, GAPP and Marketing see everything and contribute evidence; Marketing also manages campaigns."
        actions={<Link href="/people/new" className="btn-primary">Add person</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Last sign-in</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-muted"}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {u.name} {!u.active && <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">Deactivated</span>}
                  </div>
                  <div className="text-xs text-ink-2">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {ROLE_LABELS[u.role as Role] ?? u.role}
                  {u.team && <div className="text-xs text-ink-2">{TEAM_LABELS[u.team as Team]}</div>}
                </td>
                <td className="px-4 py-3 text-ink-2">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/people/${u.id}`} className="btn-ghost px-2 py-1">
                    Edit
                  </Link>
                  {u.id !== me.id && <UserActiveButton userId={u.id} active={u.active} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
