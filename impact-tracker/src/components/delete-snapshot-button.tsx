"use client";

import { useTransition } from "react";
import { deleteSnapshot } from "@/server/snapshot-actions";

export function DeleteSnapshotButton({ projectId, snapshotId }: { projectId: string; snapshotId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-ghost"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this snapshot? Any share links to it will stop working.")) start(() => deleteSnapshot(projectId, snapshotId));
      }}
    >
      Delete
    </button>
  );
}
