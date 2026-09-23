import { requirePageAbility } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { sentence } from "@/components/ui";
import { CampaignForm, CampaignMetricForm } from "@/components/forms/campaign-form";
import { DeleteCampaignButton } from "@/components/delete-campaign-button";
import { saveCampaignMetric, updateCampaign } from "@/server/campaign-actions";

export default async function CampaignPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  await requirePageAbility("edit-campaigns");
  const { id, cid } = await params;
  const campaign = await db.campaign.findUnique({ where: { id: cid }, include: { metrics: { orderBy: { date: "asc" } } } });
  if (!campaign || campaign.projectId !== id) notFound();

  const metricNames = [...new Set(campaign.metrics.map((m) => m.metric))];
  const dates = [...new Set(campaign.metrics.map((m) => m.date.toISOString()))];
  const value = (date: string, metric: string) => campaign.metrics.find((m) => m.date.toISOString() === date && m.metric === metric)?.value;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{campaign.name}</h2>
        <Link href={`/projects/${id}/campaigns`} className="btn-ghost">
          All campaigns
        </Link>
      </div>
      <CampaignForm action={updateCampaign.bind(null, id, cid)} campaign={campaign} submitLabel="Save changes" />

      <section className="card space-y-4 p-5">
        <div>
          <h3 className="font-semibold">Campaign metrics</h3>
          <p className="text-sm text-ink-2">Enter totals per period (e.g. per month). Saving the same date and metric again replaces the value.</p>
        </div>
        {dates.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Period</th>
                  {metricNames.map((m) => (
                    <th key={m} className="px-4 py-2 text-right font-medium">
                      {sentence(m.replace(/-/g, " "))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-line">
                {dates.map((d) => (
                  <tr key={d}>
                    <td className="py-2 pr-4">{formatDate(d)}</td>
                    {metricNames.map((m) => (
                      <td key={m} className="px-4 py-2 text-right">
                        {value(d, m) === undefined ? <span className="text-muted">–</span> : formatNumber(value(d, m))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <CampaignMetricForm action={saveCampaignMetric.bind(null, id, cid)} knownMetrics={metricNames} />
      </section>

      <DeleteCampaignButton projectId={id} campaignId={cid} />
    </div>
  );
}
