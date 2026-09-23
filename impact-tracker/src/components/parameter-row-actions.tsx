"use client";

import { useTransition } from "react";
import Link from "next/link";
import { saveParameterToLibrary, setParameterArchived } from "@/server/parameter-actions";

export function ParameterRowActions({
  projectId,
  parameterId,
  archived,
  inLibrary,
}: {
  projectId: string;
  parameterId: string;
  archived: boolean;
  inLibrary: boolean;
}) {
  const [pending, start] = useTransition();
  if (archived) {
    return (
      <button className="btn-ghost px-2 py-1" disabled={pending} onClick={() => start(() => setParameterArchived(projectId, parameterId, false))}>
        Restore
      </button>
    );
  }
  return (
    <div className="flex justify-end gap-1">
      <Link href={`/projects/${projectId}/parameters/${parameterId}/edit`} className="btn-ghost px-2 py-1">
        Edit
      </Link>
      {!inLibrary && (
        <button className="btn-ghost px-2 py-1" disabled={pending} onClick={() => start(() => saveParameterToLibrary(projectId, parameterId))}>
          Save to library
        </button>
      )}
      <button
        className="btn-ghost px-2 py-1"
        disabled={pending}
        onClick={() => {
          if (confirm("Archive this parameter? Its entries are kept and it can be restored.")) {
            start(() => setParameterArchived(projectId, parameterId, true));
          }
        }}
      >
        Archive
      </button>
    </div>
  );
}
