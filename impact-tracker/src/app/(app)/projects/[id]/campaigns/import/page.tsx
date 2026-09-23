import Link from "next/link";
import { CampaignImport } from "@/components/campaign-import";
import { getProject } from "@/server/queries";

export default async function CampaignImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProject(id);
  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Import campaign metrics</h2>
        <Link href={`/projects/${id}/campaigns`} className="btn-ghost">
          Back to campaigns
        </Link>
      </div>
      <CampaignImport projectId={id} />
    </div>
  );
}
