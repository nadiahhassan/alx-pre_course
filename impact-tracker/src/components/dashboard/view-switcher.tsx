import Link from "next/link";
import { VIEW_BLURBS, VIEW_LABELS, VIEWS, type View } from "@/lib/views";

/** Segmented control that switches stakeholder view via ?view= on the current page. */
export function ViewSwitcher({ current }: { current: View }) {
  return (
    <div className="print:hidden">
      <div role="tablist" aria-label="Stakeholder view" className="inline-flex flex-wrap rounded-md border border-line-strong bg-surface p-0.5 text-sm">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={`?view=${v}`}
            scroll={false}
            role="tab"
            aria-selected={v === current}
            className={`rounded px-3 py-1.5 ${v === current ? "bg-ink text-surface" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{VIEW_BLURBS[current]}</p>
    </div>
  );
}
