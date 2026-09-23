"use client";

import { useEffect, useState } from "react";
import type { EvidenceView } from "@/lib/payload";
import { EvidenceItem } from "./evidence-item";

/** "3 stories" button that opens a side panel with the evidence attached to a metric. */
export function EvidenceButton({ metricName, items }: { metricName: string; items: EvidenceView[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!items.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-line px-1.5 py-0.5 text-xs text-accent-ink hover:bg-surface-2 print:hidden"
      >
        {items.length} {items.length === 1 ? "piece" : "pieces"} of evidence
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence for ${metricName}`}
            className="h-full w-full max-w-lg overflow-y-auto bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Evidence</p>
                <h2 className="text-lg font-semibold">{metricName}</h2>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} autoFocus>
                Close
              </button>
            </div>
            <div className="space-y-6 divide-y divide-line [&>*:not(:first-child)]:pt-6">
              {items.map((e) => (
                <EvidenceItem key={e.id} e={e} />
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
