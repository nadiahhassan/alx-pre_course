import { requirePageAbility } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { LEVEL_LABELS, LEVELS } from "@/lib/constants";
import { EmptyState } from "@/components/ui";

export default async function AddFromLibraryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAbility("edit-data");
  const { id } = await params;
  const [items, used] = await Promise.all([
    db.libraryParameter.findMany({ orderBy: { name: "asc" } }),
    db.parameter.findMany({ where: { projectId: id, archivedAt: null, libraryItemId: { not: null } }, select: { libraryItemId: true } }),
  ]);
  const usedIds = new Set(used.map((u) => u.libraryItemId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Add from library</h2>
        <Link href={`/projects/${id}/parameters`} className="btn-ghost">
          Back to parameters
        </Link>
      </div>
      {items.length === 0 && (
        <EmptyState title="The library is empty">
          Use “Save to library” on any parameter, or <Link href="/library/new" className="text-accent-ink underline">create a definition</Link>.
        </EmptyState>
      )}
      {LEVELS.map((level) => {
        const rows = items.filter((i) => i.level === level);
        if (!rows.length) return null;
        return (
          <section key={level}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">{LEVEL_LABELS[level]}</h3>
            <ul className="card divide-y divide-line">
              {rows.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-ink-2">
                      {item.definition} {item.unit && <span className="text-muted">· {item.unit}</span>}
                    </div>
                  </div>
                  {usedIds.has(item.id) ? (
                    <span className="text-xs text-muted">Already in this project</span>
                  ) : (
                    <Link href={`/projects/${id}/parameters/new?from=${item.id}`} className="btn-secondary">
                      Use
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
