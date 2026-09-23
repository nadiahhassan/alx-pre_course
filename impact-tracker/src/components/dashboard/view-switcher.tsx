import Link from "next/link";
import { VIEW_BLURBS, VIEW_LABELS, VIEWS, type View } from "@/lib/views";
import type { AudienceFilter } from "@/lib/audience";

const AUDIENCE_OPTIONS: [AudienceFilter, string][] = [
  ["all", "All audiences"],
  ["external", "External"],
  ["internal", "Internal"],
];

const href = (view: View, audience: AudienceFilter) => `?view=${view}${audience === "all" ? "" : `&audience=${audience}`}`;

function Segmented<T extends string>({ label, items, current, link }: { label: string; items: [T, string][]; current: T; link: (v: T) => string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5 text-sm">
      {items.map(([v, l]) => (
        <Link
          key={v}
          href={link(v)}
          scroll={false}
          role="tab"
          aria-selected={v === current}
          className={`rounded px-3 py-1.5 ${v === current ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

/** Stakeholder view and audience switches; both live in the query string. */
export function ViewSwitcher({ current, audience = "all" }: { current: View; audience?: AudienceFilter }) {
  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap gap-2">
        <Segmented label="Stakeholder view" items={VIEWS.map((v) => [v, VIEW_LABELS[v]])} current={current} link={(v) => href(v, audience)} />
        <Segmented label="Audience" items={AUDIENCE_OPTIONS} current={audience} link={(a) => href(current, a)} />
      </div>
      <p className="text-xs text-muted">
        {VIEW_BLURBS[current]}
        {audience !== "all" && ` Showing ${audience} audience metrics and campaigns only.`}
      </p>
    </div>
  );
}
