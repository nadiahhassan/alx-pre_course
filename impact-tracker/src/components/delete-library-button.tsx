"use client";

import { useTransition } from "react";
import { deleteLibraryParameter } from "@/server/parameter-actions";

export function DeleteLibraryButton({ id, usedBy }: { id: string; usedBy: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-ghost px-2 py-1"
      disabled={pending}
      onClick={() => {
        const note = usedBy ? ` ${usedBy} project parameter(s) keep their own copy.` : "";
        if (confirm(`Delete this library definition?${note}`)) start(() => deleteLibraryParameter(id));
      }}
    >
      Delete
    </button>
  );
}
