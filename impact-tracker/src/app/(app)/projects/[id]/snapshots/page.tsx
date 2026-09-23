import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export default async function SnapshotsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshots = await db.snapshot.findMany({
    where: { projectId: id },
    select: {
      id: true, label: true, asOfDate: true, createdAt: true,
      createdBy: { select: { name: true } },
      _count: { select: { shareLinks: { where: { revokedAt: null } } } },
    },
    orderBy: { asOfDate: "desc" },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Frozen copies of the dashboard, so figures already shared don’t change when data is edited later.</p>
        <Link href={`/projects/${id}/snapshots/new`} className="btn-primary">
          Freeze snapshot
        </Link>
      </div>
      {snapshots.length === 0 ? (
        <EmptyState title="No snapshots yet">Freeze one before a report or board meeting.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {snapshots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/projects/${id}/snapshots/${s.id}`} className="font-medium hover:underline">
                  {s.label}
                </Link>
                <div className="text-xs text-ink-2">
                  Data as of {formatDate(s.asOfDate)} · frozen {formatDate(s.createdAt)}
                  {s.createdBy && ` by ${s.createdBy.name}`}
                  {s._count.shareLinks > 0 && ` · ${s._count.shareLinks} active share ${s._count.shareLinks === 1 ? "link" : "links"}`}
                </div>
              </div>
              <Link href={`/projects/${id}/snapshots/${s.id}`} className="btn-secondary">
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
