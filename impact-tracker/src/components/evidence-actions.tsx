"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteEvidence, setEvidenceApproved } from "@/server/evidence-actions";

export function EvidenceActions({
  projectId,
  evidenceId,
  isAi,
  approved,
  canEdit,
  canApprove,
}: {
  projectId: string;
  evidenceId: string;
  isAi: boolean;
  approved: boolean;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const [pending, start] = useTransition();
  if (!canEdit && !(isAi && canApprove)) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {isAi && canApprove && (
        <button className={approved ? "btn-ghost px-2 py-1" : "btn-primary px-2 py-1"} disabled={pending} onClick={() => start(() => setEvidenceApproved(projectId, evidenceId, !approved))}>
          {approved ? "Withdraw approval" : "Approve"}
        </button>
      )}
      {canEdit && (
        <>
          <Link href={`/projects/${projectId}/evidence/${evidenceId}`} className="btn-ghost px-2 py-1">
            Edit
          </Link>
          <button className="btn-ghost px-2 py-1" disabled={pending} onClick={() => confirm("Delete this evidence?") && start(() => deleteEvidence(projectId, evidenceId))}>
            Delete
          </button>
        </>
      )}
    </div>
  );
}
