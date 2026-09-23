import Link from "next/link";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { parseView } from "@/lib/views";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { PrintButton } from "@/components/print-button";
import { EmptyState } from "@/components/ui";
import { getPayload } from "@/server/queries";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const view = parseView((await searchParams).view);
  // The project lead sees unapproved AI items (clearly labelled); every stakeholder view hides them.
  const payload = await getPayload(id, new Date(), view !== "lead");

  if (!payload.dashboard.metrics.length) {
    return (
      <EmptyState title="Nothing to show yet">
        <Link href={`/projects/${id}/parameters/new`} className="text-accent-ink underline">
          Add parameters
        </Link>{" "}
        and log some data to see the dashboard.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <ViewSwitcher current={view} />
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${id}/snapshots/new`} className="btn-secondary">
            Freeze snapshot
          </Link>
          <Link href={`/projects/${id}/share?view=${view}`} className="btn-secondary">
            Share
          </Link>
          <PrintButton />
        </div>
      </div>
      <DashboardView payload={payload} view={view} />
    </div>
  );
}
