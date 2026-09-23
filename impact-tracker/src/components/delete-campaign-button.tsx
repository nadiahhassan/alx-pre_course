"use client";

import { useTransition } from "react";
import { deleteCampaign } from "@/server/campaign-actions";

export function DeleteCampaignButton({ projectId, campaignId }: { projectId: string; campaignId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-secondary"
      disabled={pending}
      onClick={() => confirm("Delete this campaign and its metrics?") && start(() => deleteCampaign(projectId, campaignId))}
    >
      Delete campaign
    </button>
  );
}
