import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { parseView, VIEW_LABELS } from "@/lib/views";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SnapshotBanner } from "@/components/dashboard/snapshot-banner";
import { PrintButton } from "@/components/print-button";
import { getPayload, parsePayload } from "@/server/queries";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Public, read-only page. No app navigation; unapproved AI items are never shown.
export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({ where: { token }, include: { snapshot: { include: { createdBy: true } }, project: true } });
  if (!link || link.revokedAt) notFound();

  const view = parseView(link.view);
  const payload = link.snapshot ? parsePayload(link.snapshot.payload) : await getPayload(link.projectId, new Date(), true);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs text-muted">Impact Tracker · {VIEW_LABELS[view]} view</p>
          <h1 className="text-2xl font-semibold tracking-tight">{link.project.name}</h1>
          {link.project.description && <p className="mt-1 max-w-3xl text-sm text-ink-2">{link.project.description}</p>}
        </div>
        <PrintButton />
      </header>
      {link.snapshot ? (
        <SnapshotBanner label={link.snapshot.label} asOf={link.snapshot.asOfDate} frozenAt={link.snapshot.createdAt} by={link.snapshot.createdBy?.name} />
      ) : (
        <p className="text-sm text-ink-2">Live figures as of {formatDate(new Date())}. These may change as new data is logged.</p>
      )}
      <DashboardView payload={payload} view={view} />
    </div>
  );
}
