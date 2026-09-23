"use client";

import { useTransition } from "react";
import { setProjectArchived } from "@/server/project-actions";

export function ArchiveProjectButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-secondary" disabled={pending} onClick={() => start(() => setProjectArchived(id, !archived))}>
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
