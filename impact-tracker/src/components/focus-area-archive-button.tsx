"use client";

import { useTransition } from "react";
import { setFocusAreaArchived } from "@/server/programme-actions";

export function FocusAreaArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-secondary" disabled={pending} onClick={() => start(() => setFocusAreaArchived(id, !archived))}>
      {archived ? "Restore focus area" : "Archive focus area"}
    </button>
  );
}
