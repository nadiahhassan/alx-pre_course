import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseView } from "@/lib/views";
import { parseAudienceFilter } from "@/lib/audience";
import { filterPayload } from "@/lib/payload";
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
  searchParams: Promise<{ view?: string; audience?: string }>;
}) {
  const { id, sid } = await params;
  const user = await requireUser();
  const sp = await searchParams;
  const view = parseView(sp.view);
  const audience = parseAudienceFilter(sp.audience);
  const snapshot = await db.snapshot.findUnique({ where: { id: sid }, include: { createdBy: true } });
  if (!snapshot || snapshot.projectId !== id) notFound();
  const payload = parsePayload(snapshot.payload);

  return (
    <div className="space-y-6">
      <SnapshotBanner label={snapshot.label} asOf={snapshot.asOfDate} frozenAt={snapshot.createdAt} by={snapshot.createdBy?.name} />
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <ViewSwitcher current={view} audience={audience} />
        <div className="flex flex-wrap gap-2">
          {can(user, "share") && (
            <Link href={`/projects/${id}/share?view=${view}&source=${sid}`} className="btn-secondary">
              Share
            </Link>
          )}
          <PrintButton />
          {can(user, "edit-data") && <DeleteSnapshotButton projectId={id} snapshotId={sid} />}
        </div>
      </div>
      <DashboardView payload={filterPayload(payload, audience)} view={view} />
    </div>
  );
}
