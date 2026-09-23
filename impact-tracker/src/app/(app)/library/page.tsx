import Link from "next/link";
import { db } from "@/lib/db";
import { LEVEL_LABELS, LEVELS } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/ui";
import { DeleteLibraryButton } from "@/components/delete-library-button";

export default async function LibraryPage() {
  const items = await db.libraryParameter.findMany({
    orderBy: { name: "asc" },
    include: { parameters: { where: { archivedAt: null }, select: { project: { select: { id: true, name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parameter library"
        subtitle="Shared metric definitions, so the same thing is measured the same way across projects. Copying a definition into a project doesn't link them: editing here won't change live projects."
        actions={
          <Link href="/library/new" className="btn-primary">
            New definition
          </Link>
        }
      />
      {items.length === 0 && <EmptyState title="No definitions yet">Save a project parameter to the library, or create one here.</EmptyState>}
      {LEVELS.map((level) => {
        const rows = items.filter((i) => i.level === level);
        if (!rows.length) return null;
        return (
          <section key={level}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">{LEVEL_LABELS[level]}</h2>
            <ul className="card divide-y divide-line">
              {rows.map((item) => {
                const projects = [...new Map(item.parameters.map((p) => [p.project.id, p.project])).values()];
                return (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 max-w-3xl">
                      <div className="font-medium">{item.name}</div>
                      {item.definition && <div className="text-sm text-ink-2">{item.definition}</div>}
                      <div className="mt-1 text-xs text-muted">
                        {[item.unit, item.frequency, item.measureType === "cumulative" ? "running total" : "latest value", item.dataSource]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {projects.length > 0 && (
                        <div className="mt-1 text-xs text-ink-2">
                          Used in:{" "}
                          {projects.map((p, i) => (
                            <span key={p.id}>
                              {i > 0 && ", "}
                              <Link href={`/projects/${p.id}/parameters`} className="underline">
                                {p.name}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/library/${item.id}/edit`} className="btn-ghost px-2 py-1">
                        Edit
                      </Link>
                      <DeleteLibraryButton id={item.id} usedBy={item.parameters.length} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
