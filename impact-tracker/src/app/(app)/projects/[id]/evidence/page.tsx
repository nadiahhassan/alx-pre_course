import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { EvidenceItem } from "@/components/dashboard/evidence-item";
import { EvidenceActions } from "@/components/evidence-actions";
import { needsApproval } from "@/lib/visibility";

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parameter?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const { parameter } = await searchParams;
  const [items, parameters] = await Promise.all([
    db.evidence.findMany({
      where: { projectId: id, ...(parameter ? { parameterId: parameter === "none" ? null : parameter } : {}) },
      include: { parameter: { select: { name: true } }, approvedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    db.parameter.findMany({ where: { projectId: id, archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const pending = items.filter(needsApproval).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="parameter" className="text-ink-2">
            Show
          </label>
          <select id="parameter" name="parameter" defaultValue={parameter ?? ""} className="input w-auto py-1">
            <option value="">All evidence</option>
            <option value="none">Not linked to a metric</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary py-1">Filter</button>
        </form>
        {can(user, "edit-evidence") && <Link href={`/projects/${id}/evidence/new${parameter && parameter !== "none" ? `?parameter=${parameter}` : ""}`} className="btn-primary">
          Add evidence
        </Link>}
      </div>
      {pending > 0 && (
        <p className="rounded-md border border-warning/60 bg-warning/10 px-3 py-2 text-sm">
          {pending} AI-generated {pending === 1 ? "item needs" : "items need"} review. Unapproved items are hidden from every stakeholder view,
          snapshot and share link.
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState title="No evidence yet">Add quotes, survey results, case studies or links, and attach them to the metric they support.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 max-w-3xl flex-1">
                <EvidenceItem
                  e={{
                    ...e,
                    date: e.date.toISOString(),
                    tags: e.tags ? e.tags.split(",") : [],
                    approved: e.approvedAt !== null,
                  }}
                  compact
                />
                <p className="mt-2 text-xs text-muted">
                  {e.parameter ? `Metric: ${e.parameter.name}` : "Whole project"}
                  {e.tags && ` · Tags: ${e.tags.split(",").join(", ")}`}
                  {e.approvedAt && e.approvedBy && ` · Approved by ${e.approvedBy.name}`}
                </p>
              </div>
              <EvidenceActions
                projectId={id}
                evidenceId={e.id}
                isAi={e.origin === "ai"}
                approved={e.approvedAt !== null}
                canEdit={can(user, "edit-evidence")}
                canApprove={can(user, "approve-ai")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
