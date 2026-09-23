import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { LEVEL_LABELS, LEVELS } from "@/lib/constants";
import { formatDate, formatValue } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { ParameterRowActions } from "@/components/parameter-row-actions";
import { getProject } from "@/server/queries";

export default async function ParametersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  const parameters = await db.parameter.findMany({
    where: { projectId: id },
    include: { leadingIndicatorFor: true, _count: { select: { entries: true } } },
    orderBy: { sortOrder: "asc" },
  });
  const active = parameters.filter((p) => !p.archivedAt);
  const archived = parameters.filter((p) => p.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          Metrics tracked for this project. You can add parameters at any point; existing data is unaffected.
        </p>
        {can(user, "edit-data") && <div className="flex gap-2">
          <Link href={`/projects/${id}/parameters/library`} className="btn-secondary">
            Add from library
          </Link>
          <Link href={`/projects/${id}/parameters/new`} className="btn-primary">
            New parameter
          </Link>
        </div>}
      </div>

      {active.length === 0 && (
        <EmptyState title="No parameters yet">Add one from scratch or start from the shared library.</EmptyState>
      )}

      {LEVELS.map((level) => {
        const rows = active.filter((p) => p.level === level);
        if (!rows.length) return null;
        return (
          <section key={level}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">{LEVEL_LABELS[level]}</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Parameter</th>
                    <th className="px-4 py-2 font-medium">Baseline → target</th>
                    <th className="px-4 py-2 font-medium">By</th>
                    <th className="px-4 py-2 font-medium">Frequency</th>
                    <th className="px-4 py-2 font-medium">Entries</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {p.name}
                          {p.isKey && <span className="ml-2 rounded bg-accent-soft/60 px-1.5 py-0.5 text-xs text-accent-ink">Key</span>}
                          {p.libraryItemId && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">Library</span>}
                        </div>
                        {p.definition && <div className="mt-0.5 max-w-xl text-xs text-ink-2">{p.definition}</div>}
                        {p.leadingIndicatorFor && (
                          <div className="mt-1 text-xs text-muted">Leading indicator for: {p.leadingIndicatorFor.name}</div>
                        )}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-3">
                        {formatValue(p.baseline, p.unit)} → {formatValue(p.target, p.unit)}
                        <div className="text-xs text-muted">{p.measureType === "cumulative" ? "Running total" : "Latest value"}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(p.targetDate ?? project.endDate)}</td>
                      <td className="px-4 py-3 capitalize">{p.frequency}</td>
                      <td className="tabular px-4 py-3">{p._count.entries}</td>
                      <td className="px-4 py-3 text-right">
                        {can(user, "edit-data") && <ParameterRowActions projectId={id} parameterId={p.id} archived={false} inLibrary={!!p.libraryItemId} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium">Archived parameters ({archived.length})</summary>
          <ul className="mt-3 divide-y divide-line text-sm">
            {archived.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>
                  {p.name} <span className="text-muted">· {p._count.entries} entries kept</span>
                </span>
                {can(user, "edit-data") && <ParameterRowActions projectId={id} parameterId={p.id} archived inLibrary={!!p.libraryItemId} />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
