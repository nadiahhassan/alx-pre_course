import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { buildPayload } from "@/lib/payload";
import { currencySymbol } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { CampaignTable, CampaignTimeline } from "@/components/dashboard/campaign-panels";
import { getProject } from "@/server/queries";

export default async function CampaignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  const campaigns = await db.campaign.findMany({ where: { projectId: id }, include: { metrics: true } });
  // Summarise every campaign, including ones scheduled for the future.
  const farFuture = new Date(Date.UTC(9999, 0, 1));
  const views = buildPayload({ project, parameters: [], campaigns, evidence: [] }, farFuture, { stakeholderSafe: true }).campaigns;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Marketing activity for this project. Campaigns appear as shaded periods on trend charts.</p>
        {can(user, "edit-campaigns") && <div className="flex gap-2">
          <Link href={`/projects/${id}/campaigns/import`} className="btn-secondary">
            Import metrics CSV
          </Link>
          <Link href={`/projects/${id}/campaigns/new`} className="btn-primary">
            New campaign
          </Link>
        </div>}
      </div>
      {views.length === 0 ? (
        <EmptyState title="No campaigns yet">Add one to compare campaign activity with changes in outcomes.</EmptyState>
      ) : (
        <>
          <CampaignTable campaigns={views} currency={currencySymbol(project.currency)} />
          {can(user, "edit-campaigns") && <ul className="flex flex-wrap gap-2 text-sm">
            {views.map((c, i) => (
              <li key={c.id}>
                <Link href={`/projects/${id}/campaigns/${c.id}`} className="btn-ghost px-2 py-1">
                  Edit {i + 1}. {c.name}
                </Link>
              </li>
            ))}
          </ul>}
          <CampaignTimeline campaigns={views} start={project.startDate.toISOString()} end={project.endDate.toISOString()} asOf={new Date().toISOString()} />
        </>
      )}
    </div>
  );
}
