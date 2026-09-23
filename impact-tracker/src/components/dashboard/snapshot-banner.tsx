import { formatDate } from "@/lib/format";

export function SnapshotBanner({ label, asOf, frozenAt, by }: { label: string; asOf: Date; frozenAt: Date; by?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-sm">
      <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-medium text-surface">Snapshot · read-only</span>
      <strong className="font-medium">{label}</strong>
      <span className="text-ink-2">
        Data as of {formatDate(asOf)} · frozen {formatDate(frozenAt)}
        {by && ` by ${by}`}. Later edits don’t change these figures.
      </span>
    </div>
  );
}
