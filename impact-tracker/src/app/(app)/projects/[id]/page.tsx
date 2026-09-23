import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { parseView } from "@/lib/views";
import { parseAudienceFilter } from "@/lib/audience";
import { filterPayload } from "@/lib/payload";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { PrintButton } from "@/components/print-button";
import { EmptyState } from "@/components/ui";
import { getPayload } from "@/server/queries";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; audience?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const sp = await searchParams;
  const view = parseView(sp.view);
  const audience = parseAudienceFilter(sp.audience);
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
        <ViewSwitcher current={view} audience={audience} />
        <div className="flex flex-wrap gap-2">
          {can(user, "edit-data") && (
            <Link href={`/projects/${id}/snapshots/new`} className="btn-secondary">
              Freeze snapshot
            </Link>
          )}
          {can(user, "share") && (
            <Link href={`/projects/${id}/share?view=${view}`} className="btn-secondary">
              Share
            </Link>
          )}
          <PrintButton />
        </div>
      </div>
      <DashboardView payload={filterPayload(payload, audience)} view={view} />
    </div>
  );
}
