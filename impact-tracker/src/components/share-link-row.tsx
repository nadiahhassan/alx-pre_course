"use client";

import { useState, useTransition } from "react";
import { revokeShareLink } from "@/server/snapshot-actions";

export function ShareLinkActions({ projectId, linkId, url }: { projectId: string; linkId: string; url: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-1">
      <button
        className="btn-secondary px-2 py-1"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <a href={url} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1">
        Open
      </a>
      <button
        className="btn-ghost px-2 py-1"
        disabled={pending}
        onClick={() => confirm("Revoke this link? It will stop working immediately.") && start(() => revokeShareLink(projectId, linkId))}
      >
        Revoke
      </button>
    </div>
  );
}
