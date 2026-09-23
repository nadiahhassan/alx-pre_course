import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { LEVELS } from "@/lib/constants";
import { toDateInput, today } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { EntryGrid } from "@/components/entry-grid";
import { EntryForm } from "@/components/forms/entry-form";
import { createEntry, type CellEntry } from "@/server/entry-actions";
import { getProject } from "@/server/queries";

/** First of each month from the project start up to today (or the project end). */
function monthColumns(start: Date, end: Date): string[] {
  const last = Math.min(end.getTime(), today().getTime());
  const out: string[] = [];
  let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (d.getTime() <= last) {
    out.push(d.toISOString());
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return out;
}

export default async function DataEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  const parameters = await db.parameter.findMany({
    where: { projectId: id, archivedAt: null },
    include: { entries: { include: { loggedBy: true } } },
    orderBy: { sortOrder: "asc" },
  });
  parameters.sort((a, b) => LEVELS.indexOf(a.level as never) - LEVELS.indexOf(b.level as never) || a.sortOrder - b.sortOrder);

  if (!parameters.length) {
    return (
      <EmptyState title="No parameters to enter data for">
        <Link href={`/projects/${id}/parameters/new`} className="text-accent-ink underline">
          Add a parameter
        </Link>{" "}
        first.
      </EmptyState>
    );
  }

  const cells: Record<string, CellEntry> = {};
  const dates = new Set(monthColumns(project.startDate, project.endDate));
  for (const p of parameters) {
    for (const e of p.entries) {
      const iso = e.date.toISOString();
      dates.add(iso);
      cells[`${p.id}|${iso}`] = {
        id: e.id,
        value: e.value,
        confidence: e.confidence,
        note: e.note,
        loggedBy: e.loggedBy?.name ?? null,
        updatedAt: e.updatedAt.toISOString(),
      };
    }
  }
  const columns = [...dates].sort();

  return (
    <div className="space-y-4">
      {can(user, "edit-data") && <details className="card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Add a single entry with a note</summary>
        <div className="border-t border-line p-4">
          <EntryForm
            action={createEntry.bind(null, id)}
            parameters={parameters.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
            defaultDate={toDateInput(today())}
          />
        </div>
      </details>}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-2">Type straight into the grid. Changes save as you leave each cell.</p>
          <div className="flex gap-2">
            {can(user, "edit-data") && (
              <Link href={`/projects/${id}/data/import`} className="btn-secondary">
                Import CSV
              </Link>
            )}
            <a href={`/projects/${id}/data/export`} className="btn-secondary">
              Export CSV
            </a>
          </div>
        </div>
        <EntryGrid
          projectId={id}
          rows={parameters.map((p) => ({ id: p.id, name: p.name, unit: p.unit, level: p.level, measureType: p.measureType }))}
          initialColumns={columns}
          initialCells={cells}
          readOnly={!can(user, "edit-data")}
        />
      </div>
    </div>
  );
}
