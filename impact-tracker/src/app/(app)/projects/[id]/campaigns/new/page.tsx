import { requirePageAbility } from "@/lib/auth";
import { CampaignForm } from "@/components/forms/campaign-form";
import { createCampaign } from "@/server/campaign-actions";
import { getProject } from "@/server/queries";

export default async function NewCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAbility("edit-campaigns");
  const { id } = await params;
  await getProject(id);
  return (
    <div className="max-w-4xl">
      <h2 className="mb-4 text-lg font-semibold">New campaign</h2>
      <CampaignForm action={createCampaign.bind(null, id)} submitLabel="Create campaign" />
    </div>
  );
}
