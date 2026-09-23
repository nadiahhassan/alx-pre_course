import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildDashboard } from "@/lib/dashboard";
import { currencySymbol, formatValue } from "@/lib/format";
import { countStatuses, overallRag } from "@/lib/status";
import { PageHeader, StatusBadge } from "@/components/ui";
import { AudienceSplit, InitiativeTable, NeedsAttention, RagStrip } from "@/components/programme-panels";
import { getProgramme } from "@/server/queries";

export default async function FocusAreaPage({ params }: { params: Promise<{ fid: string }> }) {
  const user = await requireUser();
  const { fid } = await params;
  const [programme, focusArea] = await Promise.all([
    getProgramme(),
    db.focusArea.findUnique({
      where: { id: fid },
      include: {
        owner: true,
        projects: { where: { archivedAt: null }, include: { owner: true, parameters: { where: { archivedAt: null }, include: { entries: true } } } },
      },
    }),
  ]);
  if (!focusArea) notFound();
  const sym = currencySymbol(programme.currency);
  const rows = focusArea.projects.map((p) => ({ project: p, dash: buildDashboard(p, p.parameters) }));
  const metrics = rows.flatMap((r) => r.dash.metrics);
  const key = metrics.filter((m) => m.isKey).map((m) => m.status);
  const overall = overallRag(key.length ? key : metrics.map((m) => m.status));
  const toInitiatives = rows.reduce((n, r) => n + (r.project.budget ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/", label: "Programme" }}
        title={focusArea.name}
        subtitle={
          <>
            Focus area{focusArea.owner && ` · Owner: ${focusArea.owner.name}`}
            {focusArea.archivedAt && " · Archived"}
            {focusArea.description && <span className="mt-1 block max-w-3xl">{focusArea.description}</span>}
          </>
        }
        actions={
          <>
            {can(user, "manage-programme") && (
              <Link href={`/focus-areas/${fid}/edit`} className="btn-secondary">
                Edit focus area
              </Link>
            )}
            {can(user, "edit-data") && (
              <Link href={`/projects/new?focusArea=${fid}`} className="btn-primary">
                Add initiative
              </Link>
            )}
          </>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Overall status</div>
          <div className="mt-1">
            <StatusBadge status={overall ?? "no-data"} size="lg" />
          </div>
          <div className="mt-3">
            <RagStrip counts={countStatuses(metrics.map((m) => m.status))} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Budget allocation</div>
          <div className="mt-1 text-2xl font-semibold">{formatValue(focusArea.budget, sym, { compact: true })}</div>
          <p className="mt-2 text-xs text-ink-2">
            {formatValue(toInitiatives, sym, { compact: true })} assigned to initiatives
            {focusArea.budget - toInitiatives > 0 && ` · ${formatValue(focusArea.budget - toInitiatives, sym, { compact: true })} unassigned`}
            {focusArea.budget - toInitiatives < 0 && ` · over by ${formatValue(toInitiatives - focusArea.budget, sym, { compact: true })}`}
          </p>
          <p className="mt-1 text-xs text-muted">Spend tracking arrives with the Operations step.</p>
        </div>
        <AudienceSplit metrics={metrics} />
      </section>
      <NeedsAttention rows={rows} />
      <section className="space-y-3">
        <h2 className="border-b border-line pb-2 text-lg font-semibold">Initiatives</h2>
        {rows.length ? <InitiativeTable rows={rows} currency={sym} /> : <p className="text-sm text-muted">No initiatives yet.</p>}
      </section>
    </div>
  );
}
