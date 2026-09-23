import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseView } from "@/lib/views";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { PrintButton } from "@/components/print-button";
import { DeleteSnapshotButton } from "@/components/delete-snapshot-button";
import { SnapshotBanner } from "@/components/dashboard/snapshot-banner";
import { parsePayload } from "@/server/queries";

export default async function SnapshotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sid: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id, sid } = await params;
  const view = parseView((await searchParams).view);
  const snapshot = await db.snapshot.findUnique({ where: { id: sid }, include: { createdBy: true } });
  if (!snapshot || snapshot.projectId !== id) notFound();
  const payload = parsePayload(snapshot.payload);

  return (
    <div className="space-y-6">
      <SnapshotBanner label={snapshot.label} asOf={snapshot.asOfDate} frozenAt={snapshot.createdAt} by={snapshot.createdBy?.name} />
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <ViewSwitcher current={view} />
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${id}/share?view=${view}&source=${sid}`} className="btn-secondary">
            Share
          </Link>
          <PrintButton />
          <DeleteSnapshotButton projectId={id} snapshotId={sid} />
        </div>
      </div>
      <DashboardView payload={payload} view={view} />
    </div>
  );
}
