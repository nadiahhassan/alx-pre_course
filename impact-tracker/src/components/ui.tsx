// Small presentational building blocks shared across pages.

import Link from "next/link";
import type { Status } from "@/lib/status";
import { LEVEL_LABELS, type Level } from "@/lib/constants";

const STATUS_META: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
  green: {
    label: "On track",
    className: "text-good-ink",
    icon: <circle cx="6" cy="6" r="5" fill="var(--good)" />,
  },
  amber: {
    label: "Behind",
    className: "text-warning-ink",
    icon: <path d="M6 1 L11 10.5 L1 10.5 Z" fill="var(--warning)" />,
  },
  red: {
    label: "Off track",
    className: "text-critical-ink",
    icon: <rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="var(--critical)" />,
  },
  "no-data": {
    label: "No data",
    className: "text-muted",
    icon: <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--muted)" strokeWidth="1.5" />,
  },
  "not-started": {
    label: "Not started",
    className: "text-muted",
    icon: <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="2 2" />,
  },
};

/** Status always shows a shape and a word, never colour alone. */
export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "lg" }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium ${meta.className} ${size === "lg" ? "text-base" : "text-xs"}`}>
      <svg width={size === "lg" ? 14 : 12} height={size === "lg" ? 14 : 12} viewBox="0 0 12 12" aria-hidden>
        {meta.icon}
      </svg>
      {meta.label}
    </span>
  );
}

export function statusLabel(status: Status) {
  return STATUS_META[status].label;
}

export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const CONFIDENCE_DOTS: Record<string, number> = { measured: 4, "self-reported": 3, estimated: 2, modelled: 2 };

/** Confidence of the underlying data. The bars give a rough sense of reliability. */
export function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  const n = CONFIDENCE_DOTS[confidence] ?? 1;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 text-xs text-ink-2"
      title={`Latest value is ${confidence}`}
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`w-0.5 rounded-sm ${i <= n ? "bg-ink-2" : "bg-line-strong"}`} style={{ height: 3 + i * 2 }} />
        ))}
      </span>
      <span>{sentence(confidence)}</span>
    </span>
  );
}

export function LevelTag({ level }: { level: string }) {
  return (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">
      {LEVEL_LABELS[level as Level]?.replace(/s$/, "") ?? level}
    </span>
  );
}

export function AiTag() {
  return (
    <span className="rounded border border-accent/40 bg-accent-soft/40 px-1.5 py-0.5 text-xs font-medium text-accent-ink">
      AI-generated
    </span>
  );
}

/**
 * Progress towards target, with a tick for where it should be by now.
 * The fill is neutral; status is carried by the badge next to it.
 */
export function ProgressBar({ progress, expected }: { progress: number | null; expected: number | null }) {
  const pct = Math.max(0, Math.min(1, progress ?? 0)) * 100;
  const exp = expected === null ? null : Math.max(0, Math.min(1, expected)) * 100;
  return (
    <div className="relative h-2 w-full rounded-full bg-accent-soft/60" role="presentation">
      <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      {exp !== null && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `calc(${exp}% - 1px)` }} title="Expected at the latest update" />
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm text-ink-2 hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-ink-2">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-critical-ink">{error}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
    </div>
  );
}
