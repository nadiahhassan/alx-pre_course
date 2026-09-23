import type { EvidenceView } from "@/lib/payload";
import { formatDate } from "@/lib/format";
import { AiTag, sentence } from "@/components/ui";

const TYPE_LABELS: Record<string, string> = { quote: "Quote", survey: "Survey", "case-study": "Case study", link: "Link" };

export function EvidenceItem({ e, compact = false }: { e: EvidenceView; compact?: boolean }) {
  const isQuote = e.type === "quote";
  return (
    <article className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-ink-2">{TYPE_LABELS[e.type] ?? sentence(e.type)}</span>
        <span>{formatDate(e.date)}</span>
        {e.origin === "ai" && <AiTag />}
        {e.origin === "ai" && !e.approved && <span className="text-warning-ink">Not approved: hidden from stakeholders</span>}
      </div>
      {isQuote ? (
        <blockquote className={`border-l-2 border-line-strong pl-3 ${compact ? "text-sm" : "text-base"} leading-relaxed`}>“{e.body}”</blockquote>
      ) : (
        <>
          <h4 className="text-sm font-medium">{e.title}</h4>
          {e.body && <p className="text-sm leading-relaxed text-ink-2">{e.body}</p>}
        </>
      )}
      <div className="text-xs text-ink-2">
        {isQuote && e.title && <span className="font-medium text-ink">{e.title} · </span>}
        {e.source}
        {e.url && (
          <>
            {" · "}
            <a href={e.url} target="_blank" rel="noreferrer" className="text-accent-ink underline">
              Open link
            </a>
          </>
        )}
      </div>
    </article>
  );
}
